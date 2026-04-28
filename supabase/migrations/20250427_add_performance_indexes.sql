-- ============================================================
-- Performance Indexes Migration
-- ============================================================
-- This migration adds indexes to improve query performance
-- for common database operations.

-- Speed up user queries on all tables
-- These indexes are used by every query that filters by user_id

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_sections_user_id ON sections(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_session_tasks_user_id ON session_tasks(user_id);

-- Speed up common filter operations
-- These indexes improve performance for frequently accessed columns

CREATE INDEX IF NOT EXISTS idx_tasks_section_id ON tasks(section_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority) WHERE priority IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at) WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_end_date ON events(end_time);
CREATE INDEX IF NOT EXISTS idx_events_import_batch ON events(import_batch_id) WHERE import_batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_study_sessions_start_time ON study_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_study_sessions_task_id ON study_sessions(task_id) WHERE task_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_session_tasks_session_id ON session_tasks(session_id);

-- Composite indexes for common query patterns
-- These indexes optimize queries that filter on multiple columns

CREATE INDEX IF NOT EXISTS idx_tasks_user_section ON tasks(user_id, section_id);
CREATE INDEX IF NOT EXISTS idx_events_user_date ON events(user_id, event_date);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_start ON study_sessions(user_id, start_time);

-- Indexes for import operations
-- Speed up import batch lookups

CREATE INDEX IF NOT EXISTS idx_import_groups_batch_id ON import_groups(batch_id);
CREATE INDEX IF NOT EXISTS idx_import_groups_user_id ON import_groups(user_id);

-- ============================================================
-- Performance Impact
-- ============================================================
-- These indexes will improve:
-- 1. Initial page load time (user_id queries)
-- 2. Calendar rendering (event date queries)
-- 3. Task filtering (section and priority queries)
-- 4. Import operations (batch_id lookups)
-- 5. Study session tracking (user and task queries)

-- Expected improvements:
-- - 50-80% faster initial data fetch
-- - Reduced database load during peak usage
-- - Faster calendar navigation and event loading
