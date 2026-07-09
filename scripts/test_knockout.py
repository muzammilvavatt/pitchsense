import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# Update all upcoming matches to be knockout matches
supabase.table("matches").update({"is_knockout": True}).is_("result", "null").execute()
print("Updated existing matches to is_knockout=True for testing!")
