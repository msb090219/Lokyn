-- Add timer duration preferences to user_preferences table
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS study_duration INTEGER DEFAULT 25;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS break_duration INTEGER DEFAULT 5;
