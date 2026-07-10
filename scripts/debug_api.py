import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv
import json

load_dotenv()
API_FOOTBALL_KEY = os.getenv("API_FOOTBALL_KEY")

HOT_LEAGUES = {1: "World Cup", 2: "UEFA Champions League", 39: "Premier League", 140: "La Liga"}

matches = []
headers = {"x-apisports-key": API_FOOTBALL_KEY}
url = "https://v3.football.api-sports.io/fixtures"

for i in range(7):
    target_date = (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d")
    querystring = {"date": target_date}
    
    response = requests.get(url, headers=headers, params=querystring)
    data = response.json()
    
    if "response" in data:
        for item in data["response"]:
            league_id = item["league"]["id"]
            if league_id in HOT_LEAGUES:
                teams = item["teams"]
                print(f"Found on {target_date}: {teams['home']['name']} vs {teams['away']['name']}")
    else:
        print(f"Error on {target_date}:", json.dumps(data))
