-- Add accent_color column to user_preferences table
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#3B82F6';

-- Add full_name column to user_preferences for profile info
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Add nullclaw_api_key column for API key storage
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS nullclaw_api_key TEXT;

-- Add notifications_enabled column
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;

-- Add email column for display purposes
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS email TEXT;

-- Add created_at timestamp
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
