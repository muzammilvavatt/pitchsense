-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_winners ENABLE ROW LEVEL SECURITY;

-- 1. Read-Only Tables (Public Select, No User Inserts)
-- The Python automation scripts run with Service Role and bypass these checks.
CREATE POLICY "Public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Public read insights" ON machine_insights FOR SELECT USING (true);
CREATE POLICY "Public read seasons" ON seasons FOR SELECT USING (true);

-- 2. User-Generated Tables (Public Select, Authenticated User Insert/Delete)
CREATE POLICY "Public read predictions" ON predictions FOR SELECT USING (true);
CREATE POLICY "Users can insert own predictions" ON predictions FOR INSERT WITH CHECK (alias = (auth.jwt() -> 'user_metadata' ->> 'alias'));
CREATE POLICY "Users can delete own predictions" ON predictions FOR DELETE USING (alias = (auth.jwt() -> 'user_metadata' ->> 'alias'));

CREATE POLICY "Public read replies" ON replies FOR SELECT USING (true);
CREATE POLICY "Users can insert own replies" ON replies FOR INSERT WITH CHECK (alias = (auth.jwt() -> 'user_metadata' ->> 'alias'));
CREATE POLICY "Users can delete own replies" ON replies FOR DELETE USING (alias = (auth.jwt() -> 'user_metadata' ->> 'alias'));

CREATE POLICY "Public read prediction_likes" ON prediction_likes FOR SELECT USING (true);
CREATE POLICY "Users can insert own likes" ON prediction_likes FOR INSERT WITH CHECK (alias = (auth.jwt() -> 'user_metadata' ->> 'alias'));
CREATE POLICY "Users can delete own likes" ON prediction_likes FOR DELETE USING (alias = (auth.jwt() -> 'user_metadata' ->> 'alias'));

-- 3. Prize Winners Table (Public Select, Authenticated User Update on Email)
CREATE POLICY "Public read prize_winners" ON prize_winners FOR SELECT USING (true);
CREATE POLICY "Users can update their own prize email" ON prize_winners FOR UPDATE USING (alias = (auth.jwt() -> 'user_metadata' ->> 'alias'));
-- Notice: We do not allow INSERT or DELETE on prize_winners for users. Only the Admin (via Service Role or Supabase Dashboard) can insert winners.
