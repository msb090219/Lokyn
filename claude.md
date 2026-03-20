# My Dashboard - Project Context

## Overview
A modern, full-stack dashboard application built with Next.js 15, TypeScript, Supabase, and Tailwind CSS. Features include task management with drag-and-drop, calendar events, and user customization.

## Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 with CSS custom properties
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: React Context API + Hooks
- **Drag & Drop**: @dnd-kit with pointerWithin collision detection
- **Theme**: next-themes with user-customizable accent colors
- **Calendar**: FullCalendar with day/week/month/list views
- **Notifications**: Sonner (toast notifications)

## Project Structure

### Key Directories
- `app/` - Next.js app router pages
  - `dashboard/` - Main task dashboard
  - `calendar/` - Calendar view with events
  - `settings/` - User settings & preferences
  - `auth/` - Authentication pages
- `components/` - React components
  - `ui/` - shadcn/ui components
  - `providers/` - Context providers (theme, accent color)
- `lib/` - Utilities
  - `supabase/` - Supabase client
  - `types.ts` - TypeScript type definitions
- `supabase/migrations/` - Database schema migrations

### Database Schema
- `user_preferences` - User settings, profile info, accent colors
- `sections` - Task sections (today/backlog columns)
- `tasks` - Individual tasks within sections
- `events` - Calendar events with color coding
- RLS (Row Level Security) enabled on all tables

## Key Features

### 1. Task Dashboard (`app/dashboard/page.tsx`)
- **Two-column layout**: "Today" and "Backlog"
- **Drag & drop**: Reorder sections, tasks, and move between sections
- **Collapse behavior**:
  - Sections can be collapsed to save space
  - Auto-opens when clicking "Add Task" on collapsed section
  - Stays open until task editing is complete
  - Uses `forceOpenSectionId` state to prevent premature closing
- **Optimistic UI**: Updates immediately, syncs with database
- **Drag handles**: 6-dot grip icon on left of sections and tasks

### 2. Calendar (`app/calendar/page.tsx`)
- **Multiple views**: Day, Week, Month, List
- **Event colors**: Blue, Red, Green (customizable via accent color)
- **Import/Export**: ICS file support
- **Time zones**: Proper timezone handling

### 3. Settings (`app/settings/page.tsx`)
- **Profile management**: Name, email
- **API keys**: Secure storage for external API keys
- **Theme customization**:
  - Light/Dark mode toggle
  - **Accent color picker**: Full spectrum color input
  - **Smart validation**:
    - Dark mode: Rejects colors with brightness < 80
    - Light mode: Rejects colors with brightness > 180
    - Real-time validation with visual feedback
- **Notifications**: Toggle preferences

### 4. Accent Color System
- **Storage**: Saved in `user_preferences.accent_color` as hex (e.g., "#3B82F6")
- **Application**: `AccentColorProvider` converts hex to HSL and applies to CSS variables
- **Scope**: Affects entire app (buttons, focus rings, accents, calendar events)
- **Validation**: Theme-aware brightness constraints for readability

## Important Conventions

### State Management
- Use `useState` for local component state
- Use `useRef` for values that don't trigger re-renders
- Implement optimistic updates for better UX
- Use proper cleanup in `useEffect`

### Database Operations
- Always use RLS policies - users can only access their own data
- Use `upsert` for user preferences to handle create/update
- Implement proper error handling with toast notifications
- Load user data on mount with `loadUserData()`

### Styling
- Use CSS custom properties (`hsl(var(--primary))`)
- Follow shadcn/ui component patterns
- Glassmorphism removed - clean solid colors preferred
- Border radius: `0.5rem` (8px) by default
- Hover states: `hover:border-primary/50` pattern

### Color System
- **Dark mode**:
  - Background: `hsl(0 0% 7%)` (near black)
  - Foreground: `hsl(0 0% 98%)` (off-white)
  - Card: `hsl(0 0% 10%)` (very dark gray)
  - Border: `hsl(0 0% 20%)` (subtle gray)
- **Light mode**:
  - Background: `hsl(0 0% 100%)` (white)
  - Foreground: `hsl(0 0% 7%)` (near black)
  - Card: `hsl(0 0% 98%)` (very light gray)
  - Border: `hsl(0 5% 91%)` (light gray)

### Common Patterns

#### Loading User Profile
```typescript
const { data: profile } = await supabase
  .from('user_preferences')
  .select('*')
  .eq('user_id', session.user.id)
  .single()
```

#### Saving Settings
```typescript
const { error } = await supabase
  .from('user_preferences')
  .upsert({
    user_id: user.id,
    // ... fields
    updated_at: new Date().toISOString(),
  })
```

#### Collapse Behavior
Use `forceOpenSectionId` pattern to keep sections open during task creation.

#### Toast Notifications
```typescript
import { toast } from 'sonner'
toast.success('Success message')
toast.error('Error message')
```

## Development Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run dev -- -H 0.0.0.0  # Run on network (accessible from other devices)
```

## Common Issues & Solutions

### Sections Auto-Closing
- Use `forceOpenSectionId` state to override collapse during task creation
- Clear `forceOpenSectionId` in `onClearEditingTask` callback

### Accent Color Not Saving
- Ensure `accent_color` column exists in `user_preferences` table
- Run migrations in Supabase SQL Editor
- Use hex format: "#3B82F6"

### Database Migration Not Applying
- Supabase CLI not linked - run migrations manually in dashboard
- Go to: Supabase Dashboard → SQL Editor → Run migration SQL

## Testing Checklist
- [ ] Collapse/uncollapse sections works correctly
- [ ] Drag and drop works for sections and tasks
- [ ] Accent color validates for current theme
- [ ] Settings save without errors
- [ ] Calendar events display with correct colors
- [ ] Import/export ICS files work

## Future Enhancements
- Real-time collaboration with Supabase Realtime
- Mobile app with React Native / Expo
- More granular notification settings
- Subtasks and task dependencies
- Tags/labels for tasks
- Quick actions via keyboard shortcuts
