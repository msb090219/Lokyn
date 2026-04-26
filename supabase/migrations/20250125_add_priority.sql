-- Add priority column to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'none'
CHECK (priority IN ('none', 'low', 'medium', 'high'));

-- Add index for priority filtering
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(user_id, priority);
