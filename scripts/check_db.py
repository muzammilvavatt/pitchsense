import os
from supabase import create_client, Client

url = "https://ijpuxusgcivfiyatgmac.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqcHV4dXNnY2l2Zml5YXRnbWFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzgzOTksImV4cCI6MjA5OTExNDM5OX0.n7Qc5FQUfaSMHX5kxZMTeNzbzXITDD-cjbG5zGZOR6M"

supabase: Client = create_client(url, key)

try:
    print("Fetching last 5 predictions...")
    res = supabase.table("predictions").select("*").order("created_at", desc=True).limit(5).execute()
    for row in res.data:
        print(row)
except Exception as e:
    print("Error fetching predictions:", e)

try:
    print("Fetching leaderboard...")
    res = supabase.table("leaderboard").select("*").limit(5).execute()
    for row in res.data:
        print(row)
except Exception as e:
    print("Error fetching leaderboard:", e)

try:
    print("Fetching auth users (if allowed)...")
    res = supabase.table("profiles").select("*").limit(5).execute()
    print("Profiles:", res.data)
except Exception as e:
    pass
