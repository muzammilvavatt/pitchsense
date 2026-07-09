-- 1. Update the leaderboard view to ensure it picks up the avatars
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

-- 2. Backfill missing avatars in the predictions table for existing users!
UPDATE predictions p
SET avatar_url = u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
WHERE u.raw_user_meta_data->>'alias' = p.alias
  AND p.avatar_url IS NULL
  AND u.raw_user_meta_data->>'avatar_url' IS NOT NULL;
