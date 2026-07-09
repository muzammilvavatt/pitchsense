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

def fetch_recent_results():
    """
    Fetches matches from the last 2 days from API-Football to find finished games.
    """
    finished_matches = []
    headers = {"x-apisports-key": API_FOOTBALL_KEY}
    url = "https://v3.football.api-sports.io/fixtures"
    
    # Check yesterday and today
    for i in range(-1, 1):
        target_date = (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d")
        querystring = {"date": target_date}
        
        response = requests.get(url, headers=headers, params=querystring)
        data = response.json()
        
        if "response" in data:
            for item in data["response"]:
                fixture = item["fixture"]
                teams = item["teams"]
                goals = item["goals"]
                
                # Check if match is finished (FT, AET, PEN)
                if fixture["status"]["short"] in ["FT", "AET", "PEN"]:
                    finished_matches.append({
                        "home_team": teams["home"]["name"],
                        "away_team": teams["away"]["name"],
                        "home_goals": goals["home"],
                        "away_goals": goals["away"]
                    })
    return finished_matches

def determine_winner(home_team, away_team, home_goals, away_goals):
    if home_goals > away_goals:
        return home_team
    elif away_goals > home_goals:
        return away_team
    return "Draw"

def update_database_results(api_results):
    # 1. Fetch pending matches from Supabase (where result is null)
    response = supabase.table("matches").select("*").is_("result", "null").execute()
    pending_matches = response.data
    
    if not pending_matches:
        print("No pending matches found in database.")
        return

    for db_match in pending_matches:
        # 2. Find the corresponding finished match from the API data
        matched_api_game = next(
            (m for m in api_results if m["home_team"] == db_match["home_team"] and m["away_team"] == db_match["away_team"]), 
            None
        )
        
        if matched_api_game:
            score_string = f"{matched_api_game['home_goals']}-{matched_api_game['away_goals']}"
            actual_winner = determine_winner(
                matched_api_game["home_team"], 
                matched_api_game["away_team"], 
                matched_api_game["home_goals"], 
                matched_api_game["away_goals"]
            )
            
            print(f"Match Finished: {db_match['home_team']} vs {db_match['away_team']} -> {score_string} (Winner: {actual_winner})")
            
            # 3. Update the matches table with the final result
            supabase.table("matches").update({"result": score_string}).eq("id", db_match["id"]).execute()
            
            # 4. Evaluate all predictions for this match
            pred_response = supabase.table("predictions").select("*").eq("match_id", db_match["id"]).execute()
            predictions = pred_response.data
            
            for pred in predictions:
                is_correct = (pred["prediction"] == actual_winner)
                supabase.table("predictions").update({"is_correct": is_correct}).eq("id", pred["id"]).execute()
                print(f"  - Scored prediction by {pred['alias']}: {'Correct' if is_correct else 'Incorrect'}")

if __name__ == "__main__":
    print("Looking for completed matches...")
    results = fetch_recent_results()
    if results:
        update_database_results(results)
    print("Done updating results.")
