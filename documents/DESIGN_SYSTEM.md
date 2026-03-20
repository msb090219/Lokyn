# Design System Specification
## Simple Student Dashboard

**Version:** 2.0
**Status:** Active
**Last Updated:** 2025-03-14

---

## Overview

This design system defines the visual language and interaction patterns for the Simple Student Dashboard. **Current phase: Light mode only.** Dark mode is deferred to Phase 3.

---

## 1. Design Principles

### 1.1 Core Values

**Simplicity First**
- Reduce cognitive load
- Eliminate visual noise
- Focus on content over decoration

**Clarity Over Beauty**
- High contrast for readability
- Clear visual hierarchy
- Intuitive affordances

**Consistency**
- Predictable patterns
- Reusable components
- Standardized spacing

**Accessibility**
- WCAG 2.1 AA compliant
- Keyboard navigation
- Screen reader support
- Focus indicators

---

## 2. Color System

### 2.1 Light Mode Palette

| Usage | Token | Hex | HSL |
|-------|-------|-----|-----|
| **Background** | `--background` | #FFFFFF | 0 0% 100% |
| **Surface** | `--surface` | #F9FAFB | 0 0% 98% |
| **Border** | `--border` | #E5E7EB | 0 5% 91% |
| **Text Primary** | `--text-primary` | #111827 | 0 0% 7% |
| **Text Secondary** | `--text-secondary` | #6B7280 | 220 9% 46% |
| **Primary** | `--primary` | #3B82F6 | 217 91% 60% |
| **Primary Hover** | `--primary-hover` | #2563EB | 217 91% 53% |
| **Success** | `--success` | #10B981 | 158 64% 52% |
| **Destructive** | `--destructive` | #EF4444 | 0 72% 51% |
| **Muted** | `--muted` | #F3F4F6 | 0 0% 96% |

### 2.2 Semantic Colors

| Purpose | Color | Usage |
|---------|-------|-------|
| **Info** | Blue (`--primary`) | Links, active states |
| **Success** | Green (`--success`) | Completion, positive feedback |
| **Error** | Red (`--destructive`) | Errors, delete actions |
| **Warning** | Yellow | N/A (not used in Phase 1) |

### 2.3 Calendar Event Colors

| Color | Hex | Usage |
|-------|-----|-------|
| **Blue** | #3B82F6 | Default events |
| **Red** | #EF4444 | Important/deadlines |
| **Green** | #10B981 | Personal/time-off |
| **Yellow** | #F59E0B | Reminders |
| **Purple** | #8B5CF6 | Recurring events |

---

## 3. Typography

### 3.1 Type Scale

| Element | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| **H1** | 32px | 600 | 40px | Page titles |
| **H2** | 24px | 600 | 32px | Section headers |
| **H3** | 20px | 600 | 28px | Card titles |
| **Body** | 16px | 400 | 24px | Default text |
| **Small** | 14px | 400 | 20px | Secondary text |
| **XSmall** | 12px | 400 | 16px | Captions, timestamps |

### 3.2 Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, sans-serif;
```

### 3.3 Text Styles

**Links:**
- Color: `--primary`
- Underline: Never
- Hover: `--primary-hover`

**Headings:**
- Color: `--text-primary`
- Weight: 600
- Letter spacing: 0

**Body:**
- Color: `--text-primary`
- Weight: 400
- Line height: 1.5

---

## 4. Spacing System

### 4.1 Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight spacing |
| `--space-2` | 8px | Small gaps |
| `--space-3` | 12px | Compact spacing |
| `--space-4` | 16px | Default spacing |
| `--space-5` | 20px | Comfortable spacing |
| `--space-6` | 24px | Section spacing |
| `--space-8` | 32px | Large spacing |
| `--space-10` | 40px | Extra large spacing |

### 4.2 Component Padding

| Component | Padding |
|-----------|---------|
| **Button** | 8px 16px |
| **Input** | 10px 12px |
| **Card** | 16px |
| **Modal** | 24px |

---

## 5. Components

### 5.1 Button

**Variants:**

| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| **Primary** | `--primary` | White | None |
| **Secondary** | `--surface` | `--text-primary` | `--border` |
| **Ghost** | Transparent | `--text-primary` | None |
| **Destructive** | `--destructive` | White | None |

**States:**
- Hover: 10% darker background
- Active: Scale 0.98
- Disabled: 50% opacity
- Focus: 2px `--primary` outline

**Sizes:**

| Size | Height | Padding | Font Size |
|------|--------|---------|-----------|
| **sm** | 32px | 6px 12px | 14px |
| **md** | 40px | 8px 16px | 16px |
| **lg** | 48px | 12px 24px | 16px |

---

### 5.2 Input

**States:**
- Default: `--border` border
- Focus: `--primary` border, 2px width
- Error: `--destructive` border
- Disabled: 60% opacity

**Sizes:**

| Size | Height | Padding | Font Size |
|------|--------|---------|-----------|
| **sm** | 32px | 6px 12px | 14px |
| **md** | 40px | 10px 12px | 16px |

---

### 5.3 Card

**Structure:**
```
┌─────────────────────────────┐
│  Header (optional)           │
├─────────────────────────────┤
│                             │
│  Content                    │
│                             │
├─────────────────────────────┤
│  Footer (optional)           │
└─────────────────────────────┘
```

**Styling:**
- Background: `--surface`
- Border: 1px `--border`
- Border radius: 8px
- Padding: 16px
- Shadow: `0 1px 3px rgba(0,0,0,0.1)`

---

### 5.4 Navigation

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Logo  │  Tasks  Calendar  Settings  │  Sign Out │
└─────────────────────────────────────────────┘
```

**States:**
- Active: `--primary` background, white text
- Inactive: Transparent background, `--text-primary` text
- Hover: `--surface` background

---

## 6. Layout System

### 6.1 Container

```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}
```

### 6.2 Grid

**Two-Column Layout (Dashboard):**
```css
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
```

### 6.3 Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| **sm** | 640px | Mobile landscape |
| **md** | 768px | Tablet |
| **lg** | 1024px | Desktop |
| **xl** | 1280px | Large desktop |

---

## 7. Animation

### 7.1 Timing Functions

| Easing | CSS Value | Usage |
|--------|-----------|-------|
| **Ease** | 0.25s ease | Default transitions |
| **Ease In** | 0.2s ease-in | Enter animations |
| **Ease Out** | 0.2s ease-out | Exit animations |
| **Ease In-Out** | 0.3s ease-in-out | Complex animations |

### 7.2 Durations

| Duration | Usage |
|----------|-------|
| 100ms | Micro-interactions (hover, focus) |
| 150ms | Simple transitions (color, opacity) |
| 200ms | Moderate transitions (transform) |
| 300ms | Complex animations (modal, page) |

### 7.3 Animations

**Button Hover:**
```css
transition: background-color 150ms ease;
```

**Input Focus:**
```css
transition: border-color 200ms ease, box-shadow 200ms ease;
```

**Modal:**
```css
transition: opacity 300ms ease-in-out;
```

---

## 8. Icons

**Library:** Lucide React

**Icons Used:**

| Icon | Usage |
|------|-------|
| `CheckCircle` | Tasks navigation |
| `Calendar` | Calendar navigation |
| `Settings` | Settings navigation |
| `LogOut` | Sign out button |
| `Plus` | Add buttons |
| `X` | Close/delete buttons |
| `ChevronLeft` | Navigate left |
| `ChevronRight` | Navigate right |
| `ChevronDown` | Expand/collapse |
| `ChevronUp` | Expand/collapse |
| `Upload` | Import calendar button |
| `Download` | Export calendar button |

**Size:** 20px (default), 16px (small), 24px (large)

---

## 9. Interaction Patterns

### 9.1 Task List

**Item Hover:**
- Subtle background change
- Delete button appears (opacity 0 → 1)

**Checkbox:**
- Unchecked: Empty square
- Checked: Filled square with checkmark
- Transition: 150ms ease

**Drag Handle:**
- Visible on hover
- Cursor: grab
- Active: cursor grabbing

### 9.2 Calendar

**Date Cell:**
- Default: No background
- Today: `--primary` border (2px)
- Selected: `--primary` background
- Has events: Small dot indicator
- Hover: `--surface` background

**Event:**
- Background: Color from event.color
- Text: White
- Border radius: 4px
- Padding: 4px 8px

### 9.3 Forms

**Validation:**
- Error state: Red border + error message below
- Success state: Green border

**Feedback:**
- Success: Toast notification (green)
- Error: Toast notification (red)
- Loading: Spinner or skeleton

### 9.4 Calendar Import/Export

**Import Button:**
- Primary variant
- Icon: Upload
- Text: "Import Calendar"

**Export Button:**
- Secondary variant
- Icon: Download
- Text: "Export Calendar"

**Import Dialog:**
```
┌─────────────────────────────────────────┐
│  Import Calendar                        │
├─────────────────────────────────────────┤
│                                         │
│  Drag & drop your .ics file here        │
│  or                                     │
│  [Browse Files]                         │
│                                         │
│  ℹ️ Supports: Google Calendar,          │
│     Apple Calendar, Outlook             │
│                                         │
│  Selected: school-calendar-2025.ics     │
│  (25 events detected)                   │
│                                         │
│  [Cancel]              [Import Events]  │
│                                         │
└─────────────────────────────────────────┘
```

**Drop Zone States:**
- **Default**: Dashed border, light gray background
- **Drag Over**: Primary color border, blue tint background
- **File Selected**: Show filename and event count
- **Processing**: Spinner with "Importing..." text
- **Success**: "Imported 25 events" toast
- **Error**: "Failed to parse file" toast

**Export Feedback:**
- Click → "Generating calendar file..." toast
- Success → File download triggered
- Filename format: `calendar-export-YYYY-MM-DD.ics`

**Supported Formats:**
- Import: `.ics` only (RFC 5545 iCalendar format)
- Export: `.ics` (RFC 5545 iCalendar format)

---

## 10. Responsive Design

### 10.1 Mobile (< 768px)

- Single column layout
- Bottom navigation or hamburger menu
- Full-width inputs
- Larger touch targets (min 44px)

### 10.2 Tablet (768px - 1024px)

- Two-column layout where appropriate
- Side navigation collapses to hamburger
- Optimized spacing

### 10.3 Desktop (> 1024px)

- Max-width container (1200px)
- Multi-column layouts
- Hover states enabled

---

## 11. Accessibility

### 11.1 Keyboard Navigation

- Tab: Forward focus
- Shift+Tab: Backward focus
- Enter/Space: Activate focused element
- Escape: Close modals/dropdowns

### 11.2 Focus Indicators

```css
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

### 11.3 Screen Reader Support

- All images have alt text
- Form inputs have labels
- ARIA labels for icon-only buttons
- Announce dynamic content changes

### 11.4 Color Contrast

- Normal text: ≥ 4.5:1
- Large text (18px+): ≥ 3:1
- Interactive elements: ≥ 3:1

---

## 12. Dark Mode (Future)

**Status:** Deferred to Phase 3

**Planned Palette:**

| Usage | Hex | HSL |
|-------|-----|-----|
| Background | #1A1B26 | 0 0% 10% |
| Surface | #24283B | 0 0% 15% |
| Text Primary | #CDD6F4 | 0 0% 87% |
| Border | #414868 | 0 0% 27% |

---

## 13. Implementation

### 13.1 Tailwind Config

**File:** `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        surface: 'hsl(var(--surface))',
        border: 'hsl(var(--border))',
        text: {
          primary: 'hsl(var(--text-primary))',
          secondary: 'hsl(var(--text-secondary))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          hover: 'hsl(var(--primary-hover))',
        },
        success: 'hsl(var(--success))',
        destructive: 'hsl(var(--destructive))',
        muted: 'hsl(var(--muted))',
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        10: '40px',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
      },
    },
  },
  plugins: [],
}

export default config
```

### 13.2 Global CSS Variables

**File:** `app/globals.css`

```css
@layer base {
  :root {
    /* Colors */
    --background: 0 0% 100%;
    --surface: 0 0% 98%;
    --border: 0 5% 91%;
    --text-primary: 0 0% 7%;
    --text-secondary: 220 9% 46%;
    --primary: 217 91% 60%;
    --primary-hover: 217 91% 53%;
    --success: 158 64% 52%;
    --destructive: 0 72% 51%;
    --muted: 0 0% 96%;

    /* Spacing */
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 20px;
    --space-6: 24px;
    --space-8: 32px;
    --space-10: 40px;

    /* Border Radius */
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;

    /* Transitions */
    --transition-fast: 150ms ease;
    --transition-base: 200ms ease;
    --transition-slow: 300ms ease;
  }
}
```

---

## 14. Design Tokens

### 14.1 Shadows

| Token | CSS Value | Usage |
|-------|-----------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Cards |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Dropdowns |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals |

### 14.2 Z-Index Scale

| Layer | Value | Usage |
|-------|-------|-------|
| Base | 0 | Default content |
| Dropdown | 100 | Menus, dropdowns |
| Sticky | 200 | Sticky headers |
| Modal | 300 | Modals, overlays |
| Toast | 400 | Notifications |

---

## 15. Component Library

**Base:** shadcn/ui

**Components Used:**
- Button
- Input
- Label
- Card
- Dialog
- Toast (Sonner)

**Custom Components:**
- Navigation
- TaskList
- TaskItem
- Section
- Calendar (FullCalendar wrapper)
- CalendarImportDialog (import .ics files)
- CalendarExportButton (export to .ics)

---

**End of Design System Specification**
