# 📄 Product Requirements Document (UI/UX)

## Study Dashboard (Pomodoro + Tasks + Analytics)

---

# 1. 🎯 Purpose

Define a **clear, minimal, and visually compelling UI/UX system** for a student productivity application consisting of:

* Task Management (Planning)
* Pomodoro Timer (Focus)
* Analytics Dashboard (Reflection)

The design must:

* Minimise cognitive load
* Encourage consistent study habits
* Scale seamlessly from web → mobile

---

# 2. 🧠 Core UX Philosophy

## 2.1 Behaviour Model

The product is built around a **three-stage behavioural loop**:

| Stage   | User Intent               | Page      |
| ------- | ------------------------- | --------- |
| Plan    | Organise tasks            | Dashboard |
| Focus   | Study without distraction | Pomodoro  |
| Reflect | Review progress           | Stats     |

---

## 2.2 Design Principles

Derived from your design system :

### 1. Simplicity First

* Remove non-essential UI
* One primary action per screen

### 2. Clarity Over Decoration

* High contrast hierarchy
* Minimal colour usage

### 3. Consistency

* Same spacing, typography, interaction patterns across all pages

### 4. Cognitive Load Minimisation

* Do not mix different user intents on one page

---

# 3. 🧩 Information Architecture

## Pages

```
/dashboard   → Tasks (Planning)
/focus       → Pomodoro Timer (Action)
/stats       → Analytics (Reflection)
```

---

## Navigation

### Desktop:

* Top navigation bar
* 3 primary tabs:

  * Tasks
  * Focus
  * Stats

### Mobile:

* Bottom navigation bar
* Thumb-accessible buttons (≥44px) 

---

# 4. 🟦 Page 1 — Dashboard (Tasks)

## Purpose:

Task organisation and planning

## UI Structure:

```
[ Section: Today ]
- Task
- Task

[ Section: Backlog ]
- Task
- Task
```

## UX Requirements:

* Fast input (Enter to add)
* Minimal friction
* Inline editing
* Drag-and-drop ordering

## Design Constraints:

* No analytics
* No timers
* No distractions

---

# 5. 🟩 Page 2 — Focus (Pomodoro)

## Purpose:

Enable deep, uninterrupted study

---

## 5.1 Layout

```
        25:00
     (progress ring)

        [Start]
```

---

## 5.2 Components

### Timer Display

* Very large typography (48–64px)
* Center aligned

### Progress Indicator

* Circular ring (subtle animation)

### Primary Action Button

States:

* Start
* Pause
* Resume
* Complete

---

## 5.3 UX Behaviour

### Focus Mode Activation:

When timer starts:

* Reduce UI elements
* Dim navigation
* Remove secondary content

---

## 5.4 Constraints

Must NOT include:

* Stats
* Heatmaps
* Lists

---

## 5.5 Mobile Behaviour

* Full-screen layout
* Button positioned for thumb reach
* Minimal interaction required

---

# 6. 🟪 Page 3 — Stats (Analytics)

## Purpose:

Provide **visual and numerical feedback on behaviour**

---

## 6.1 Layout Structure (Desktop)

```
----------------------------------
Overview Metrics
----------------------------------

[ Heatmap ]

----------------------------------

[ Daily Stats ]   [ Recent Activity ]
----------------------------------
```

---

## 6.2 Layout (Mobile)

```
Overview

Heatmap

Daily Stats

Recent Activity
```

---

# 6.3 Components

---

## A. Overview Metrics

### Content:

* Total Study Time
* Total Sessions
* Tasks Completed
* Tasks Created

### Design:

* Text-based (no cards)
* Vertically stacked
* Low visual weight

---

## B. Heatmap (Primary Visual)

### Structure:

* Grid: 7 rows × ~52 columns
* Each square = 1 day

### Data Encoding:

* Colour intensity = study duration

### Colour Rules:

* Single hue (primary colour)
* 4–5 intensity levels

---

## Interaction:

* Hover (desktop): show tooltip
* Tap (mobile): show detail

---

## Design Constraints:

* No axes
* No labels overload
* No multiple colours

---

## C. Daily Stats

### Content:

* Today’s study time
* Average per day
* Sessions per day

### Format:

Simple numeric display

---

## D. Recent Activity

### Content:

* Study sessions
* Completed tasks

### Format:

```
25m • 3:20 PM
Completed: Physics homework
```

---

## Constraints:

* No heavy tables
* No complex filtering

---

# 7. 🎨 Visual Design System (Applied)

Based on :

---

## Colour Usage

| Element         | Colour                |
| --------------- | --------------------- |
| Primary actions | `--primary`           |
| Heatmap         | Shades of `--primary` |
| Text            | `--text-primary`      |
| Secondary text  | `--text-secondary`    |

---

## Typography

| Element  | Size    |
| -------- | ------- |
| Timer    | 48–64px |
| Headers  | 20–32px |
| Body     | 16px    |
| Metadata | 12–14px |

---

## Spacing

Use consistent scale:

* 16px base
* 24–32px between sections 

---

## Layout

* Max width: 1200px 
* Responsive grid
* Mobile-first stacking

---

# 8. 📱 Responsive Design

## Mobile (<768px)

* Single column
* Scroll-based layout
* Large tap targets

---

## Tablet

* Hybrid layout
* Reduced spacing

---

## Desktop

* Multi-column
* Full-width heatmap

---

# 9. ⚡ Interaction Design

## Micro-interactions

* Button hover: 150ms
* Timer animation: smooth continuous
* Stat updates: fade-in

---

## Feedback

* Session completion → subtle success state
* Task completion → immediate visual feedback

---

# 10. 🚫 Design Constraints

Must avoid:

* Multiple competing visuals
* Overuse of cards
* Excessive colours
* Complex graphs
* Mixing focus + analytics

---

# 11. 🧠 Success Criteria

The UI is successful if:

* User understands what to do within 1 second
* Focus page feels distraction-free
* Stats page communicates behaviour instantly
* App works equally well on mobile and desktop

---

# 12. 🚀 Future Considerations

* Dark mode (Phase 3) 
* Gamification (streak emphasis)
* Advanced analytics (optional)

---

# ✅ Final Summary

This design creates:

* Clear separation of user intent
* Minimal but powerful visuals
* Strong behavioural reinforcement loop

Result:

> A clean, modern productivity app that is simple to use but highly motivating.

---
