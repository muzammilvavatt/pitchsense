import os
import requests
import json
from datetime import datetime, timedelta
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

def fetch_hot_matches():
    """
    Uses Gemini AI with Google Search Grounding to find upcoming major football fixtures.
    """
    print("Asking Gemini AI to search the web for upcoming Hot Matches...")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    
    today = datetime.now().strftime('%Y-%m-%d')
    prompt = f"""
    Today's date is {today}.
    Search the web for the most important upcoming international and top-flight club football (soccer) fixtures over the next 7 days.
    Focus EXCLUSIVELY on major elite tournaments: FIFA World Cup, Euro Championship, Copa America, UEFA Nations League, UEFA Champions League, Premier League, La Liga, Serie A, Bundesliga.
    DO NOT return minor leagues or Major League Soccer (MLS) under any circumstances.
    If there are World Cup matches happening in the next 48 hours, they MUST be included.
    
    Return the matches as a raw JSON array of objects. Do NOT wrap it in markdown block quotes like ```json. Just raw text.
    Each object must exactly match this structure:
    {{
        "home_team": "String (e.g. Spain)",
        "away_team": "String (e.g. France)",
        "league": "String (e.g. Euro Championship)",
        "kickoff": "ISO 8601 string of the exact match time (e.g. 2026-07-11T20:00:00Z)",
        "is_knockout": true/false (true if it is a knockout stage, quarter final, semi final, final, etc.),
        "home_logo": "String. URL of the team's logo/flag. For national teams, ALWAYS use https://flagcdn.com/w160/xx.png where xx is the 2-letter ISO 3166-1 alpha-2 country code (e.g. ar.png for Argentina, es.png for Spain, gb-eng.png for England).",
        "away_logo": "String. URL of the team's logo/flag. Same rule as home_logo."
    }}
    
    Do not invent matches. Only return real matches scheduled in the next 7 days. Limit to at most 10 matches.
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
        
        # Clean up markdown if Gemini hallucinates it despite instructions
        text = text.replace('```json', '').replace('```', '').strip()
        
        matches = json.loads(text)
        
        if not isinstance(matches, list):
            print("Gemini did not return a list.")
            return []
            
        print(f"Gemini found {len(matches)} matches!")
        return matches
        
    except Exception as e:
        print("Failed to fetch matches from Gemini:", e)
        return []

def save_matches_to_supabase(matches):
    print(f"Saving {len(matches)} AI-discovered Matches to Supabase...")
    
    # Get existing matches to prevent duplicates
    existing = supabase.table("matches").select("id, home_team, away_team").execute()
    existing_matches = existing.data or []

    for match in matches:
        try:
            # Find if match exists
            db_match = next((m for m in existing_matches if m["home_team"] == match["home_team"] and m["away_team"] == match["away_team"]), None)
            
            if db_match:
                # Update existing match
                supabase.table("matches").update({
                    "kickoff": match["kickoff"],
                    "is_knockout": match["is_knockout"],
                    "league": match["league"]
                }).eq("id", db_match["id"]).execute()
                print(f"Updated Match: {match['home_team']} vs {match['away_team']}")
            else:
                # Insert new match
                supabase.table("matches").insert(match).execute()
                print(f"Added New Match: {match['home_team']} vs {match['away_team']}")
        except Exception as e:
            print(f"Failed to insert/update match ({match.get('home_team')} vs {match.get('away_team')}): {e}")

if __name__ == "__main__":
    hot_data = fetch_hot_matches()
    
    if hot_data:
        save_matches_to_supabase(hot_data)
        print("Done! AI has fully synced the latest fixtures for PitchSense.")
    else:
        print("No matches were found or parsed successfully.")
