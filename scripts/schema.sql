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
    COUNT(*) FILTER (WHERE is_correct = TRUE) AS correct_predictions,
    SUM(likes) AS total_likes,
    (COUNT(*) FILTER (WHERE is_correct = TRUE) * 2) + COALESCE(SUM(likes), 0) AS total_score
FROM predictions
GROUP BY alias
ORDER BY total_score DESC, correct_predictions DESC, total_likes DESC;
