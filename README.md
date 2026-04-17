# Min-seo's Dashboard

## 🚀 **VERSION 2.0 - NEXT.JS + SUPABASE**

A **modern, scalable multi-user productivity dashboard** built with Next.js 15, React, TypeScript, and Supabase. Features a flexible "Two-Zone" layout with real-time collaboration, user authentication, and cloud-based data persistence.

---

## ✨ **What's New in v2.0?**

### 🔄 **Major Framework Migration**
- **Old (v1.1):** Vanilla JavaScript + LocalStorage (single-user)
- **New (v2.0):** Next.js 15 + Supabase (multi-user, real-time)

### 🚀 **New Features**
- ✅ **User Authentication** - Email/password + OAuth (Google, GitHub)
- ✅ **Real-time Sync** - Changes sync instantly across all devices
- ✅ **Multi-user Support** - Each user has isolated data
- ✅ **Cloud Database** - PostgreSQL via Supabase
- ✅ **Row-Level Security** - Users can only see their own data
- ✅ **TypeScript** - Type-safe codebase
- ✅ **Modern UI** - shadcn/ui + Tailwind CSS
- ✅ **Scalable** - Supports 1 to 50,000+ users on **FREE tier**

### 💰 **100% Free Stack**
| Service | Free Tier | What You Get |
|---------|-----------|--------------|
| Next.js | ✅ Free | React framework |
| Supabase | ✅ Free | 500MB DB, 50k users |
| Vercel | ✅ Free | Hosting, 100GB bandwidth |
| Tailwind CSS | ✅ Free | Styling |
| shadcn/ui | ✅ Free | UI components |
| **TOTAL** | **$0/month** | Supports 10,000+ users! |

---

## Features

### Core Features
- **Two-Zone Layout**: "To Do Today" (active focus) and "Backlog" (storage/future)
- **Dynamic Sections**: Create unlimited custom sections with drag-and-drop reordering
- **Task Management**: Add, edit, complete, and delete tasks within sections
- **Drag-and-Drop**: Move tasks between sections and across columns
- **Theme Toggle**: Smooth transitions between Light and Dark modes
- **Real-time Sync**: Changes sync instantly across all devices
- **Multi-user**: Each user has their own isolated dashboard
- **Authentication**: Email/password + OAuth (Google, GitHub)

### Focus & Productivity
- **Pomodoro Timer**: Customizable focus sessions with work/break intervals
- **Task Association**: Link specific tasks to focus sessions
- **Session Tracking**: Automatic tracking of completed focus sessions
- **Timer Preferences**: Personalizable timer durations and settings
- **Active Session Management**: Start, pause, and resume focus sessions

### Analytics & Insights
- **Study Statistics**: Comprehensive metrics on study sessions and productivity
- **Activity Heatmap**: Visual representation of study patterns over time
- **Time Metrics**: Track total study time, session count, and engagement
- **Performance Analytics**: Detailed breakdown of focus sessions and completion rates

### Calendar Integration
- **Event Management**: Create, edit, and delete calendar events
- **Multiple Views**: Day, week, month, and list views
- **Import/Export**: ICS file support for calendar portability
- **Color Coding**: Customizable event colors with accent color integration

### Visual Design
- **Modern Aesthetic**: Cosmic gradient design (deep purple to navy)
- **Clean Layout**: Minimal borders, soft shadows, rounded corners
- **Responsive**: Optimized for desktop screens (13"+)
- **Accessibility**: WCAG AA compliant, keyboard navigation support

---

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS 4
- **State Management**: React Context API + Hooks
- **Form Handling**: React Hook Form + Zod validation
- **Drag-and-Drop**: @dnd-kit/core
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Notifications**: Sonner
- **Data Fetching**: React Query (TanStack Query)

### Backend
- **Database**: Supabase (PostgreSQL 15)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Hosting**: Vercel (free tier)
- **API**: Next.js API Routes + Supabase Client

---

## Setup

### Prerequisites
- Node.js 18+ and npm
- Supabase account (free)
- Vercel account (free) - for deployment
- Git

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/dashboard.git
   cd dashboard
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Supabase**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Run the SQL migration script (see `supabase/migrations/001_initial_schema.sql`)
   - Get your project URL and anon key from Settings → API

4. **Configure Environment Variables**
   ```bash
   cp .env.example .env.local
   ```

   Update `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

5. **Run Development Server**
   ```bash
   npm run dev
   ```

6. **Open in Browser**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - Sign up for a new account
   - Start creating sections and tasks!

---

## Usage

### Authentication

**Sign Up:**
1. Click "Get Started" on the landing page
2. Enter your email and password
3. Or sign up with Google/GitHub

**Sign In:**
1. Click "Sign In" on the landing page
2. Enter your credentials
3. Or use OAuth (Google/GitHub)

**Sign Out:**
- Click your username in the header
- Select "Sign Out"

### Creating Sections

1. Navigate to a column (To Do Today or Backlog)
2. Click the **"+ Add Section"** button at the bottom
3. Type your section name and press Enter
4. New section appears instantly

**Tips:**
- Rename sections by clicking the title and typing
- Press Enter to save, Escape to cancel
- Drag sections to reorder
- Click the chevron to collapse/expand

### Adding Tasks

1. Navigate to a section
2. Click the **"+ Add Task"** button at the bottom
3. Type your task name and press Enter
4. New task appears at the bottom of the section

**Tips:**
- Rename tasks by clicking the task text
- Press Enter to save, Escape to cancel
- Click the checkbox to mark as complete
- Drag tasks to reorder

### Managing Tasks

**Complete Task:**
- Click the circular checkbox on the task
- Task text strikes through and opacity reduces
- Changes sync instantly to all devices

**Delete Task:**
- Hover over the task card
- Click the small trash icon
- Task is removed immediately

**Clear Completed Tasks:**
- Navigate to a section with completed tasks
- "Clear Completed" button appears at bottom
- Click to remove all completed tasks at once

### Drag-and-Drop

**Move Tasks Between Sections:**
- Click and hold any task card
- Drag to desired section
- Release to drop in new position
- Tasks reorder automatically

**Move Tasks Between Columns:**
- Drag task from one column to another
- Target column highlights when dragging

### Theme Toggle

- Click the theme toggle button in the top-right corner
- Smooth transition between Light and Dark modes
- Theme preference syncs across all devices

### Focus Sessions (Pomodoro Timer)

1. **Navigate to Focus page** - Click "Focus" in the navigation
2. **Select a Task** - Choose a task from your dashboard to focus on
3. **Set Timer** - Customize work/break intervals in settings
4. **Start Session** - Click to begin your focus session
5. **Track Progress** - View completed sessions in Stats page

### Statistics & Analytics

1. **Navigate to Stats page** - Click "Stats" in the navigation
2. **View Heatmap** - See your study activity patterns over time
3. **Check Metrics** - Review total study time, session count, and engagement
4. **Analyze Performance** - Track productivity trends and improvements

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Escape` | Cancel current edit and close input field |
| `Tab` | Move focus between interactive elements |
| `Enter` | Save current input (section/task name) |

---

## Database Schema

### Tables

**sections**
```sql
CREATE TABLE sections (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  column_id TEXT CHECK (column_id IN ('col-today', 'col-backlog')),
  title TEXT NOT NULL,
  collapsed BOOLEAN DEFAULT FALSE,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**tasks**
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  section_id UUID REFERENCES sections ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**user_preferences**
```sql
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row-Level Security (RLS)

All tables have RLS policies ensuring users can only access their own data:
- ✅ Users can view their own sections/tasks
- ✅ Users can insert their own sections/tasks
- ✅ Users can update their own sections/tasks
- ✅ Users can delete their own sections/tasks
- ❌ Users CANNOT access other users' data

---

## Real-time Features

### How It Works

1. **Subscription Setup**
   - When you log in, the app subscribes to your data
   - Uses Supabase Realtime for PostgreSQL changes

2. **Change Detection**
   - Any change (INSERT, UPDATE, DELETE) triggers a notification
   - All connected clients receive the notification instantly

3. **Optimistic UI**
   - Changes appear immediately in your UI
   - Server confirms the change
   - If there's an error, UI rolls back

### Supported Real-time Operations

- ✅ Create/delete sections
- ✅ Update section titles
- ✅ Collapse/expand sections
- ✅ Reorder sections
- ✅ Create/delete tasks
- ✅ Update task text
- ✅ Toggle task completion
- ✅ Reorder tasks
- ✅ Clear completed tasks
- ✅ Change theme

---

## Deployment

### Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Add environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Your dashboard is now live!

### Custom Domain

1. In Vercel, go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Wait for SSL certificate to provision

---

## Development

### Project Structure

```
dashboard/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes (login, signup)
│   ├── dashboard/         # Protected dashboard route
│   ├── focus/             # Pomodoro timer and focus sessions
│   ├── stats/             # Statistics and analytics
│   ├── calendar/          # Calendar and event management
│   ├── settings/          # User settings and preferences
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── dashboard/        # Dashboard components
│   ├── auth/             # Auth components
│   ├── study-heatmap.tsx # Activity heatmap visualization
│   ├── time-metrics-card.tsx # Time tracking metrics
│   └── engagement-metrics-card.tsx # Engagement analytics
├── lib/                   # Utility functions
│   ├── supabase/         # Supabase client
│   ├── hooks/            # Custom React hooks
│   └── utils.ts          # General utilities
├── types/                 # TypeScript types
├── styles/                # Global styles
├── supabase/              # Database migrations
├── public/                # Static assets
└── middleware.ts          # Next.js middleware (auth)
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests
npm run type-check   # Run TypeScript type checking
```

### Adding shadcn/ui Components

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
# ... etc
```

---

## Testing

### Unit Tests

```bash
npm run test
```

### E2E Tests

```bash
npm run test:e2e
```

---

## Migration from v1.1 (Vanilla JS)

**Note:** This section is ONLY for users who previously used the v1.1 Vanilla JS version with LocalStorage.

### Data Migration Script

A one-time migration script is provided to transfer your existing LocalStorage data to Supabase:

```bash
npm run migrate:local-to-supabase
```

**What this does:**
1. Loads your existing data from browser's LocalStorage
2. Creates corresponding records in Supabase (cloud database)
3. Preserves all your sections and tasks
4. Maintains ordering and positions
5. Associates data with your user account

**When to use:**
- Run this ONCE after signing up for the new v2.0 dashboard
- Only needed if you have data in the old v1.1 version
- New users can skip this step

---

## Troubleshooting

### Supabase Connection Issues

**Problem:** "Failed to fetch" errors

**Solution:**
1. Check your `.env.local` file
2. Verify Supabase URL and anon key are correct
3. Ensure Supabase project is active
4. Check RLS policies are enabled

### Real-time Not Working

**Problem:** Changes don't sync across devices

**Solution:**
1. Ensure Realtime is enabled in Supabase
2. Check your subscription filters
3. Verify RLS policies allow realtime
4. Check browser console for errors

### Authentication Issues

**Problem:** Can't sign in or sign up

**Solution:**
1. Check Supabase Auth settings
2. Ensure email confirmation is disabled (for development)
3. Verify OAuth providers are configured
4. Check redirect URLs in Supabase settings

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Acknowledgments

- **Next.js** - React framework
- **Supabase** - Backend as a service
- **shadcn/ui** - Beautiful UI components
- **Tailwind CSS** - Utility-first CSS framework
- **Vercel** - Hosting platform

---

**Version:** 2.1
**Last Updated:** 2026-04-18
**Author:** Min-seo
**Status:** 🚀 Production Ready - Multi-user, Real-time, Scalable, with Focus & Analytics

---

## 🎉 **Ready to Get Started?**

1. **Set up your free Supabase account** - [supabase.com](https://supabase.com)
2. **Clone this repository**
3. **Run `npm install && npm run dev`**
4. **Start organizing your tasks like a pro!**

**Questions? Issues?** Open an issue on GitHub!

---

*Built with ❤️ using Next.js, Supabase, and shadcn/ui*
