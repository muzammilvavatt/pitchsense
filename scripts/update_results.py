import os
import requests
import json
from datetime import datetime, timezone
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY or not GEMINI_API_KEY:
    print("Please set SUPABASE_URL, SUPABASE_KEY, and GEMINI_API_KEY in your environment.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_finished_matches_ai(pending_matches):
    """
    Passes pending matches to Gemini AI to search the web for their final results.
    """
    match_descriptions = "\n".join([f"- {m['home_team']} vs {m['away_team']} (Played around {m['kickoff']})" for m in pending_matches])
    
    print(f"Asking Gemini AI to search for results of {len(pending_matches)} matches...")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={GEMINI_API_KEY}"
    
    prompt = f"""
    Today's date is {datetime.now(timezone.utc).isoformat()}.
    Search the web for the final, official full-time results of the following football (soccer) matches:
    
    {match_descriptions}
    
    If a match has not finished yet or was postponed, do NOT include it in the response.
    If a match went to penalty shootouts, you MUST include the penalty scores.
    
    Return the finished matches as a raw JSON array of objects. Do NOT wrap it in markdown block quotes like ```json. Just raw text.
    Each object must exactly match this structure:
    {{
        "home_team": "String (exact same name as I provided)",
        "away_team": "String (exact same name as I provided)",
        "home_goals": Integer (goals scored in regular + extra time),
        "away_goals": Integer (goals scored in regular + extra time),
        "home_penalties": Integer (0 if no shootout),
        "away_penalties": Integer (0 if no shootout)
    }}
    """
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "tools": [{"googleSearch": {}}],
        "generationConfig": {
            "temperature": 0.1
        }
    }
    
    try:
        res = requests.post(url, headers={"Content-Type": "application/json"}, json=payload)
        res.raise_for_status()
        
        data = res.json()
        text = data['candidates'][0]['content']['parts'][0]['text']
        
        text = text.replace('```json', '').replace('```', '').strip()
        
        results = json.loads(text)
        
        if not isinstance(results, list):
            print("Gemini did not return a list.")
            return []
            
        print(f"Gemini confirmed {len(results)} matches are finished!")
        return results
        
    except Exception as e:
        print("Failed to fetch results from Gemini:", e)
        return []

def determine_winner(home_team, away_team, home_goals, away_goals, home_penalties, away_penalties):
    if home_goals > away_goals:
        return home_team
    elif away_goals > home_goals:
        return away_team
    
    # If tied in regular/extra time, check penalties
    if home_penalties > away_penalties:
        return home_team
    elif away_penalties > home_penalties:
        return away_team
        
    return "Draw"

def update_database_results():
    # 1. Fetch pending matches from Supabase (where result is null AND kickoff is in the past)
    now = datetime.now(timezone.utc).isoformat()
    response = supabase.table("matches").select("*").is_("result", "null").lt("kickoff", now).execute()
    pending_matches = response.data
    
    if not pending_matches:
        print("No pending finished matches found in database.")
        return

    # 2. Get the results from AI
    api_results = fetch_finished_matches_ai(pending_matches)
    
    if not api_results:
        print("No finished match results returned by AI.")
        return

    for db_match in pending_matches:
        # 3. Find the corresponding finished match from the AI data
        matched_api_game = next(
            (m for m in api_results if m["home_team"] == db_match["home_team"] and m["away_team"] == db_match["away_team"]), 
            None
        )
        
        if matched_api_game:
            # Format score string
            score_string = f"{matched_api_game['home_goals']}-{matched_api_game['away_goals']}"
            if matched_api_game['home_penalties'] > 0 or matched_api_game['away_penalties'] > 0:
                score_string += f" (PEN: {matched_api_game['home_penalties']}-{matched_api_game['away_penalties']})"

            actual_winner = determine_winner(
                matched_api_game["home_team"], 
                matched_api_game["away_team"], 
                matched_api_game["home_goals"], 
                matched_api_game["away_goals"],
                matched_api_game["home_penalties"],
                matched_api_game["away_penalties"]
            )
            
            print(f"Match Finished: {db_match['home_team']} vs {db_match['away_team']} -> {score_string} (Winner: {actual_winner})")
            
            # 4. Update the matches table with the final result
            supabase.table("matches").update({"result": score_string}).eq("id", db_match["id"]).execute()
            
            # 5. Evaluate all predictions for this match
            pred_response = supabase.table("predictions").select("*").eq("match_id", db_match["id"]).execute()
            predictions = pred_response.data
            
            exact_score = f"{matched_api_game['home_goals']}-{matched_api_game['away_goals']}"
            
            for pred in predictions:
                is_correct = (pred["prediction"] == actual_winner)
                is_exact_score = (pred["score_prediction"] == exact_score)
                
                supabase.table("predictions").update({
                    "is_correct": is_correct,
                    "is_exact_score": is_exact_score
                }).eq("id", pred["id"]).execute()
                print(f"  - Scored prediction by {pred['alias']}: {'Correct' if is_correct else 'Incorrect'}, Exact Score: {is_exact_score}")

if __name__ == "__main__":
    print("Looking for completed matches via AI...")
    update_database_results()
    print("Done updating results.")
