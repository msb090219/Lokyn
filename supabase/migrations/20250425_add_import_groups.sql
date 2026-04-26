-- Create import_groups table for managing calendar imports
-- This allows users to name and color-code their imported calendar groups

CREATE TABLE IF NOT EXISTS import_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (length(name) <= 100),
  color TEXT DEFAULT 'blue' CHECK (color IN ('blue', 'red', 'green', 'yellow', 'purple', 'orange', 'pink')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE import_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own import groups"
  ON import_groups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own import groups"
  ON import_groups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own import groups"
  ON import_groups FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own import groups"
  ON import_groups FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_import_groups_user_id ON import_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_import_groups_batch_id ON import_groups(batch_id);

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_import_groups_updated_at ON import_groups;
CREATE TRIGGER update_import_groups_updated_at
  BEFORE UPDATE ON import_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get import group info for events
-- This can be used in queries to join events with their import group metadata
CREATE OR REPLACE FUNCTION get_event_import_group(event_batch_id UUID)
RETURNS TABLE (
  batch_id UUID,
  group_name TEXT,
  group_color TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ig.batch_id,
    ig.name as group_name,
    ig.color as group_color
  FROM import_groups ig
  WHERE ig.batch_id = event_batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
