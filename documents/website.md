Below is a **clean, implementation-ready PRD** for your minimal onboarding website. It is intentionally constrained to preserve the simplicity you want.

---

# Product Requirements Document

## Lokyn – Landing Page (Web)

**Version:** 1.0
**Status:** Design + Build Phase
**Platform:** Web (Pre-auth landing page)
**Last Updated:** 2026-04-27

---

## 1. Executive Summary

A **minimal, single-page landing website** designed to introduce Lokyn and convert users into signing up or signing in.

The page must:

* Communicate value within seconds
* Remain visually minimal and uncluttered
* Match the existing dashboard design system (light mode only)
* Prioritise conversion (Get Started / Sign In)

This is not a marketing-heavy SaaS page. It is a **focused onboarding gateway**.

---

## 2. Goals

### Primary Goals

* Convert visitors → signed-up users
* Clearly communicate what the product does
* Maintain a clean, student-focused aesthetic

### Secondary Goals

* Tease future features (mobile, AI/Discord)
* Reinforce brand identity (simple, focused, calm)

---

## 3. Non-Goals (Strict)

To preserve minimalism, the following are explicitly excluded:

* ❌ Testimonials
* ❌ Pricing tables (product is free)
* ❌ Blog/resources
* ❌ FAQ
* ❌ Feature-heavy grids
* ❌ Animations beyond subtle transitions
* ❌ Dark mode toggle

---

## 4. Target Audience

* Students (primarily 16–18, NCEA context)
* Secondary: general productivity users

**User intent:**

* Looking for a simple way to manage school work
* Overwhelmed by complex productivity tools

---

## 5. Core Value Proposition

> A simple dashboard for tasks, study sessions, and progress tracking — without unnecessary complexity.

Aligned with existing product philosophy:

* simplicity over feature bloat
* minimal UI
* focused functionality 

---

## 6. Page Structure

### Overview

```text
Navbar
Hero
Features (3 items)
Coming Soon
Footer
```

---

## 7. Functional Requirements

---

### 7.1 Navbar

**Purpose:** Navigation + conversion entry

**Elements:**

* Logo (left)
* Sign In (text button)
* Get Started (primary button)

**Behaviour:**

* Sticky on scroll (optional)
* No additional navigation links

---

### 7.2 Hero Section

**Purpose:** Immediate clarity and conversion

**Content:**

**Headline:**
Short, clear, student-focused

**Subtext:**
One-line explanation of functionality

**Buttons:**

* Primary: Get Started → `/signup`
* Secondary: Sign In → `/login`

**Visual:**

* Static dashboard preview
* Must reflect real UI (tasks + study + stats)

**Requirements:**

* Above the fold on desktop
* Clear visual hierarchy
* No clutter

---

### 7.3 Features Section

**Purpose:** Reinforce value proposition

**Structure:**
3 feature blocks (maximum)

**Each block includes:**

* Title (1 line)
* Description (1 line)
* Optional icon

**Content Themes:**

* Tasks (organisation)
* Study sessions (pomodoro/consistency)
* Stats (progress tracking)

**Constraints:**

* No large grids
* No extended explanations

---

### 7.4 Coming Soon Section

**Purpose:** Future-facing retention

**Content:**

Primary:

* Mobile app teaser

Secondary (optional):

* AI / Discord integration mention

**Tone:**

* Subtle, not dominant
* Visually lighter than hero

---

### 7.5 Footer

**Purpose:** Closure and minimal branding

**Content:**

* © Lokyn
* Optional: “Free forever”

No links required at this stage.

---

## 8. Design Requirements

---

### 8.1 Theme

* **Light mode only**
* No toggle

Rationale:

* Aligns with current design system 
* Ensures visual consistency post-login

---

### 8.2 Visual Style

**Principles:**

* Simplicity first
* Clarity over decoration
* High whitespace usage

From design system:

* minimal, clean interface
* consistent spacing
* strong hierarchy 

---

### 8.3 Colour Usage

* Background: white
* Cards: subtle grey (`--surface`)
* Borders: light (`--border`)
* Primary: used sparingly (buttons only)

No gradients, no heavy shadows.

---

### 8.4 Typography

* System font stack
* Clear hierarchy:

  * Hero: large (H1)
  * Section titles: H2
  * Body: standard

Typography should carry most of the visual weight.

---

### 8.5 Spacing

* Generous spacing between sections
* Minimal internal clutter
* Use spacing to create hierarchy instead of colour

---

## 9. Interaction Design

---

### Buttons

* Primary: filled (blue)
* Secondary: text or subtle outline

States:

* Hover: slight darkening
* Active: slight scale (0.98)
* Transition: ~150ms

---

### Transitions

* Minimal
* No animations beyond:

  * hover effects
  * subtle fades (optional)

---

## 10. Routing

| Action      | Route     |
| ----------- | --------- |
| Get Started | `/signup` |
| Sign In     | `/login`  |

---

## 11. Performance Requirements

| Metric              | Target |
| ------------------- | ------ |
| Load time           | < 2s   |
| Lighthouse score    | > 90   |
| Time to interactive | < 3s   |

---

## 12. Technical Stack

Aligned with main app:

* Next.js (same project or separate marketing route)
* Tailwind CSS
* shadcn/ui components

---

## 13. Success Metrics

### Conversion Metrics

* % of visitors clicking “Get Started”
* % of visitors signing up

### Engagement Metrics

* Bounce rate
* Time on page

---

## 14. Future Considerations (Not Now)

* Dark mode landing page
* Testimonials
* Feature expansion
* Video demo
* Email capture / waitlist

---

## 15. Key Constraint (Critical)

> The page must feel **intentional, not empty**.

This means:

* No filler sections
* No unnecessary content
* Every element must justify its presence

---

## Final Summary

This landing page is:

* **Single-page**
* **Light mode**
* **4 sections only**
* **Conversion-focused**
* **Aligned with product simplicity**

---

If you want to push this further, the next high-impact step would be:
→ designing the **exact hero layout (grid, spacing, font sizes, and screenshot positioning)**, since that will determine whether the page feels average or genuinely refined.
