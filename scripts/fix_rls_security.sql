-- ==========================================
-- STEP 1: CREATE SECURE PROFILES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    alias TEXT UNIQUE NOT NULL
);

-- Turn on RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
-- Notice there are NO insert/update/delete policies for users. Only triggers and service roles can modify it.


-- ==========================================
-- STEP 2: BACKFILL EXISTING USERS
-- ==========================================
-- This copies your 15 existing users into the new secure table so nobody is locked out.
INSERT INTO public.profiles (id, alias)
SELECT id, raw_user_meta_data->>'alias'
FROM auth.users
WHERE raw_user_meta_data->>'alias' IS NOT NULL
ON CONFLICT (id) DO NOTHING;


-- ==========================================
-- STEP 3: AUTOMATE NEW USER SIGNUPS
-- ==========================================
-- This function automatically creates a profile when someone signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, alias)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'alias');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on the auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==========================================
-- STEP 4: UPDATE RLS POLICIES
-- ==========================================
-- We drop the old vulnerable policies and replace them with policies that check the secure profiles table!

-- Predictions
DROP POLICY IF EXISTS "Users can insert own predictions" ON predictions;
DROP POLICY IF EXISTS "Users can delete own predictions" ON predictions;

CREATE POLICY "Users can insert own predictions" ON predictions 
FOR INSERT WITH CHECK (alias = (SELECT alias FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own predictions" ON predictions 
FOR DELETE USING (alias = (SELECT alias FROM public.profiles WHERE id = auth.uid()));

-- Replies
DROP POLICY IF EXISTS "Users can insert own replies" ON replies;
DROP POLICY IF EXISTS "Users can delete own replies" ON replies;

CREATE POLICY "Users can insert own replies" ON replies 
FOR INSERT WITH CHECK (alias = (SELECT alias FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own replies" ON replies 
FOR DELETE USING (alias = (SELECT alias FROM public.profiles WHERE id = auth.uid()));

-- Prediction Likes
DROP POLICY IF EXISTS "Users can insert own likes" ON prediction_likes;
DROP POLICY IF EXISTS "Users can delete own likes" ON prediction_likes;

CREATE POLICY "Users can insert own likes" ON prediction_likes 
FOR INSERT WITH CHECK (alias = (SELECT alias FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own likes" ON prediction_likes 
FOR DELETE USING (alias = (SELECT alias FROM public.profiles WHERE id = auth.uid()));

-- Prize Winners
DROP POLICY IF EXISTS "Users can update their own prize email" ON prize_winners;

CREATE POLICY "Users can update their own prize email" ON prize_winners 
FOR UPDATE USING (alias = (SELECT alias FROM public.profiles WHERE id = auth.uid()));


-- ==========================================
-- STEP 5: FIX LEADERBOARD SECURITY DEFINER WARNING
-- ==========================================
-- We recreate the view explicitly telling Supabase to apply security rules (security_invoker = true)
DROP VIEW IF EXISTS leaderboard;

CREATE VIEW leaderboard WITH (security_invoker = true) AS
SELECT 
    alias,
    MAX(avatar_url) AS avatar_url,
    COUNT(*) FILTER (WHERE is_correct = TRUE) AS correct_predictions,
    SUM(likes) AS total_likes,
    (COUNT(*) FILTER (WHERE is_correct = TRUE) * 2) + COALESCE(SUM(likes), 0) AS total_score
FROM predictions
GROUP BY alias
ORDER BY total_score DESC, correct_predictions DESC, total_likes DESC;
