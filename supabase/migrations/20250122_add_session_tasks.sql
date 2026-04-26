-- Session-Tasks junction table
-- Tracks which tasks are associated with each study session
CREATE TABLE IF NOT EXISTS session_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one task can only appear once per session
  UNIQUE(session_id, task_id)
);

-- RLS Policies
ALTER TABLE session_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own session tasks"
  ON session_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_sessions
      WHERE study_sessions.id = session_tasks.session_id
      AND study_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own session tasks"
  ON session_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_sessions
      WHERE study_sessions.id = session_tasks.session_id
      AND study_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own session tasks"
  ON session_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM study_sessions
      WHERE study_sessions.id = session_tasks.session_id
      AND study_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own session tasks"
  ON session_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM study_sessions
      WHERE study_sessions.id = session_tasks.session_id
      AND study_sessions.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_tasks_session_id ON session_tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_session_tasks_task_id ON session_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_session_tasks_session_position ON session_tasks(session_id, position);

-- Trigger for updated_at
CREATE TRIGGER update_session_tasks_updated_at
  BEFORE UPDATE ON session_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Database function to get active session with tasks
CREATE OR REPLACE FUNCTION get_active_session_with_tasks(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  task_id UUID,
  title TEXT,
  started_at TIMESTAMPTZ,
  tasks JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ss.id,
    ss.task_id,
    ss.title,
    ss.started_at,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', st.id,
          'task_id', st.task_id,
          'completed', st.completed,
          'position', st.position,
          'task', jsonb_build_object(
            'id', t.id,
            'text', t.text
          )
        ) ORDER BY st.position
      ) FILTER (WHERE st.id IS NOT NULL),
      '[]'::jsonb
    ) as tasks
  FROM study_sessions ss
  LEFT JOIN session_tasks st ON st.session_id = ss.id
  LEFT JOIN tasks t ON t.id = st.task_id
  WHERE ss.user_id = p_user_id
    AND ss.completed_at IS NULL
  GROUP BY ss.id, ss.task_id, ss.title, ss.started_at
  ORDER BY ss.started_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
