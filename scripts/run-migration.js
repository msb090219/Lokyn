const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const migrationSQL = `
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL CHECK (length(title) <= 200),
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  color TEXT DEFAULT 'blue',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own events" ON events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own events" ON events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own events" ON events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own events" ON events FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
`

async function runMigration() {
  try {
    console.log('Running events table migration...')

    // We need to use RPC since the anon key can't run DDL directly
    // But for now, let's just provide instructions
    console.log('\n⚠️  Please run this SQL in your Supabase SQL Editor:')
    console.log('https://supabase.com/dashboard/project/jopfsppfjlaijgjnhwxf/sql/new\n')
    console.log(migrationSQL)

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

runMigration()
