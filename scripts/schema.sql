-- schema.sql

-- Matches Table
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_team VARCHAR(100) NOT NULL,
    away_team VARCHAR(100) NOT NULL,
    kickoff TIMESTAMP WITH TIME ZONE NOT NULL,
    result VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Predictions Table
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alias VARCHAR(100) NOT NULL,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    prediction VARCHAR(50) NOT NULL,
    score_prediction VARCHAR(20) NOT NULL,
    justification TEXT,
    likes INT DEFAULT 0,
    is_correct BOOLEAN,
    countered_ai BOOLEAN DEFAULT FALSE,
    is_exact_score BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_predictions_match_id ON predictions(match_id);

-- Machine Insights Table
CREATE TABLE machine_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    insight TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_machine_insights_match_id ON machine_insights(match_id);

-- Dynamic Leaderboard View
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
    alias,
    MAX(avatar_url) AS avatar_url,
    COUNT(*) FILTER (WHERE is_correct = TRUE AND countered_ai = FALSE AND is_exact_score = FALSE) AS correct_predictions,
    COUNT(*) FILTER (WHERE is_correct = TRUE AND countered_ai = TRUE) AS mastermind_predictions,
    COUNT(*) FILTER (WHERE is_exact_score = TRUE) AS sniper_predictions,
    SUM(likes) AS total_likes,
    (COUNT(*) FILTER (WHERE is_correct = TRUE AND countered_ai = FALSE AND is_exact_score = FALSE) * 2) + 
    (COUNT(*) FILTER (WHERE is_correct = TRUE AND countered_ai = TRUE) * 4) + 
    (COUNT(*) FILTER (WHERE is_exact_score = TRUE) * 3) + 
    COALESCE(SUM(likes), 0) AS total_score
FROM predictions
GROUP BY alias
ORDER BY total_score DESC, correct_predictions DESC, mastermind_predictions DESC, sniper_predictions DESC, total_likes DESC;

-- Replies Table
CREATE TABLE replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    alias VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    content TEXT NOT NULL,
    likes INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_replies_prediction_id ON replies(prediction_id);

-- Prediction Likes Table
CREATE TABLE prediction_likes (
    prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    alias VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (prediction_id, alias)
);

-- Function to update predictions like count
CREATE OR REPLACE FUNCTION update_prediction_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE predictions SET likes = likes + 1 WHERE id = NEW.prediction_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE predictions SET likes = likes - 1 WHERE id = OLD.prediction_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for prediction likes
CREATE TRIGGER trigger_update_prediction_likes
AFTER INSERT OR DELETE ON prediction_likes
FOR EACH ROW EXECUTE FUNCTION update_prediction_likes_count();

-- Account Deletion Function
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS void AS $$
BEGIN
  -- Delete the user from auth.users (this triggers ON DELETE CASCADE across the database)
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
