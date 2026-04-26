-- Discord user connections table
-- This links Discord user IDs to dashboard user accounts

CREATE TABLE IF NOT EXISTS discord_connections (
  discord_user_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE discord_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own Discord connections
CREATE POLICY "Users can view own Discord connections"
  ON discord_connections
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own Discord connections (via link token)
CREATE POLICY "Users can insert own Discord connections"
  ON discord_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own Discord connections
CREATE POLICY "Users can update own Discord connections"
  ON discord_connections
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own Discord connections
CREATE POLICY "Users can delete own Discord connections"
  ON discord_connections
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_discord_connections_user_id ON discord_connections(user_id);

-- Add helpful function to get user_id from discord_user_id
CREATE OR REPLACE FUNCTION get_user_id_from_discord(discord_id TEXT)
RETURNS UUID AS $$
  SELECT user_id FROM discord_connections WHERE discord_user_id = discord_id;
$$ LANGUAGE SQL SECURITY DEFINER;
