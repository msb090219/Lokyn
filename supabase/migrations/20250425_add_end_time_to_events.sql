-- Add end_time column to events table
-- This allows for more efficient queries and simpler display logic

-- Add the column (nullable initially)
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;

-- Backfill existing events
-- Calculate end_time from event_date + duration_minutes
UPDATE events
SET end_time = event_date + (duration_minutes || ' minutes')::INTERVAL
WHERE end_time IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE events ALTER COLUMN end_time SET NOT NULL;

-- Create trigger function to auto-calculate end_time
CREATE OR REPLACE FUNCTION update_event_end_time()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate end_time when event_date or duration_minutes changes
  IF NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes OR
     NEW.event_date IS DISTINCT FROM OLD.event_date THEN
    NEW.end_time = NEW.event_date + (NEW.duration_minutes || ' minutes')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_event_end_time ON events;
CREATE TRIGGER trigger_update_event_end_time
  BEFORE INSERT OR UPDATE OF event_date, duration_minutes
  ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_event_end_time();

-- Add index for queries on end_time
CREATE INDEX IF NOT EXISTS idx_events_end_time ON events(end_time);
CREATE INDEX IF NOT EXISTS idx_events_date_range ON events(event_date, end_time);
