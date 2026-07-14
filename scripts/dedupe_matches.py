import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

response = supabase.table('matches').select('id, home_team, away_team').execute()

seen = set()
deleted_count = 0

for m in response.data:
    # Normalize match representation regardless of home/away order
    match_key = tuple(sorted([m['home_team'].lower(), m['away_team'].lower()]))
    
    if match_key in seen:
        print(f"Deleting duplicate match: {m['home_team']} vs {m['away_team']}")
        supabase.table('matches').delete().eq('id', m['id']).execute()
        deleted_count += 1
    else:
        seen.add(match_key)

print(f"Deleted {deleted_count} duplicate matches.")
