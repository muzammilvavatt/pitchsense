-- 1. Add avatar_url to the predictions table
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Add avatar_url to the replies table
ALTER TABLE replies ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 3. Fix the Leaderboard View to include avatars
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

-- 4. Backfill missing avatars in predictions
UPDATE predictions p
SET avatar_url = u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
WHERE u.raw_user_meta_data->>'alias' = p.alias
  AND p.avatar_url IS NULL
  AND u.raw_user_meta_data->>'avatar_url' IS NOT NULL;

-- 5. Backfill missing avatars in replies
UPDATE replies r
SET avatar_url = u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
WHERE u.raw_user_meta_data->>'alias' = r.alias
  AND r.avatar_url IS NULL
  AND u.raw_user_meta_data->>'avatar_url' IS NOT NULL;
