-- Add all_day column to events table
ALTER TABLE events
ADD COLUMN all_day BOOLEAN DEFAULT FALSE;

-- Add index for better performance on all-day queries
CREATE INDEX idx_events_all_day ON events(all_day);

-- Add comment for documentation
COMMENT ON COLUMN events.all_day IS 'Indicates if the event is an all-day event without a specific time';
