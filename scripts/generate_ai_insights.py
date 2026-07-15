import os
import json
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY or not GEMINI_API_KEY:
    print("Please set SUPABASE_URL, SUPABASE_KEY, and GEMINI_API_KEY in your .env file or environment.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def generate_batched_tactical_analysis(matches_list):
    """
    Prompts Gemini to generate a human-sounding, authoritative tactical breakdown for MULTIPLE matches in one API call.
    """
    match_descriptions = "\n".join([f"- {m['home_team']} vs {m['away_team']}" for m in matches_list])
    
    prompt = f"""
    You are PitchSense's lead football tactical analyst, renowned for your deep, elite-level understanding of the modern game. 
    Here is a list of upcoming matches that need your expert analysis:
    
    {match_descriptions}
    
    IMPORTANT CONTEXT: The current year is 2026. Do NOT hallucinate outdated squads (e.g., do not mention players who left years ago).
    To be safe, avoid mentioning specific player names unless you are 100% certain they are key figures for this team in 2026.
    
    For each match, your analysis must focus on advanced tactical nuances:
    - Formational matchups, pressing triggers, and defensive block heights (e.g., mid-block, high press).
    - Utilization of the half-spaces, inverted fullbacks, double pivots, or transitional phases.
    - How one manager's specific tactical philosophy counters or exploits the other's weaknesses.
    
    Provide a sharp, authoritative, and deeply analytical prediction for each match.
    Do NOT use robotic terms like 'confidence score' or 'percentage chance'. Do not sound like an AI.
    Sound like a brilliant, data-driven, top-tier football analyst (like Gary Neville meeting Marcelo Bielsa) breaking down the game.
    
    Return a raw JSON array of objects. Do NOT wrap it in markdown block quotes like ```json. Just raw text.
    Each object must exactly match this structure:
    {{
        "home_team": "String (exact same name as I provided)",
        "away_team": "String (exact same name as I provided)",
        "predicted_winner": "String (Team Name or Draw)",
        "predicted_score": "String (e.g. 2-1)",
        "insight": "String (Your masterclass tactical paragraph. Keep it under 150 words. Be bold, highly technical, and opinionated.)"
    }}
    """
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.5
        }
    }
    
    res = requests.post(url, headers={"Content-Type": "application/json"}, json=payload)
    res.raise_for_status()
    data = res.json()
    text = data['candidates'][0]['content']['parts'][0]['text'].strip()
    
    text = text.replace('```json', '').replace('```', '').strip()
    
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        print("Failed to decode JSON from Gemini:", e)
        print("Raw text was:", text)
        return []

def process_upcoming_matches():
    # 1. Get all matches that don't have a result yet
    print("Fetching upcoming matches from database...")
    matches_response = supabase.table("matches").select("*").is_("result", "null").execute()
    upcoming_matches = matches_response.data
    
    if not upcoming_matches:
        print("No upcoming matches found.")
        return
        
    # 2. Get matches that already have an AI insight so we don't duplicate
    insights_response = supabase.table("machine_insights").select("match_id").execute()
    existing_insight_match_ids = [row["match_id"] for row in insights_response.data]
    
    # 3. Filter down to matches that need an insight
    matches_to_process = [m for m in upcoming_matches if m["id"] not in existing_insight_match_ids]
    
    if not matches_to_process:
        print("All upcoming matches already have AI insights generated. Nothing to do.")
        return
        
    print(f"Batch processing {len(matches_to_process)} matches in a single API call to save rate limits...")
    
    # Process in batches of 10 just in case there are a massive amount of matches
    batch_size = 10
    for i in range(0, len(matches_to_process), batch_size):
        batch = matches_to_process[i:i + batch_size]
        print(f"Sending batch of {len(batch)} matches to Gemini...")
        
        try:
            ai_results = generate_batched_tactical_analysis(batch)
            
            for ai_match in ai_results:
                # Find the database ID for this match
                db_match = next((m for m in batch if m['home_team'] == ai_match['home_team'] and m['away_team'] == ai_match['away_team']), None)
                
                if db_match:
                    insight_data = {
                        "match_id": db_match["id"],
                        "insight": ai_match["insight"],
                        "predicted_winner": ai_match["predicted_winner"]
                    }
                    supabase.table("machine_insights").insert(insight_data).execute()
                    print(f"Insight saved successfully for {db_match['home_team']} vs {db_match['away_team']}")
                else:
                    print(f"Warning: Gemini returned a match not in our batch: {ai_match['home_team']} vs {ai_match['away_team']}")
                    
        except Exception as e:
            print(f"Failed to generate or save insight batch: {e}")

if __name__ == "__main__":
    process_upcoming_matches()
    print("Done generating insights.")
