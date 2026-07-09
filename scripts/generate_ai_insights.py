import os
import time
import google.generativeai as genai
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY or not GEMINI_API_KEY:
    print("Please set SUPABASE_URL, SUPABASE_KEY, and GEMINI_API_KEY in your .env file.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GEMINI_API_KEY)

# Use Gemini 2.5 Flash for the latest model capabilities in 2026
model = genai.GenerativeModel('gemini-2.5-flash')

def generate_tactical_analysis(home_team, away_team):
    """
    Prompts Gemini to generate a human-sounding, authoritative tactical breakdown.
    """
    prompt = f"""
    You are PitchSense's lead football tactical analyst. 
    A match is coming up between {home_team} and {away_team}.
    
    Provide a sharp, authoritative, and completely human-sounding tactical prediction for this match.
    Do NOT use robotic terms like 'confidence score' or 'percentage chance'. Do not sound like an AI.
    Sound like a brilliant former player analyzing the game on TV.
    
    Structure your response perfectly like this (do not deviate, use this markdown):
    
    **Predicted Winner:** [Team Name or Draw]
    **Predicted Score:** [e.g., 2-1]
    
    [Your tactical paragraph explaining EXACTLY why you think this will happen based on playstyles, midfield battles, or attacking threat. Keep it under 100 words. Be bold and opinionated.]
    """
    
    response = model.generate_content(prompt)
    return response.text.strip()

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
            
            # Wait 15 seconds before the next request to avoid hitting Google's 5 Requests Per Minute limit
            print("Waiting 15 seconds to respect free API rate limits...")
            time.sleep(15)
        except Exception as e:
            print(f"Failed to generate or save insight: {e}")

if __name__ == "__main__":
    process_upcoming_matches()
    print("Done generating insights.")
