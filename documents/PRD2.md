That constraint is not just reasonable — it is *strategically correct*.
Locking the Todo page prevents scope creep and preserves what is already working.

What you are effectively doing is **layering a behavioural system on top of an existing task system**, rather than rebuilding it.

Let’s formalise that properly into your PRD so it becomes a **non-negotiable design rule**.

---

# 📘 PRD v3.1 — Refined Direction (Locked Todo, New Study Layer)

---

## 1. 🔒 Core Product Constraint (Critical)

> **The Todo List page is complete and must remain unchanged.**

### Implications:

* No UI redesign
* No structural changes to:

  * `tasks`
  * `sections`
* No added complexity to task creation/editing

This aligns with your original simplicity principle:

> *“Reduce cognitive load, focus on content over decoration.”* 

---

## 2. 🧠 Product Architecture (Clean Separation)

You now have **two independent systems**:

---

### System A — Task Management (Existing)

* Input layer
* Static, simple, reliable
* Already implemented

---

### System B — Study Tracking (New)

* Behaviour layer
* Dynamic, visual, motivating
* Built entirely separately

---

### 🔗 The Only Connection Between Them:

```text
Optional task_id reference inside study_sessions
```

That’s it.

> This is crucial — do NOT tightly couple them.

---

## 3. 🗄️ Data Model Strategy (Very Important)

You are **NOT modifying existing tables**.

You are **adding a new layer**.

---

### Existing Tables (unchanged):

* `tasks`
* `sections`
* `user_preferences` 

---

### New Table (Core of V2):

```sql
study_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id UUID NULL, -- optional link to task
  duration_minutes INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  type TEXT CHECK (type IN ('study', 'break')),
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

---

### Key Design Philosophy:

> Tasks represent **intent**
> Sessions represent **action**

---

## 4. 👤 User-Centric Data Model

Everything now revolves around:

```text
User → Sessions → Aggregated Stats → Visual Feedback
```

Not:

```text
User → Tasks → Completion
```

---

## 5. 🔥 Pomodoro Page (`/focus`)

### Purpose:

> Convert intention into action

---

### Core UI Sections:

#### 1. Timer (Primary Focus)

* Large central countdown
* Start / pause / reset
* Mode toggle (study / break)

---

#### 2. Session Context (Minimal)

* Optional:

  * “Studying: [Task Name]”
* No clutter

---

#### 3. Micro Stats (Subtle)

* Today’s total time
* Current streak

---

### Design Rule:

> If it distracts from starting the timer → remove it

---

## 6. 📊 Stats Page (`/stats`)

### Purpose:

> Make effort visible and rewarding

---

### Sections:

#### 6.1 Study Heatmap (Primary Feature)

* Daily grid
* Color intensity = minutes studied

---

#### 6.2 Streak Tracker

* Current streak
* Longest streak

---

#### 6.3 Time Metrics

* Today
* This week
* Total

---

#### 6.4 Session History

* Recent sessions list

---

#### 6.5 Task Analytics (Optional Layer)

* Time spent per task

---

## 7. 🔗 Linking Logic (Simple + Clean)

### When starting a session:

Option A:

* Start directly (no task)

Option B:

* Start from a task
  → store `task_id`

---

### Important:

> Timer must NEVER depend on tasks

---

## 8. ⚙️ Data Flow (Very Important Concept)

```text
User clicks "Start"
        ↓
Session begins (started_at)
        ↓
Timer runs
        ↓
Session ends (completed_at)
        ↓
Duration calculated
        ↓
Stored in database
        ↓
Stats recalculated
        ↓
UI updates (heatmap, streak, totals)
```

---

## 9. 📈 Streak Logic (Define Clearly)

A “study day” =

> At least 1 completed study session

---

### Streak Rules:

* Consecutive days with ≥1 session
* Break = no session in a day
* Reset streak

---

## 10. 🎯 What You Are ACTUALLY Building

Not:

* A productivity app

But:

* A **feedback loop system**

---

### Core Loop:

```text
Start session
→ Complete session
→ See progress (heatmap)
→ Feel reward
→ Repeat
```

---

## 11. ⚠️ Critical Pitfalls to Avoid

### ❌ 1. Overloading the Timer Page

* No charts
* No heavy UI
* No distractions

---

### ❌ 2. Over-integrating with Tasks

* Keep link optional
* Avoid complexity

---

### ❌ 3. Delaying Visual Feedback

* Stats must update instantly
* Reward must feel immediate

---

## 12. 🚀 Final Refined Direction

You now have:

### Stable Core:

* Todo system (unchanged, reliable)

### New Engine:

* Pomodoro + sessions

### Reward Layer:

* Stats + visuals

---

## 13. 🧠 One-Line Product Definition

> “A minimal task list paired with a highly visual study tracking system.”

---

## 14. Next Step (Recommended)

The most high-leverage move right now is:

👉 **Design the Pomodoro page UI in detail**

Because:

* It drives all data
* It defines user behaviour
* Everything else depends on it

---

If you want, I can:

* Sketch the **exact UI layout (component-by-component)**
* Or define the **backend logic for session tracking**
* Or build the **heatmap aggregation logic**

Just choose the layer.ot 
