-- Add discord_link_token column to user_preferences
-- This stores one-time tokens for linking Discord accounts to dashboard users

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS discord_link_token TEXT;

-- Add index for faster token lookups during linking process
CREATE INDEX IF NOT EXISTS idx_user_preferences_discord_link_token
ON user_preferences(discord_link_token);

-- Add comment for documentation
COMMENT ON COLUMN user_preferences.discord_link_token IS 'One-time use token for linking Discord accounts to dashboard users via /link command';
