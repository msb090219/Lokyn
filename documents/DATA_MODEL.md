# Data Model Specification
## Simple Student Dashboard

**Version:** 2.0
**Status:** Active
**Database:** Supabase PostgreSQL
**Last Updated:** 2025-03-14

---

## Overview

This document defines the complete data model for the Simple Student Dashboard application. All tables use Row-Level Security (RLS) to ensure user data isolation.

---

## Entity Relationship Diagram

```
┌─────────────────┐
│  auth.users     │
│  (Supabase)     │
└────────┬────────┘
         │
         ├──┬──────────────────────┬──────────────────┬─────────────────┐
         │  │                      │                  │                 │
         ▼  ▼                      ▼                  ▼                 ▼
    ┌─────────┐              ┌─────────┐        ┌─────────┐     ┌─────────────┐
    │sections│◄─────────────│ tasks   │        │ events  │     │api_keys     │
    └─────────┘              └─────────┘        └─────────┘     └─────────────┘
                                                    │                         │
                                                    ▼                         ▼
                                              ┌─────────────┐           ┌─────────────┐
                                              │user_preferences│        │  (external)  │
                                              └─────────────┘           │  nullclaw    │
                                                                      └─────────────┘
```

---

## Table Definitions

### 1. sections

**Purpose:** Organizational containers for tasks (e.g., "To Do Today", "Backlog")

**Schema:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `user_id` | UUID | NOT NULL, FK → auth.users | Owner |
| `column_id` | TEXT | NOT NULL, CHECK IN ('col-today', 'col-backlog') | Column assignment |
| `title` | TEXT | NOT NULL | Section name |
| `collapsed` | BOOLEAN | DEFAULT FALSE | UI state |
| `position` | INTEGER | NOT NULL | Sort order |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**Indexes:**
- `sections_user_id_idx` on `user_id`
- `sections_column_id_idx` on `column_id`
- `sections_position_idx` on `position`

**Constraints:**
- Each user can have multiple sections per column
- Section titles must be unique within a column per user
- Position values must be unique within a column

---

### 2. tasks

**Purpose:** Individual task items within sections

**Schema:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `user_id` | UUID | NOT NULL, FK → auth.users | Owner |
| `section_id` | UUID | NOT NULL, FK → sections(id) | Parent section |
| `text` | TEXT | NOT NULL | Task description |
| `completed` | BOOLEAN | DEFAULT FALSE | Completion state |
| `position` | INTEGER | NOT NULL | Sort order |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**Indexes:**
- `tasks_user_id_idx` on `user_id`
- `tasks_section_id_idx` on `section_id`
- `tasks_completed_idx` on `completed`
- `tasks_position_idx` on `position`

**Constraints:**
- Every task must belong to a valid section
- Position values must be unique within a section
- Tasks are automatically deleted when parent section is deleted (CASCADE)

**Validation Rules:**
- `text`: 1-500 characters
- `position`: ≥ 0

---

### 3. events

**Purpose:** Calendar events (separate from tasks)

**Schema:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `user_id` | UUID | NOT NULL, FK → auth.users | Owner |
| `title` | TEXT | NOT NULL, CHECK (length(title) ≤ 200) | Event name |
| `description` | TEXT | NULLABLE | Event details |
| `event_date` | TIMESTAMPTZ | NOT NULL | Event start time |
| `duration_minutes` | INTEGER | DEFAULT 60 | Duration |
| `color` | TEXT | DEFAULT 'blue' | Display color |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**Indexes:**
- `events_user_id_idx` on `user_id`
- `events_event_date_idx` on `event_date`

**Constraints:**
- `color`: Must be one of 'blue', 'red', 'green', 'yellow', 'purple'
- `duration_minutes`: Must be ≥ 15 and ≤ 480 (8 hours)

---

### 4. api_keys

**Purpose:** Authentication keys for nullclaw AI integration

**Schema:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `user_id` | UUID | NOT NULL, FK → auth.users | Owner |
| `key_hash` | TEXT | NOT NULL, UNIQUE | SHA-256 hash of API key |
| `name` | TEXT | NULLABLE | Key label (e.g., "nullclaw bot") |
| `last_used_at` | TIMESTAMPTZ | NULLABLE | Last API access |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `revoked_at` | TIMESTAMPTZ | NULLABLE | Revocation timestamp |

**Indexes:**
- `api_keys_user_id_idx` on `user_id`
- `api_keys_key_hash_idx` on `key_hash` (UNIQUE)

**Constraints:**
- Each user can have maximum 10 active keys
- Revoked keys cannot be used for authentication
- Keys are SHA-256 hashed before storage

**API Key Format:**
```
Prefix: mdl_
Format: mdl_{32-character-hex}
Example: mdl_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

### 5. user_preferences

**Purpose:** User-specific application settings

**Schema:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | UUID | PRIMARY KEY, FK → auth.users | Owner |
| `theme` | TEXT | CHECK (theme IN ('light', 'dark')) | UI theme preference |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**Constraints:**
- One row per user (enforced by PRIMARY KEY)
- Default theme: 'light'

---

## Row-Level Security Policies

### Policy Definitions

**sections:**
```sql
-- Users can view their own sections
CREATE POLICY "Users can view own sections"
  ON sections FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own sections
CREATE POLICY "Users can insert own sections"
  ON sections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sections
CREATE POLICY "Users can update own sections"
  ON sections FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own sections
CREATE POLICY "Users can delete own sections"
  ON sections FOR DELETE
  USING (auth.uid() = user_id);
```

**tasks:**
```sql
-- Similar RLS policies for tasks
-- All policies enforce: auth.uid() = user_id
```

**events:**
```sql
-- Similar RLS policies for events
-- All policies enforce: auth.uid() = user_id
```

**api_keys:**
```sql
-- Similar RLS policies for api_keys
-- All policies enforce: auth.uid() = user_id
-- Additional: Revoked keys (revoked_at IS NOT NULL) cannot be accessed
```

**user_preferences:**
```sql
-- Similar RLS policies for user_preferences
-- All policies enforce: auth.uid() = user_id
```

---

## Data Operations

### Section Operations

**Create Section:**
```sql
INSERT INTO sections (user_id, column_id, title, position)
VALUES ($1, $2, $3, $4);
```

**Update Section:**
```sql
UPDATE sections
SET title = $2, collapsed = $3, updated_at = NOW()
WHERE id = $1 AND user_id = auth.uid();
```

**Delete Section:**
```sql
DELETE FROM sections
WHERE id = $1 AND user_id = auth.uid();
-- Tasks cascade delete automatically
```

---

### Task Operations

**Create Task:**
```sql
INSERT INTO tasks (user_id, section_id, text, position)
VALUES ($1, $2, $3, $4);
```

**Update Task:**
```sql
UPDATE tasks
SET text = $2, completed = $3, updated_at = NOW()
WHERE id = $1 AND user_id = auth.uid();
```

**Delete Task:**
```sql
DELETE FROM tasks
WHERE id = $1 AND user_id = auth.uid();
```

**Move Task:**
```sql
UPDATE tasks
SET section_id = $2, position = $3, updated_at = NOW()
WHERE id = $1 AND user_id = auth.uid();
```

---

### Event Operations

**Create Event:**
```sql
INSERT INTO events (user_id, title, event_date, duration_minutes, color)
VALUES ($1, $2, $3, $4, $5);
```

**Update Event:**
```sql
UPDATE events
SET title = $2, event_date = $3, duration_minutes = $4, updated_at = NOW()
WHERE id = $1 AND user_id = auth.uid();
```

**Delete Event:**
```sql
DELETE FROM events
WHERE id = $1 AND user_id = auth.uid();
```

**Batch Insert (Import):**
```sql
INSERT INTO events (user_id, title, event_date, duration_minutes, color, description)
VALUES
  ($1, $2, $3, $4, $5, $6),
  ($1, $7, $8, $9, $10, $11),
  -- ... more events
ON CONFLICT (user_id, title, event_date) DO NOTHING;
```

---

### Calendar Import/Export

**Import (.ics file):**
- Parse iCalendar format using `ics-to-json` library
- Convert to event objects
- Batch insert with deduplication (on user_id + title + event_date)
- Preserve event properties: title, description, event_date, duration

**Export (.ics file):**
- Fetch all user events
- Convert to iCalendar format using `ical-generator` library
- Generate RFC 5545 compliant .ics file
- Trigger browser download

**iCalendar Format:**
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Simple Student Dashboard//EN
BEGIN:VEVENT
UID:event-id-123@example.com
DTSTART:20250320T140000Z
DTEND:20250320T150000Z
SUMMARY:Math Exam
DESCRIPTION:Chapter 5-7
END:VEVENT
END:VCALENDAR
```

---

### API Key Operations

**Generate API Key:**
```sql
-- Generate key in application code
-- Hash before storing
INSERT INTO api_keys (user_id, key_hash, name)
VALUES ($1, $2, $3);
```

**Validate API Key:**
```sql
SELECT id, user_id
FROM api_keys
WHERE key_hash = $1
  AND revoked_at IS NULL
  AND user_id = $2;
```

**Revoke API Key:**
```sql
UPDATE api_keys
SET revoked_at = NOW()
WHERE id = $1 AND user_id = auth.uid();
```

---

## Data Integrity

### Cascading Deletes

| Parent Table | Child Table | On Delete Action |
|--------------|-------------|------------------|
| `auth.users` | All tables | CASCADE (user deletion) |
| `sections` | `tasks` | CASCADE (section deletion) |

### Triggers

**Updated Timestamp Trigger:**
```sql
CREATE TRIGGER update_sections_updated_at
  BEFORE UPDATE ON sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Migration History

| Version | Date | Description |
|---------|------|-------------|
| 1.0 | 2025-03-13 | Initial schema (sections, tasks, user_preferences) |
| 2.0 | 2025-03-14 | Added events table for calendar |
| 2.1 | 2025-03-14 | Added api_keys table for nullclaw integration |

---

## Performance Considerations

**Query Optimization:**
- All user queries include `user_id` filter (uses indexes)
- Position-based ordering uses integer indexes
- Event date queries use `event_date` index

**Connection Pooling:**
- Supabase provides connection pooling
- Recommended pool size: 10-20 connections

**Backup Strategy:**
- Supabase automated backups (7-day retention on free tier)
- Point-in-time recovery enabled
- Export to JSON available via application

---

## Security Model

**Authentication:** Supabase Auth (email/password)

**Authorization:** Row-Level Security (RLS)
- Users can only access their own data
- RLS policies enforced at database level
- No application-level bypasses possible

**API Security:**
- API keys hashed with SHA-256 before storage
- Keys include revocation mechanism
- Audit trail via `last_used_at` timestamp

**Data Encryption:**
- At rest: Supabase-managed encryption
- In transit: TLS 1.3 enforced

---

## TypeScript Type Definitions

**Location:** `lib/types.ts`

```typescript
export type SectionsRow = {
  id: string
  user_id: string
  column_id: 'col-today' | 'col-backlog'
  title: string
  collapsed: boolean
  position: number
  created_at: string
  updated_at: string
}

export type TasksRow = {
  id: string
  user_id: string
  section_id: string
  text: string
  completed: boolean
  position: number
  created_at: string
  updated_at: string
}

export type EventsRow = {
  id: string
  user_id: string
  title: string
  description: string | null
  event_date: string
  duration_minutes: number
  color: string
  created_at: string
  updated_at: string
}

export type ApiKeysRow = {
  id: string
  user_id: string
  key_hash: string
  name: string | null
  last_used_at: string | null
  created_at: string
  revoked_at: string | null
}

export type UserPreferencesRow = {
  user_id: string
  theme: 'light' | 'dark'
  updated_at: string
}
```

---

**End of Data Model Specification**
