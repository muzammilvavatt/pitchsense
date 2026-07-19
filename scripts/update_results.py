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
    match_descriptions = "\n".join([f"- {m['home_team']} vs {m['away_team']}" for m in pending_matches])
    
    print(f"Asking Gemini AI to search for results of {len(pending_matches)} matches...")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key={GEMINI_API_KEY}"
    
    # Fetch raw data from ESPN public scoreboard to feed to Gemini
    # This bypasses the need for the googleSearch tool, avoiding the free tier rate limit
    try:
        espn_res = requests.get('https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?dates=20260710-20260725')
        espn_data = espn_res.text[:30000] # Limit to 30k chars to fit in context
    except Exception:
        espn_data = "No data available."

    prompt = f"""
    Today's date is {datetime.now(timezone.utc).isoformat()}.
    I am providing you with raw JSON scoreboard data from a public sports API.
    Analyze this raw data to find the final, official full-time result of the following football (soccer) matches:
    
    {match_descriptions}
    
    RAW SCOREBOARD DATA:
    {espn_data}
    
    Even if the date of the match you find online doesn't perfectly match today's date, return the most recent result you can find for this exact matchup.
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
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json"
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
    # 1. Evaluate all predictions for any match that HAS a result, but predictions haven't been scored
    print("\nEvaluating unscored predictions for finished matches...")
    
    # Get all matches that have a result
    finished_matches_response = supabase.table("matches").select("*").neq("result", "null").execute()
    finished_matches = finished_matches_response.data
    
    for match in finished_matches:
        result_str = match['result']
        if not result_str or '-' not in result_str:
            continue
            
        # Parse the result string (e.g. "2-1" or "1-1 (PEN: 4-3)")
        base_score = result_str.split(' (PEN')[0].strip()
        try:
            home_g, away_g = map(int, base_score.split('-'))
            
            # Determine winner based on the string
            winner = "Draw"
            if home_g > away_g:
                winner = match['home_team']
            elif away_g > home_g:
                winner = match['away_team']
            elif 'PEN' in result_str:
                # If there are penalties, extract them
                pen_str = result_str.split('(PEN: ')[1].replace(')', '').strip()
                home_p, away_p = map(int, pen_str.split('-'))
                if home_p > away_p:
                    winner = match['home_team']
                elif away_p > home_p:
                    winner = match['away_team']
        except Exception as e:
            print(f"Could not parse result {result_str} for match {match['id']}: {e}")
            continue
            
        # Get unscored predictions for this match
        pred_response = supabase.table("predictions").select("*").eq("match_id", match["id"]).is_("is_correct", "null").execute()
        predictions = pred_response.data
        
        if not predictions:
            continue
            
        print(f"Scoring {len(predictions)} predictions for {match['home_team']} vs {match['away_team']} (Result: {result_str}, Winner: {winner})")
        
        for pred in predictions:
            is_correct = (pred["prediction"] == winner)
            # Check for exact score match, allow combinations like "Team 2-1" or just "2-1"
            pred_score = pred.get("score_prediction", "")
            is_exact_score = False
            if pred_score:
                is_exact_score = (base_score in pred_score)
            
            supabase.table("predictions").update({
                "is_correct": is_correct,
                "is_exact_score": is_exact_score
            }).eq("id", pred["id"]).execute()
            print(f"  - Scored prediction by {pred['alias']}: {'Correct' if is_correct else 'Incorrect'}, Exact Score: {is_exact_score}")
            
    # 2. Fetch pending matches from Supabase (where result is null AND kickoff is in the past)
    now = datetime.now(timezone.utc).isoformat()
    response = supabase.table("matches").select("*").is_("result", "null").lt("kickoff", now).execute()
    pending_matches = response.data
    
    if not pending_matches:
        print("No pending finished matches found in database.")
        return

    # 3. Get the results from AI
    api_results = fetch_finished_matches_ai(pending_matches)
    
    if not api_results:
        print("No finished match results returned by AI.")
        return

    for db_match in pending_matches:
        # 4. Find the corresponding finished match from the AI data
        matched_api_game = next(
            (m for m in api_results if m["home_team"] == db_match["home_team"] and m["away_team"] == db_match["away_team"]), 
            None
        )
        
        if matched_api_game and matched_api_game.get('home_goals') is not None and matched_api_game.get('away_goals') is not None:
            # Format score string
            score_string = f"{matched_api_game['home_goals']}-{matched_api_game['away_goals']}"
            if matched_api_game.get('home_penalties', 0) > 0 or matched_api_game.get('away_penalties', 0) > 0:
                score_string += f" (PEN: {matched_api_game.get('home_penalties', 0)}-{matched_api_game.get('away_penalties', 0)})"

            actual_winner = determine_winner(
                matched_api_game["home_team"], 
                matched_api_game["away_team"], 
                matched_api_game["home_goals"], 
                matched_api_game["away_goals"],
                matched_api_game.get("home_penalties", 0),
                matched_api_game["away_penalties"]
            )
            
            print(f"Match Finished: {db_match['home_team']} vs {db_match['away_team']} -> {score_string} (Winner: {actual_winner})")
            
            # 5. Update the matches table with the final result
            supabase.table("matches").update({"result": score_string}).eq("id", db_match["id"]).execute()
            

if __name__ == "__main__":
    print("Looking for completed matches via AI...")
    update_database_results()
    print("Done updating results.")
