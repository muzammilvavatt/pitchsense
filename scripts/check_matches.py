import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

response = supabase.table('matches').select('*').execute()
print(f'Total Matches in DB: {len(response.data)}')
for m in response.data:
    if m['result'] is None:
        print(f"UPCOMING: {m['home_team']} vs {m['away_team']} at {m['kickoff']}")
    else:
        print(f"FINISHED: {m['home_team']} vs {m['away_team']} (Result: {m['result']})")
