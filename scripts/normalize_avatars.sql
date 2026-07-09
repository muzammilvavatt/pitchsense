-- 1. Add avatar_url to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Backfill avatar_url for all existing users from auth.users
UPDATE public.profiles p
SET avatar_url = u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
WHERE p.id = u.id;

-- 3. Update the trigger to always copy avatar_url on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, alias, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'alias', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recreate Leaderboard view to pull avatar_url directly from profiles!
DROP VIEW IF EXISTS leaderboard;

CREATE VIEW leaderboard WITH (security_invoker = true) AS
SELECT 
    p.alias,
    p.avatar_url,
    COUNT(pr.id) FILTER (WHERE pr.is_correct = TRUE) AS correct_predictions,
    SUM(pr.likes) AS total_likes,
    (COUNT(pr.id) FILTER (WHERE pr.is_correct = TRUE) * 2) + COALESCE(SUM(pr.likes), 0) AS total_score
FROM public.profiles p
JOIN predictions pr ON p.alias = pr.alias
GROUP BY p.alias, p.avatar_url
ORDER BY total_score DESC, correct_predictions DESC, total_likes DESC;
