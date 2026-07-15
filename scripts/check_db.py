import os
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv('d:/projects/pitchsense/scripts/.env')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

now = datetime.now(timezone.utc).isoformat()
print(f'Current time: {now}')

matches = supabase.table('matches').select('*').is_('result', 'null').lt('kickoff', now).execute()
print(f'Matches needing results: {len(matches.data)}')
for m in matches.data:
    print(f"  - {m['home_team']} vs {m['away_team']} (Kickoff: {m['kickoff']})")

unscored_preds = supabase.table('predictions').select('*').is_('is_correct', 'null').execute()
print(f'\nPredictions needing scoring: {len(unscored_preds.data)}')
