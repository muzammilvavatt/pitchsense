import os
from supabase import create_client, Client
from dotenv import load_dotenv
import requests

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # Needs to be service_role or admin key ideally for DDL, but we'll try with REST API via postgres functions if DDL fails, or standard client if enabled.

# Actually, the standard supabase-py client cannot execute arbitrary SQL (DDL like ALTER TABLE).
# We must use the Supabase REST API `rpc` endpoint or just tell the user to run it if it fails.
# Since we don't have direct Postgres connection strings (like postgresql://...), we will try calling a non-existent rpc that we can't create either.
# Best approach: Give the SQL to the user to run in Supabase SQL Editor.
print("To upgrade the database securely, please run this SQL in your Supabase SQL Editor:")
print('''
ALTER TABLE machine_insights ADD COLUMN IF NOT EXISTS predicted_winner VARCHAR(100);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS countered_ai BOOLEAN DEFAULT FALSE;

DROP VIEW IF EXISTS leaderboard;
CREATE VIEW leaderboard AS
SELECT 
    alias,
    COUNT(*) FILTER (WHERE is_correct = TRUE AND countered_ai = FALSE) AS correct_predictions,
    COUNT(*) FILTER (WHERE is_correct = TRUE AND countered_ai = TRUE) AS mastermind_predictions,
    SUM(likes) AS total_likes,
    (COUNT(*) FILTER (WHERE is_correct = TRUE AND countered_ai = FALSE) * 2) + 
    (COUNT(*) FILTER (WHERE is_correct = TRUE AND countered_ai = TRUE) * 4) + 
    COALESCE(SUM(likes), 0) AS total_score
FROM predictions
GROUP BY alias
ORDER BY total_score DESC, correct_predictions DESC, mastermind_predictions DESC, total_likes DESC;
''')
