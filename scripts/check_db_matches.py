import os
from datetime import datetime, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

now = datetime.utcnow()
next30 = now + timedelta(hours=30)

response = supabase.table("matches").select("*").is_("result", "null").gt("kickoff", now.isoformat()).lt("kickoff", next30.isoformat()).execute()
print(f"Now: {now.isoformat()}")
print(f"Next 30: {next30.isoformat()}")
print("Matches found:")
for m in response.data:
    print(f"{m['home_team']} vs {m['away_team']} - Kickoff: {m['kickoff']}")
