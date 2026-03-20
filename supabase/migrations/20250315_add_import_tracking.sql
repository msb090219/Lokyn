-- Add import tracking columns to events table
ALTER TABLE events
ADD COLUMN import_batch_id TEXT,
ADD COLUMN import_file_name TEXT,
ADD COLUMN imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for faster queries by import batch
CREATE INDEX idx_events_import_batch ON events(import_batch_id);

-- Add comment
COMMENT ON COLUMN events.import_batch_id IS 'UUID to group events from the same import file';
COMMENT ON COLUMN events.import_file_name IS 'Original filename of the imported .ics file';
