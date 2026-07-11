import os
from datetime import datetime, timedelta
from supabase import create_client, Client
SUPABASE_URL = 'https://ijpuxusgcivfiyatgmac.supabase.co'
SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqcHV4dXNnY2l2Zml5YXRnbWFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzgzOTksImV4cCI6MjA5OTExNDM5OX0.n7Qc5FQUfaSMHX5kxZMTeNzbzXITDD-cjbG5zGZOR6M'
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
now = datetime.utcnow()
next30 = now + timedelta(hours=30)
response = supabase.table('matches').select('*').is_('result', 'null').gt('kickoff', now.isoformat()).lt('kickoff', next30.isoformat()).order('kickoff').execute()
print(f'Count: {len(response.data)}')
for m in response.data:
    print(f"{m['home_team']} vs {m['away_team']} - Kickoff: {m['kickoff']}")
