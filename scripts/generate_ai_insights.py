import os
import time
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

def generate_tactical_analysis(home_team, away_team):
    """
    Prompts Gemini to generate a human-sounding, authoritative tactical breakdown.
    """
    prompt = f"""
    You are PitchSense's lead football tactical analyst, renowned for your deep, elite-level understanding of the modern game. 
    A match is coming up between {home_team} and {away_team}.
    
    IMPORTANT CONTEXT: The current year is 2026. Do NOT hallucinate outdated squads (e.g., do not mention players who left years ago).
    To be safe, avoid mentioning specific player names unless you are 100% certain they are key figures for this team in 2026.
    
    Instead, your analysis must focus on advanced tactical nuances:
    - Formational matchups, pressing triggers, and defensive block heights (e.g., mid-block, high press).
    - Utilization of the half-spaces, inverted fullbacks, double pivots, or transitional phases.
    - How one manager's specific tactical philosophy counters or exploits the other's weaknesses.
    
    Provide a sharp, authoritative, and deeply analytical prediction for this match.
    Do NOT use robotic terms like 'confidence score' or 'percentage chance'. Do not sound like an AI.
    Sound like a brilliant, data-driven, top-tier football analyst (like Gary Neville meeting Marcelo Bielsa) breaking down the game.
    
    Structure your response perfectly like this (do not deviate, use this exact markdown format):
    
    **Predicted Winner:** [Team Name or Draw]
    **Predicted Score:** [e.g., 2-1]
    
    [Your masterclass tactical paragraph explaining exactly how this match will be won or lost. Discuss the tactical battleground, key strategic phases, and structural advantages. Keep it under 150 words. Be bold, highly technical, and opinionated.]
    """
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.5
        }
    }
    
    res = requests.post(url, headers={"Content-Type": "application/json"}, json=payload)
    res.raise_for_status()
    data = res.json()
    return data['candidates'][0]['content']['parts'][0]['text'].strip()

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
    
    # 3. Generate insights for matches that need one
    for match in upcoming_matches:
        if match["id"] in existing_insight_match_ids:
            continue
            
        print(f"Generating Top Analyst Insight for: {match['home_team']} vs {match['away_team']}...")
        
        try:
            insight_text = generate_tactical_analysis(match["home_team"], match["away_team"])
            
            # Extract predicted winner (assumes format "**Predicted Winner:** [Team]")
            predicted_winner = ""
            for line in insight_text.split('\n'):
                if "**Predicted Winner:**" in line:
                    predicted_winner = line.split("**Predicted Winner:**")[1].strip()
                    break
            
            # Insert into database
            insight_data = {
                "match_id": match["id"],
                "insight": insight_text,
                "predicted_winner": predicted_winner
            }
            supabase.table("machine_insights").insert(insight_data).execute()
            print("Insight saved successfully.")
            
            # Wait 5 seconds before the next request to avoid hitting Google's 15 Requests Per Minute limit
            print("Waiting 5 seconds to respect free API rate limits...")
            time.sleep(5)
        except Exception as e:
            print(f"Failed to generate or save insight: {e}")

if __name__ == "__main__":
    process_upcoming_matches()
    print("Done generating insights.")
