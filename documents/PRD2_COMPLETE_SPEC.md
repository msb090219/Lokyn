# 🔧 Complete Technical Specification — Pomodoro & Study Tracking System

**Version:** 1.0
**Date:** 2025-01-17
**Status:** Ready for Implementation

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Database Schema](#database-schema)
3. [Pomodoro Page Specifications](#pomodoro-page-specifications)
4. [Stats Page Specifications](#stats-page-specifications)
5. [API & Backend Logic](#api--backend-logic)
6. [State Management](#state-management)
7. [UI/UX Patterns](#uiux-patterns)
8. [Edge Cases & Error Handling](#edge-cases--error-handling)
9. [Performance Considerations](#performance-considerations)
10. [Future-Proofing](#future-proofing)

---

## 1. Executive Summary

### Core Principle
**Two Independent Systems:**
- **System A (Existing):** Task Management — Locked, unchanged
- **System B (New):** Study Tracking — Behavioral layer with visual feedback

### Only Connection
```sql
study_sessions.task_id → tasks.id (optional, nullable)
```

### Key Features
1. **Pomodoro Page (`/focus`)** — Timer interface with focus mode
2. **Stats Page (`/stats`)** — Heatmap, streaks, session history
3. **Task Integration** — Optional task linking via dropdown
4. **Visual Feedback** — Glowing border on active tasks

---

## 2. Database Schema

### 2.1 New Tables

#### `study_sessions`
```sql
CREATE TABLE study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Indexes
CREATE INDEX idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_study_sessions_started_at ON study_sessions(started_at DESC);
CREATE INDEX idx_study_sessions_task_id ON study_sessions(task_id);

-- RLS Policies
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON study_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON study_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON study_sessions FOR DELETE
  USING (auth.uid() = user_id);
```

#### `user_stats`
```sql
CREATE TABLE user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stat_name TEXT NOT NULL,
  stat_value JSONB NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX idx_user_stats_stat_name ON user_stats(stat_name);

-- RLS Policies
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stats"
  ON user_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage user stats"
  ON user_stats FOR ALL
  USING (auth.uid() = user_id);
```

### 2.2 Modified Tables

#### `user_preferences` — Add timer settings
```sql
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS timer_settings JSONB DEFAULT '{"study_duration": 25, "break_duration": 5}'::jsonb;
```

### 2.3 Database Functions

#### Streak Calculation Function
```sql
CREATE OR REPLACE FUNCTION calculate_streak(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_current_streak INTEGER := 0;
  v_best_streak INTEGER := 0;
  v_last_study_date DATE := NULL;
  v_current_date DATE := CURRENT_DATE;
  v_min_threshold INTEGER := 5; -- 5 minutes minimum
BEGIN
  -- Get all study days with total duration >= 5 minutes
  WITH study_days AS (
    SELECT
      DATE_TRUNC('day', started_at AT TIME ZONE COALESCE(
        (SELECT value->>'timezone' FROM user_stats WHERE user_id = p_user_id AND stat_name = 'preferences'),
        'UTC'
      ))::DATE as study_date,
      SUM(duration_minutes) as total_minutes
    FROM study_sessions
    WHERE user_id = p_user_id
      AND type = 'study'
      AND completed_at IS NOT NULL
    GROUP BY 1
    HAVING SUM(duration_minutes) >= v_min_threshold
    ORDER BY 1 DESC
  )
  SELECT
    COUNT(*) FILTER (
      WHERE study_date = v_current_date - (ROW_NUMBER() OVER (ORDER BY study_date DESC) - 1)
    ) as current_streak,
    COUNT(*) as best_streak
  INTO v_current_streak, v_best_streak
  FROM study_days;

  RETURN jsonb_build_object(
    'current_streak', v_current_streak,
    'best_streak', v_best_streak,
    'last_updated', NOW()
  );
END;
$$ LANGUAGE plpgsql;
```

#### Heatmap Data Function
```sql
CREATE OR REPLACE FUNCTION get_heatmap_data(p_user_id UUID, p_days INTEGER := 365)
RETURNS TABLE(
  date DATE,
  total_minutes INTEGER,
  session_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('day', started_at AT TIME ZONE COALESCE(
      (SELECT value->>'timezone' FROM user_stats WHERE user_id = p_user_id AND stat_name = 'preferences'),
      'UTC'
    ))::DATE as date,
    SUM(duration_minutes)::INTEGER as total_minutes,
    COUNT(*)::INTEGER as session_count
  FROM study_sessions
  WHERE user_id = p_user_id
    AND type = 'study'
    AND completed_at IS NOT NULL
    AND started_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY 1
  ORDER BY 1;
END;
$$ LANGUAGE plpgsql;
```

### 2.4 Database Triggers

#### Stats Update Trigger (Delayed)
```sql
CREATE OR REPLACE FUNCTION update_user_stats_delayed()
RETURNS TRIGGER AS $$
BEGIN
  -- Schedule update after 2-3 seconds using pg_notify or background worker
  -- For now, update directly (implement delayed in application layer)
  PERFORM update_user_stats(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stats_after_session
  AFTER INSERT OR UPDATE OR DELETE ON study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_delayed();
```

#### Stats Update Function
```sql
CREATE OR REPLACE FUNCTION update_user_stats(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Update today's total
  INSERT INTO user_stats (user_id, stat_name, stat_value, last_updated)
  VALUES (
    p_user_id,
    'today_total',
    (SELECT jsonb_build_object('minutes', SUM(duration_minutes)::INTEGER, 'sessions', COUNT(*)::INTEGER)
     FROM study_sessions
     WHERE user_id = p_user_id
       AND type = 'study'
       AND completed_at IS NOT NULL
       AND DATE(started_at AT TIME ZONE COALESCE(
         (SELECT value->>'timezone' FROM user_stats WHERE user_id = p_user_id AND stat_name = 'preferences'),
         'UTC'
       )) = CURRENT_DATE),
    NOW()
  )
  ON CONFLICT (user_id, stat_name)
  DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = EXCLUDED.last_updated;

  -- Update streak
  INSERT INTO user_stats (user_id, stat_name, stat_value, last_updated)
  VALUES (p_user_id, 'streak', calculate_streak(p_user_id), NOW())
  ON CONFLICT (user_id, stat_name)
  DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = EXCLUDED.last_updated;

  -- Update week total
  INSERT INTO user_stats (user_id, stat_name, stat_value, last_updated)
  VALUES (
    p_user_id,
    'week_total',
    (SELECT jsonb_build_object('minutes', SUM(duration_minutes)::INTEGER, 'sessions', COUNT(*)::INTEGER)
     FROM study_sessions
     WHERE user_id = p_user_id
       AND type = 'study'
       AND completed_at IS NOT NULL
       AND started_at >= DATE_TRUNC('week', NOW())),
    NOW()
  )
  ON CONFLICT (user_id, stat_name)
  DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = EXCLUDED.last_updated;

  -- Update all-time total
  INSERT INTO user_stats (user_id, stat_name, stat_value, last_updated)
  VALUES (
    p_user_id,
    'all_time_total',
    (SELECT jsonb_build_object('minutes', SUM(duration_minutes)::INTEGER, 'sessions', COUNT(*)::INTEGER)
     FROM study_sessions
     WHERE user_id = p_user_id
       AND type = 'study'
       AND completed_at IS NOT NULL),
    NOW()
  )
  ON CONFLICT (user_id, stat_name)
  DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = EXCLUDED.last_updated;
END;
$$ LANGUAGE plpgsql;
```

---

## 3. Pomodoro Page Specifications

### 3.1 URL & Navigation
- **Route:** `/focus`
- **Nav Position:** Top-level navigation (Dashboard, Focus, Calendar, Stats, Settings)
- **Transition:** Standard routing, no special animation

### 3.2 Layout Structure (Mobile-First)

#### Default State (Timer Not Running)
```
┌─────────────────────────────────────┐
│ [Navigation]                        │
├─────────────────────────────────────┤
│                                     │
│         [Timer Toggle]              │
│    (25/5)    (50/10)    [Custom]    │
│                                     │
│                                     │
│     ┌─────────────────────────┐     │
│     │                         │     │
│     │    [Circular Progress]  │     │
│     │      [Digital Timer]     │     │
│     │        25:00            │     │
│     │                         │     │
│     └─────────────────────────┘     │
│                                     │
│                                     │
│    [Task Selector Dropdown]         │
│    "Select a task to link..."       │
│                                     │
│                                     │
│    Today: 2h 15m  |  Sessions: 5   │
│                                     │
│                                     │
│    [START] [PAUSE] [COMPLETE]       │
│                                     │
├─────────────────────────────────────┤
│ Recent Sessions (Last 3)            │
│ • Study Session - Jan 17 • 45m      │
│ • Task: Build feature • Jan 17 • 25m│
│ • Study Session - Jan 16 • 50m      │
└─────────────────────────────────────┘
```

#### Focus Mode (Timer Running + Idle 10s)
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│         [EXIT FOCUS MODE]           │
│                                     │
│                                     │
│     ┌─────────────────────────┐     │
│     │                         │     │
│     │    [Circular Progress]  │     │
│     │      [Digital Timer]     │     │
│     │        24:35            │     │
│     │                         │     │
│     │   Studying: Task Name   │     │
│     │   Elapsed: 0:25         │     │
│     │                         │     │
│     └─────────────────────────┘     │
│                                     │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

### 3.3 Component Specifications

#### Timer Display
- **Visual:** Combined circular progress ring + digital time
- **Update Rate:** Hybrid (every second during session, every minute when complete)
- **Circular Ring:**
  - Stroke color: User's accent color
  - Background: Very light gray (empty state)
  - Animates smoothly as time progresses
- **Digital Time:**
  - Font: Large, monospace variant
  - Format: MM:SS
  - Color: Foreground color

#### Timer Toggles
- **25/5 Toggle:** Sets study=25min, break=5min
- **50/10 Toggle:** Sets study=50min, break=10min
- **Custom Toggle:** Opens input fields for custom durations
- **Persistence:** Last selected duration saved to `user_preferences.timer_settings`

#### Task Selector
- **Type:** Dropdown with search
- **Options:** All tasks, ordered by section position
- **Default:** "Select a task to link..." (empty state)
- **Search:** Real-time filtering as user types
- **Selection:** Shows selected task name always visible during session

#### Control Buttons
- **Start:** Begins timer, transitions to focus mode after 10s idle
- **Pause:** Pauses timer, maintains state
- **Complete:** Finishes session, prompts for title, saves to DB

#### Session Completion Flow
1. Timer reaches 0:00
2. Show: "Add more time?" with buttons [+2 min] [+5 min] [+10 min] [Complete]
3. If user extends → timer continues
4. If user clicks Complete:
   - Inline prompt appears: "Session Name" [input field] [Save] [Skip]
   - If skip → Auto-generate: "Study Session [date] [time]"
   - If linked to task → "Task Name + [completed session]"
   - Save to DB → Show success toast → Reset timer

### 3.4 Focus Mode Behavior

#### Entry
- **Trigger:** 10 seconds of no mouse/keyboard activity
- **Transition:** Quick fade (200ms)
- **Hidden Elements:** Navigation, session history, stats, task selector
- **Visible Elements:** Timer, task name (if linked), elapsed time, exit button

#### Exit
- **Trigger:** Mouse movement, keyboard input, or click "Exit Focus Mode" button
- **Transition:** Quick fade (200ms)
- **Restored Elements:** All default state elements

### 3.5 Active Session State

#### Task Badge (on Dashboard)
- **Location:** Task card border
- **Style:** Glowing border using user's accent color
- **Animation:** Subtle pulse effect
- **Visibility:** Only when linked task has active session
- **Behavior:** Single active badge only (moves to new task if switched)

#### Multi-Tab Behavior
- **Master Tab:** Tab that started the session
- **Slave Tabs:** Show "Session active elsewhere" with link to master tab context
- **Blocking:** Cannot start new session if one already active

---

## 4. Stats Page Specifications

### 4.1 URL & Navigation
- **Route:** `/stats`
- **Nav Position:** Top-level navigation

### 4.2 Layout Structure
```
┌─────────────────────────────────────┐
│ [Navigation]                        │
├─────────────────────────────────────┤
│                                     │
│  🔥 Current Streak: 15   🏆 Best: 30│
│                                     │
│  📊 Today: 2h 15m  •  5 sessions    │
│  📅 This Week: 12h 30m • 23 sessions│
│  📈 All Time: 156h 45m • 342 sessions│
│                                     │
├─────────────────────────────────────┤
│         STUDY HEATMAP               │
│  Jan  Feb  Mar  Apr  May  Jun  ...  │
│   ↓    ↓    ↓    ↓    ↓    ↓        │
│  [7 squares × 12 months]            │
│  (GitHub-style layout)              │
│                                     │
│  Hover: "Jan 17 - 2h 15m (5 sessions)"│
├─────────────────────────────────────┤
│         SESSION HISTORY             │
│                                     │
│  ▼ Today, Jan 17                    │
│    • Study Session - 45m            │
│    • Task: Build feature - 25m      │
│    • Study Session - 30m            │
│                                     │
│  ▼ Yesterday, Jan 16                │
│    • Task: Review code - 1h 15m     │
│    • Study Session - 50m            │
│                                     │
│  [Load More Sessions]               │
└─────────────────────────────────────┘
```

### 4.3 Heatmap Specifications

#### Layout
- **Structure:** GitHub-style
  - 7 squares vertically (days of week)
  - 12 months horizontally
  - Small squares to fit screen
- **Labels:** Month names on x-axis

#### Color Scale (Blue Theme)
- **0 minutes:** Very light gray (`hsl(0 0% 15%)` in dark mode)
- **0-1 hours:** Very light blue (`hsl(var(--primary) / 0.25)`)
- **1-2 hours:** Light blue (`hsl(var(--primary) / 0.5)`)
- **2-4 hours:** Medium blue (`hsl(var(--primary) / 0.75)`)
- **4+ hours:** Navy blue (`hsl(var(--primary) / 1.0)`)

#### Data Source
- **Calculation:** On-demand via `get_heatmap_data()` DB function
- **Grouping:** By local calendar day (user's timezone)
- **Duration:** Last 365 days rolling window

#### Interaction
- **Hover:** Show tooltip with date, total time, session count
- **Click:** No action (informational only)

### 4.4 Streak Display

#### Format
- **Primary:** Current streak (large number)
- **Secondary:** Best streak (smaller, with trophy icon)
- **Example:** "🔥 Current Streak: 15   🏆 Best: 30"

#### Calculation Rules
- **Study Day:** At least 5 minutes of study time
- **Consecutive:** Calendar days in local timezone
- **Break:** Any day with < 5 minutes resets streak
- **Start Day:** Day when session started (11 PM - 1 AM = start day)
- **No Recovery:** Strict (no streak freeze, no recovery)

### 4.5 Session History

#### Grouping
- **By:** Day (collapsible)
- **Header:** "Today, Jan 17" or "Yesterday, Jan 16"
- **Content:** List of sessions for that day
- **Interaction:** Click to expand/collapse

#### Session Item Display
- **Format:** "Task Name - duration" OR "Study Session [date] [time] - duration"
- **Duration:** Always in minutes ("45m", "1h 15m")
- **Actions:** Right-click/context menu for delete

#### Pagination
- **Initial Load:** 50 sessions
- **Load More:** Button at bottom
- **Ordering:** Most recent first

### 4.6 Time Metrics

#### Display
- **Today:** Total time + session count
- **This Week:** Total time + session count
- **All Time:** Total time + session count

#### Format
- "Today: 2h 15m • 5 sessions"
- "This Week: 12h 30m • 23 sessions"
- "All Time: 156h 45m • 342 sessions"

---

## 5. API & Backend Logic

### 5.1 Supabase API Functions

#### Start Session
```typescript
async function startSession(data: {
  userId: string;
  taskId?: string;
  title: string;
  durationMinutes: number;
  type: 'study' | 'break';
}): Promise<Session> {
  // Insert session record (no completed_at)
  const { data: session, error } = await supabase
    .from('study_sessions')
    .insert({
      user_id: data.userId,
      task_id: data.taskId || null,
      title: data.title,
      duration_minutes: data.durationMinutes,
      started_at: new Date().toISOString(),
      type: data.type,
      completed_at: null
    })
    .select()
    .single();

  return session;
}
```

#### Complete Session
```typescript
async function completeSession(sessionId: string): Promise<Session> {
  // Update with completed_at
  const { data: session, error } = await supabase
    .from('study_sessions')
    .update({
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId)
    .select()
    .single();

  // Trigger stats update (delayed 2-3 seconds)
  setTimeout(() => {
    updateStats(session.user_id);
  }, 2500);

  return session;
}
```

#### Get Stats
```typescript
async function getUserStats(userId: string): Promise<UserStats> {
  // Fetch pre-aggregated stats
  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId);

  return {
    today: stats.find(s => s.stat_name === 'today_total')?.value || { minutes: 0, sessions: 0 },
    week: stats.find(s => s.stat_name === 'week_total')?.value || { minutes: 0, sessions: 0 },
    allTime: stats.find(s => s.stat_name === 'all_time_total')?.value || { minutes: 0, sessions: 0 },
    streak: stats.find(s => s.stat_name === 'streak')?.value || { current_streak: 0, best_streak: 0 }
  };
}
```

#### Get Heatmap Data
```typescript
async function getHeatmapData(userId: string, days: number = 365): Promise<HeatmapDay[]> {
  const { data } = await supabase.rpc('get_heatmap_data', {
    p_user_id: userId,
    p_days: days
  });

  return data;
}
```

#### Get Session History
```typescript
async function getSessionHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Session[]> {
  const { data } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return data;
}
```

### 5.2 Data Flow Diagrams

#### Session Creation Flow
```
User clicks "Start"
    ↓
Validate form (task selection optional)
    ↓
Start Session API → Insert study_sessions row
    ↓
Update local state (timer running)
    ↓
[10s idle] → Enter focus mode
    ↓
Timer runs (updates every second)
    ↓
User clicks "Complete" OR timer reaches 0:00
    ↓
Show "Add more time?" prompt
    ↓
[If complete] → Prompt for session title (inline)
    ↓
Complete Session API → Update study_sessions.completed_at
    ↓
[2-3s delay] → Update user_stats table
    ↓
Show success toast
    ↓
Reset timer UI
```

#### Stats Update Flow
```
Session completed
    ↓
Trigger: study_sessions INSERT/UPDATE
    ↓
[2-3 seconds delay]
    ↓
Execute: update_user_stats(user_id)
    ↓
Calculate today's total
    ↓
Calculate week total
    ↓
Calculate all-time total
    ↓
Calculate streak (via calculate_streak function)
    ↓
Insert/Update user_stats table
    ↓
Clients poll/subscribe for updates
    ↓
UI updates (Stats page, Pomodoro micro-stats)
```

---

## 6. State Management

### 6.1 Client State Structure

```typescript
interface PomodoroState {
  // Timer state
  timer: {
    isRunning: boolean;
    isPaused: boolean;
    remainingSeconds: number;
    totalSeconds: number;
    type: 'study' | 'break';
    startedAt: Date | null;
  };

  // Current session
  currentSession: {
    id: string | null;
    taskId: string | null;
    title: string;
    durationMinutes: number;
  } | null;

  // User preferences
  preferences: {
    studyDuration: number;
    breakDuration: number;
    selectedTaskId: string | null;
  };

  // UI state
  ui: {
    focusMode: boolean;
    idleTimer: number | null;
    showTitlePrompt: boolean;
  };
}

interface StatsState {
  // Aggregated stats
  stats: {
    today: { minutes: number; sessions: number };
    week: { minutes: number; sessions: number };
    allTime: { minutes: number; sessions: number };
    streak: { current_streak: number; best_streak: number };
  };

  // Heatmap data
  heatmap: HeatmapDay[];

  // Session history
  sessions: Session[];
  hasMore: boolean;
  loading: boolean;
}
```

### 6.2 State Persistence

#### localStorage (Client-Side Only)
- **Active session state:** Survives page refresh within same session
- **Timer preferences:** Study/break duration last used
- **UI state:** Focus mode preference, collapse states

#### NOT in localStorage
- Session data (saved to DB only)
- User statistics (from user_stats table)
- Cross-device state

### 6.3 Cross-Tab Communication

```typescript
// Using BroadcastChannel API
const sessionChannel = new BroadcastChannel('study_session');

// Master tab (session starter)
sessionChannel.postMessage({
  type: 'SESSION_STARTED',
  sessionId: currentSession.id,
  taskId: currentSession.taskId
});

// Slave tabs
sessionChannel.onmessage = (event) => {
  if (event.data.type === 'SESSION_STARTED') {
    // Show "Session active elsewhere" message
    setSessionState({
      isActive: true,
      masterSessionId: event.data.sessionId
    });
  }
};
```

---

## 7. UI/UX Patterns

### 7.1 Color System

#### Theme Integration
- Use existing CSS custom properties
- Primary color: `hsl(var(--primary))`
- Adapt to dark/light mode automatically

#### Heatmap Colors (Dark Mode)
```css
--heatmap-0: hsl(0 0% 15%);              /* No sessions */
--heatmap-1: hsl(var(--primary) / 0.25); /* 0-1 hours */
--heatmap-2: hsl(var(--primary) / 0.5);  /* 1-2 hours */
--heatmap-3: hsl(var(--primary) / 0.75); /* 2-4 hours */
--heatmap-4: hsl(var(--primary) / 1.0);  /* 4+ hours */
```

### 7.2 Typography

#### Timer Display
- **Font:** Monospace variant (for consistent digit width)
- **Size:** Mobile: 4rem, Desktop: 6rem
- **Weight:** 600 (semi-bold)

#### Stats & Labels
- **Font:** System sans-serif
- **Hierarchy:**
  - Streak numbers: 2rem
  - Section headers: 1.25rem
  - Body text: 0.875rem

### 7.3 Spacing & Layout

#### Mobile-First Breakpoints
```css
/* Mobile (default) */
.timer-container { max-width: 100%; padding: 1rem; }

/* Tablet */
@media (min-width: 768px) {
  .timer-container { max-width: 600px; }
}

/* Desktop */
@media (min-width: 1024px) {
  .timer-container { max-width: 800px; }
}
```

#### Focus Mode
- **Padding:** Center timer vertically and horizontally
- **Exit Button:** Top-right corner, subtle
- **Z-Index:** Overlay on top of all content

### 7.4 Animation Timing

#### Focus Mode Transition
```css
.focus-mode-enter {
  animation: fadeIn 200ms ease-out;
}

.focus-mode-exit {
  animation: fadeOut 200ms ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

#### Timer Update
- **Circular Progress:** CSS transition (1s linear)
- **Digital Display:** React state update (every second)

#### Glowing Border (Active Task)
```css
.task-card.active-task {
  border: 2px solid hsl(var(--primary));
  box-shadow: 0 0 10px hsl(var(--primary) / 0.5);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 10px hsl(var(--primary) / 0.5); }
  50% { box-shadow: 0 0 20px hsl(var(--primary) / 0.8); }
}
```

### 7.5 Responsive Design

#### Mobile (< 768px)
- Timer dominates screen
- Stats below timer (minimal)
- Session history: Load more button
- Heatmap: Horizontal scroll

#### Tablet (768px - 1024px)
- Timer + stats side by side
- Heatmap fits width
- Session history: 2 columns

#### Desktop (> 1024px)
- Centered layout (max-width: 800px)
- Generous whitespace
- Hover interactions on heatmap

---

## 8. Edge Cases & Error Handling

### 8.1 Network Failures

#### Session Completion
- **Strategy:** Fail fast
- **Behavior:**
  - Show error toast
  - Keep session in local state (not saved)
  - User can retry or discard

#### Stats Loading
- **Strategy:** Graceful degradation
- **Behavior:**
  - Show cached stats if available
  - Show "Unable to load stats" message
  - Retry button available

### 8.2 Concurrent Sessions

#### Detection
```typescript
// On session start, check for active sessions
const { data: activeSession } = await supabase
  .from('study_sessions')
  .select('*')
  .eq('user_id', userId)
  .is('completed_at', null)
  .single();

if (activeSession) {
  // Show error: "Session already active"
  return;
}
```

#### Blocking
- **UI:** Disable "Start" button if session active
- **Message:** "Complete current session first"

### 8.3 Browser Closing

#### Mid-Session Recovery
- **Strategy:** Local state until complete
- **Behavior:**
  - Session stored in localStorage (startedAt, taskId, etc.)
  - On page load, check for active session
  - Show "Resume session?" modal
  - Options: Resume, Discard

#### Implementation
```typescript
// On mount
useEffect(() => {
  const savedSession = localStorage.getItem('activeSession');
  if (savedSession) {
    const session = JSON.parse(savedSession);
    if (confirm('Resume previous session?')) {
      resumeSession(session);
    } else {
      localStorage.removeItem('activeSession');
    }
  }
}, []);
```

### 8.4 Timezone Handling

#### User Timezone Detection
```typescript
// Get user timezone
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

// Save to preferences
await supabase
  .from('user_stats')
  .upsert({
    user_id: userId,
    stat_name: 'preferences',
    stat_value: { timezone: userTimezone }
  });
```

#### Streak Calculation
- **Rule:** Use user's local timezone
- **Example:** 11 PM - 1 AM session = counts toward start day

### 8.5 Data Validation

#### Session Title
- **Required:** Yes (prompt at completion)
- **Length:** 1-100 characters
- **Default:** "Study Session [date] [time]" if skipped

#### Duration
- **Minimum:** 1 minute
- **Maximum:** 8 hours (28,480 seconds)
- **Validation:** Client-side + server-side

#### Task Linking
- **Optional:** Yes
- **Validation:** Task must belong to user
- **Behavior:** Null if task deleted

---

## 9. Performance Considerations

### 9.1 Database Optimization

#### Indexes
```sql
-- Core queries
CREATE INDEX idx_study_sessions_user_completed ON study_sessions(user_id, completed_at);
CREATE INDEX idx_study_sessions_user_type_started ON study_sessions(user_id, type, started_at DESC);

-- Heatmap queries
CREATE INDEX idx_study_sessions_user_started_date ON study_sessions(
  user_id,
  DATE_TRUNC('day', started_at AT TIME ZONE 'UTC')
);
```

#### Query Optimization
- **Heatmap:** Use DB function for pre-aggregation
- **Stats:** Pre-calculated in user_stats table
- **History:** Pagination with limit/offset

### 9.2 Client Performance

#### Timer Updates
- **Rate:** Every second (active), every minute (complete)
- **Impact:** Minimal re-renders
- **Optimization:** Use `useRef` for timer interval

#### Heatmap Rendering
- **Initial Load:** Calculate 365 days server-side
- **Rendering:** Virtual DOM for 365 squares
- **Hover:** Show cached data (no query)

#### Session History
- **Initial Load:** 50 sessions
- **Pagination:** Load 50 more on demand
- **Caching:** Store in React state

### 9.3 Network Optimization

#### Stats Updates
- **Trigger:** After session completion
- **Delay:** 2-3 seconds (debounce multiple operations)
- **Method:** DB triggers (automatic)

#### Realtime Updates
- **Phase 1:** Polling every 30 seconds
- **Phase 2:** Supabase Realtime (future)

#### Data Export
- **Format:** CSV only
- **Generation:** Server-side
- **Download:** Direct file link

---

## 10. Future-Proofing

### 10.1 Phase 2 Features (Not in v1)

#### Task Analytics
- Time spent per task
- Task completion correlation with sessions
- Most productive tasks by time invested

#### Advanced Stats
- Productivity by hour of day
- Day-of-week patterns
- Session length distribution

#### Social Features
- Shareable streak badges
- Anonymous leaderboard (opt-in)
- Study group challenges

### 10.2 Mobile App Considerations

#### Flutter App
- **API:** Same Supabase backend
- **Authentication:** Shared auth tokens
- **Data:** Complete sync via API

#### Web vs Mobile Features
- **Web:** Full feature set
- **Mobile v1:** Timer + basic stats
- **Mobile v2:** Full parity + offline support

### 10.3 Data Retention Policy

#### Aggregation Strategy
- **< 1 year:** Individual sessions
- **> 1 year:** Aggregate to daily totals
- **Implementation:** Scheduled job (monthly)

#### Migration SQL
```sql
-- Archive old sessions
CREATE TABLE archived_sessions AS
SELECT
  DATE_TRUNC('day', started_at) as date,
  user_id,
  type,
  SUM(duration_minutes) as total_minutes,
  COUNT(*) as session_count
FROM study_sessions
WHERE started_at < NOW() - INTERVAL '1 year'
GROUP BY 1, 2, 3;

-- Delete archived
DELETE FROM study_sessions
WHERE started_at < NOW() - INTERVAL '1 year';
```

### 10.4 Scalability Considerations

#### User Growth
- **Current:** Supabase free tier (500MB DB)
- **Projections:** 1000 users × 365 days × 5 sessions/day = ~1.8M rows
- **Solution:** Implement aggregation before 1M rows

#### Query Performance
- **Current:** < 100ms for heatmap
- **Target:** < 200ms with 1M+ rows
- **Solution:** Materialized views for historical data

---

## 11. Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create database migrations (study_sessions, user_stats)
- [ ] Set up RLS policies
- [ ] Create DB functions (streak, heatmap)
- [ ] Set up DB triggers (stats update)
- [ ] Add timer_settings to user_preferences

### Phase 2: Pomodoro Page
- [ ] Build timer UI (circular + digital)
- [ ] Implement timer logic (start, pause, complete)
- [ ] Add task selector dropdown
- [ ] Build focus mode (idle detection, transition)
- [ ] Create session completion flow
- [ ] Implement "add more time" feature
- [ ] Add title prompt (inline)
- [ ] Store timer preferences

### Phase 3: Stats Page
- [ ] Build heatmap component (GitHub-style)
- [ ] Implement color scale (blue theme)
- [ ] Add streak display (current + best)
- [ ] Create time metrics section
- [ ] Build session history (grouped by day)
- [ ] Add pagination (load more)
- [ ] Implement hover tooltips

### Phase 4: Integration
- [ ] Add active task badge (glowing border)
- [ ] Implement multi-tab blocking
- [ ] Create Stats page route
- [ ] Update navigation
- [ ] Add micro-stats to Pomodoro page
- [ ] Implement cross-tab communication

### Phase 5: Polish
- [ ] Add error handling
- [ ] Implement loading states
- [ ] Add success toasts
- [ ] Test responsive design
- [ ] Performance optimization
- [ ] Edge case handling

---

## 12. Success Metrics

### User Engagement
- **Daily Active Users:** % of users who complete ≥1 session/day
- **Streak Retention:** % of users with 7+ day streaks
- **Session Frequency:** Avg sessions per user per day

### Feature Usage
- **Task Linking:** % of sessions linked to tasks
- **Focus Mode:** % of sessions using focus mode
- **Stats Viewing:** Avg visits to Stats page per week

### Performance
- **Timer Accuracy:** < 1s deviation over 1 hour
- **Page Load:** Stats page < 2s initial load
- **Heatmap Render:** < 500ms for 365 days

---

## 13. Appendix

### 13.1 Color Palette Reference

#### Blue Theme (Navy Progression)
```
Level 0 (0 min):    #1a1a1a (very light gray)
Level 1 (0-1h):     #3b82f6 (very light blue)
Level 2 (1-2h):     #2563eb (light blue)
Level 3 (2-4h):     #1d4ed8 (medium blue)
Level 4 (4h+):      #1e3a8a (navy blue)
```

### 13.2 Timer Duration Reference

#### Presets
- **Pomodoro Classic:** 25 min study, 5 min break
- **Extended Focus:** 50 min study, 10 min break
- **Custom:** User-defined (saved per user)

#### Quick Add Buttons (on Complete)
- +2 minutes
- +5 minutes
- +10 minutes

### 13.3 Data Export Format

#### CSV Structure
```csv
date,task,duration_minutes,type,started_at,completed_at
2025-01-17,"Build feature",45,study,2025-01-17T10:00:00Z,2025-01-17T10:45:00Z
2025-01-17,"Study Session",30,study,2025-01-17T14:00:00Z,2025-01-17T14:30:00Z
```

---

**End of Specification**
