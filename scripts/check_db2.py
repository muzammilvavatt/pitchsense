import os
import json
from supabase import create_client, Client

url = "https://ijpuxusgcivfiyatgmac.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqcHV4dXNnY2l2Zml5YXRnbWFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzgzOTksImV4cCI6MjA5OTExNDM5OX0.n7Qc5FQUfaSMHX5kxZMTeNzbzXITDD-cjbG5zGZOR6M"

supabase: Client = create_client(url, key)

with open("db_out.log", "w") as f:
    try:
        f.write("Fetching last 5 predictions...\n")
        res = supabase.table("predictions").select("*").order("created_at", desc=True).limit(5).execute()
        for row in res.data:
            f.write(json.dumps(row) + "\n")
    except Exception as e:
        f.write("Error fetching predictions: " + str(e) + "\n")

    try:
        f.write("Fetching leaderboard...\n")
        res = supabase.table("leaderboard").select("*").limit(5).execute()
        for row in res.data:
            f.write(json.dumps(row) + "\n")
    except Exception as e:
        f.write("Error fetching leaderboard: " + str(e) + "\n")
