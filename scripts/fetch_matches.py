import os
import requests
from datetime import datetime, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
API_FOOTBALL_KEY = os.getenv("API_FOOTBALL_KEY")

if not SUPABASE_URL or not SUPABASE_KEY or not API_FOOTBALL_KEY:
    print("Please set SUPABASE_URL, SUPABASE_KEY, and API_FOOTBALL_KEY in your .env file.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# A strict list of absolute Top-Tier "Hot" League IDs
HOT_LEAGUES = {
    1: "World Cup",
    2: "UEFA Champions League",
    39: "Premier League",
    140: "La Liga"
}

def fetch_hot_matches():
    """
    Looks ahead over the next 7 days to find any matches belonging to "Hot" leagues.
    This avoids the free-tier restriction by checking specific dates, and guarantees 
    we only pull high-profile fixtures.
    """
    matches = []
    headers = {"x-apisports-key": API_FOOTBALL_KEY}
    url = "https://v3.football.api-sports.io/fixtures"
    
    print("Scanning the next 7 days for Hot Matches (Top Leagues)...")
    
    # Check today and the next 6 days (7 API requests maximum)
    for i in range(7):
        target_date = (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d")
        querystring = {"date": target_date}
        
        response = requests.get(url, headers=headers, params=querystring)
        data = response.json()
        
        if "response" in data:
            for item in data["response"]:
                fixture = item["fixture"]
                teams = item["teams"]
                league_id = item["league"]["id"]
                
                # Filter: Only keep matches from our Hot Leagues list
                if league_id in HOT_LEAGUES:
                    # Determine if this is a knockout match based on the round name
                    round_name = item["league"]["round"].lower()
                    knockout_keywords = ["round of", "quarter", "semi", "final", "knockout"]
                    is_knockout = any(keyword in round_name for keyword in knockout_keywords)

                    matches.append({
                        "home_team": teams["home"]["name"],
                        "away_team": teams["away"]["name"],
                        "home_logo": teams["home"]["logo"],
                        "away_logo": teams["away"]["logo"],
                        "kickoff": fixture["date"],
                        "is_knockout": is_knockout
                    })
                    
                    # Stop once we have found 10 hot matches to save database space
                    if len(matches) >= 10:
                        return matches
        else:
            print(f"Error fetching date {target_date}:", data)
            break
            
    return matches

def save_matches_to_supabase(matches):
    print(f"Saving {len(matches)} Hot Matches to Supabase...")
    
    # Get existing matches
    existing = supabase.table("matches").select("id, home_team, away_team").execute()
    existing_matches = existing.data or []

    for match in matches:
        try:
            # Find if match exists
            db_match = next((m for m in existing_matches if m["home_team"] == match["home_team"] and m["away_team"] == match["away_team"]), None)
            
            if db_match:
                # Update existing match with logos
                supabase.table("matches").update({
                    "home_logo": match["home_logo"],
                    "away_logo": match["away_logo"],
                    "kickoff": match["kickoff"],
                    "is_knockout": match["is_knockout"]
                }).eq("id", db_match["id"]).execute()
                print(f"Updated Match with Logos: {match['home_team']} vs {match['away_team']}")
            else:
                # Insert new match
                supabase.table("matches").insert(match).execute()
                print(f"Added New Match: {match['home_team']} vs {match['away_team']}")
        except Exception as e:
            print(f"Failed to insert/update match: {e}")

if __name__ == "__main__":
    hot_data = fetch_hot_matches()
    
    if hot_data:
        save_matches_to_supabase(hot_data)
        print("Done! Hot matches are now locked and loaded for PitchSense.")
    else:
        print("No hot matches found in the next 7 days.")
