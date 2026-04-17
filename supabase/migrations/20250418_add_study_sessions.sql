-- ============================================================================
-- Study Sessions & User Stats Migration
-- Adds Pomodoro/study tracking functionality with statistics
-- ============================================================================

-- Study Sessions table
-- Core table for tracking study/break sessions
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Study Session',
  duration_minutes INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  type TEXT NOT NULL CHECK (type IN ('study', 'break')) DEFAULT 'study',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Stats table
-- Pre-aggregated statistics for performance optimization
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stat_name TEXT NOT NULL,
  stat_value JSONB NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_sessions
CREATE POLICY "Users can view own study sessions"
  ON study_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study sessions"
  ON study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study sessions"
  ON study_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study sessions"
  ON study_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for user_stats
CREATE POLICY "Users can view own stats"
  ON user_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON user_stats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stats"
  ON user_stats FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Study sessions indexes
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_task_id ON study_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_started_at ON study_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_started ON study_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_sessions_type ON study_sessions(user_id, type);

-- User stats indexes
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_stat_name ON user_stats(stat_name);

-- ============================================================================
-- Database Functions
-- ============================================================================

-- Function: Calculate Streak
-- Calculates current and best streak based on completed study sessions
-- Minimum threshold: 5 minutes per session
CREATE OR REPLACE FUNCTION calculate_streak(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_current_streak INTEGER := 0;
  v_best_streak INTEGER := 0;
  v_last_session_date DATE;
  v_current_date DATE := CURRENT_DATE;
  v_min_threshold INTEGER := 5; -- 5 minutes minimum
BEGIN
  -- Find the most recent session date
  SELECT DATE(started_at) INTO v_last_session_date
  FROM study_sessions
  WHERE user_id = p_user_id
    AND type = 'study'
    AND completed_at IS NOT NULL
    AND duration_minutes >= v_min_threshold
  ORDER BY started_at DESC
  LIMIT 1;

  -- If no sessions, return zeros
  IF v_last_session_date IS NULL THEN
    RETURN jsonb_build_object(
      'current_streak', 0,
      'best_streak', 0,
      'last_study_date', NULL,
      'last_updated', NOW()
    );
  END IF;

  -- Calculate current streak
  -- Start from most recent date and work backwards
  FOR v_current_date IN
    SELECT DISTINCT DATE(started_at)
    FROM study_sessions
    WHERE user_id = p_user_id
      AND type = 'study'
      AND completed_at IS NOT NULL
      AND duration_minutes >= v_min_threshold
      AND DATE(started_at) <= v_last_session_date
    ORDER BY DATE(started_at) DESC
  LOOP
    -- If this is the first iteration or consecutive day
    IF v_last_session_date IS NULL OR v_current_date = v_last_session_date THEN
      IF v_current_date = v_last_session_date THEN
        v_current_streak := v_current_streak + 1;
        v_last_session_date := v_current_date - INTERVAL '1 day';
      END IF;
    ELSE
      -- Gap found, end of streak
      EXIT;
    END IF;
  END LOOP;

  -- Calculate best streak (all-time)
  SELECT COALESCE(MAX(streak_length), 0) INTO v_best_streak
  FROM (
    SELECT COUNT(*) as streak_length
    FROM (
      SELECT
        DATE(started_at) as study_date,
        DATE(started_at) - (ROW_NUMBER() OVER (ORDER BY DATE(started_at))) * INTERVAL '1 day' as grp
      FROM study_sessions
      WHERE user_id = p_user_id
        AND type = 'study'
        AND completed_at IS NOT NULL
        AND duration_minutes >= v_min_threshold
      GROUP BY DATE(started_at)
    ) grouped_dates
    GROUP BY grp
  ) streaks;

  -- Update best streak if current is higher
  IF v_current_streak > v_best_streak THEN
    v_best_streak := v_current_streak;
  END IF;

  RETURN jsonb_build_object(
    'current_streak', v_current_streak,
    'best_streak', v_best_streak,
    'last_study_date', v_last_session_date,
    'last_updated', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Function: Get Heatmap Data
-- Returns daily study totals for the last 365 days
CREATE OR REPLACE FUNCTION get_heatmap_data(p_user_id UUID)
RETURNS TABLE (
  study_date DATE,
  total_minutes INTEGER,
  session_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(ss.started_at) as study_date,
    SUM(ss.duration_minutes)::INTEGER as total_minutes,
    COUNT(*)::INTEGER as session_count
  FROM study_sessions ss
  WHERE ss.user_id = p_user_id
    AND ss.type = 'study'
    AND ss.completed_at IS NOT NULL
    AND ss.started_at >= NOW() - INTERVAL '365 days'
  GROUP BY DATE(ss.started_at)
  ORDER BY study_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Update User Stats
-- Updates or creates user stats with delayed aggregation
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_streak_data JSONB;
  v_time_data JSONB;
BEGIN
  -- Only update for completed sessions
  IF NEW.completed_at IS NOT NULL AND (OLD.completed_at IS NULL OR OLD.completed_at IS NULL) THEN
    -- Update streak data
    SELECT calculate_streak(NEW.user_id) INTO v_streak_data;

    -- Upsert streak stats
    INSERT INTO user_stats (user_id, stat_name, stat_value, last_updated)
    VALUES (NEW.user_id, 'streak', v_streak_data, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET
      stat_value = v_streak_data,
      last_updated = NOW();

    -- Update time metrics (today, this week, total)
    SELECT jsonb_build_object(
      'today_minutes', (
        SELECT COALESCE(SUM(duration_minutes), 0)::INTEGER
        FROM study_sessions
        WHERE user_id = NEW.user_id
          AND type = 'study'
          AND completed_at IS NOT NULL
          AND DATE(started_at) = CURRENT_DATE
      ),
      'week_minutes', (
        SELECT COALESCE(SUM(duration_minutes), 0)::INTEGER
        FROM study_sessions
        WHERE user_id = NEW.user_id
          AND type = 'study'
          AND completed_at IS NOT NULL
          AND DATE(started_at) >= DATE_TRUNC('week', CURRENT_DATE)
      ),
      'total_minutes', (
        SELECT COALESCE(SUM(duration_minutes), 0)::INTEGER
        FROM study_sessions
        WHERE user_id = NEW.user_id
          AND type = 'study'
          AND completed_at IS NOT NULL
      ),
      'total_sessions', (
        SELECT COUNT(*)::INTEGER
        FROM study_sessions
        WHERE user_id = NEW.user_id
          AND type = 'study'
          AND completed_at IS NOT NULL
      ),
      'last_updated', NOW()
    ) INTO v_time_data;

    -- Upsert time stats
    INSERT INTO user_stats (user_id, stat_name, stat_value, last_updated)
    VALUES (NEW.user_id, 'time_metrics', v_time_data, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET
      stat_value = v_time_data,
      last_updated = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger for updated_at on study_sessions
DROP TRIGGER IF EXISTS update_study_sessions_updated_at ON study_sessions;
CREATE TRIGGER update_study_sessions_updated_at
  BEFORE UPDATE ON study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for automatic stats updates (delayed via pg_deferred_statements if available)
-- Note: This runs immediately, but we can add pg_deferred_statements later for true delayed updates
DROP TRIGGER IF EXISTS trigger_update_user_stats ON study_sessions;
CREATE TRIGGER trigger_update_user_stats
  AFTER INSERT OR UPDATE ON study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats();

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function: Get active session for user
CREATE OR REPLACE FUNCTION get_active_session(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  task_id UUID,
  title TEXT,
  started_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ss.id,
    ss.task_id,
    ss.title,
    ss.started_at
  FROM study_sessions ss
  WHERE ss.user_id = p_user_id
    AND ss.completed_at IS NULL
  ORDER BY ss.started_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
