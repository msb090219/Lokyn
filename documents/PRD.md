# Product Requirements Document
## Simple Student Dashboard

**Version:** 2.0
**Date:** 2025-03-14
**Status:** Active Development

---

## Executive Summary

A two-page web application for students to manage tasks and calendar events. Features nullclaw AI integration via Discord (optional). Built with Next.js 15, Supabase, and FullCalendar. 100% free tier hosting.

---

## 1. Product Overview

### 1.1 Core Value Proposition
Simple task and event management for students who want minimal complexity.

### 1.2 Target Audience
- Primary: Students aged 16-25
- Secondary: Users seeking simple productivity tools
- Tertiary: Discord users interested in AI assistance

### 1.3 Key Differentiators
- Simplicity over feature bloat
- Optional AI integration (not required)
- Zero cost (free tier infrastructure)
- Section-based task organization

---

## 2. Functional Requirements

### 2.1 Page 1: Todo List (`/dashboard`)

**Core Features:**
| Feature | Description | Priority |
|---------|-------------|----------|
| Add Task | Quick input, Enter to submit | P0 |
| Complete Task | Checkbox toggle | P0 |
| Delete Task | Remove task | P0 |
| Sections | "To Do Today", "Backlog" | P0 |
| Inline Edit | Double-click to edit | P1 |

**Section Behavior:**
- Collapsible sections
- Create/delete sections
- Reorder tasks via drag-and-drop
- Tasks persist across sessions

### 2.2 Page 2: Calendar (`/calendar`)

**Core Features:**
| Feature | Description | Priority |
|---------|-------------|----------|
| Month View | Full calendar grid | P0 |
| Week View | 7-day view | P1 |
| Add Event | Click date to add | P0 |
| Edit Event | Modify event details | P0 |
| Delete Event | Remove event | P0 |
| Navigate | Previous/next month | P0 |
| **Import Calendar** | Upload .ics file to import events | P1 |
| **Export Calendar** | Download events as .ics file | P2 |

**Event Structure:**
- Title (required, max 200 chars)
- Date/time (required)
- Description (optional)
- Color coding (optional)

**Calendar Import/Export:**
- **Supported Format:** iCalendar (.ics)
- **Import Sources:** Google Calendar, Apple Calendar, Outlook, any .ics file
- **Import Behavior:** Merge with existing events (no duplicates)
- **Export:** Download all events as standard .ics file

### 2.3 Page 3: Settings (`/settings`)

**Core Features:**
| Feature | Description | Priority |
|---------|-------------|----------|
| API Key Management | Generate/revoke keys | P1 |
| Sign Out | End session | P0 |

---

## 3. Technical Architecture

### 3.1 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 15 | Built-in API routes, React ecosystem |
| **Database** | Supabase PostgreSQL | Auth, RLS, real-time, free tier |
| **Calendar** | FullCalendar (free) | Battle-tested, full-featured |
| **Styling** | Tailwind CSS + shadcn/ui | Modern, accessible components |
| **Hosting** | Vercel Free Tier | Native Next.js deployment |
| **AI Integration** | Custom API | Webhook-based, per-user keys |

**Total Infrastructure Cost:** $0/month

### 3.2 Database Schema

**Tables:**

```sql
-- Sections (task containers)
sections (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  column_id TEXT CHECK (column_id IN ('col-today', 'col-backlog')),
  title TEXT,
  collapsed BOOLEAN DEFAULT FALSE,
  position INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Tasks (within sections)
tasks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  section_id UUID REFERENCES sections,
  text TEXT,
  completed BOOLEAN DEFAULT FALSE,
  position INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Calendar events
events (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  title TEXT CHECK (length(title) <= 200),
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  color TEXT DEFAULT 'blue',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- API keys for nullclaw integration
api_keys (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  key_hash TEXT UNIQUE NOT NULL,
  name TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
)

-- User preferences
user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users,
  theme TEXT CHECK (theme IN ('light', 'dark')),
  updated_at TIMESTAMPTZ
)
```

**Security:** Row-Level Security (RLS) enabled on all tables. Users access only their data.

### 3.3 API Endpoints

**Authentication Required** (Supabase Auth)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tasks` | POST | Create task |
| `/api/tasks` | GET | List tasks |
| `/api/tasks/[id]` | PUT | Update task |
| `/api/tasks/[id]` | DELETE | Delete task |
| `/api/events` | POST | Create event |
| `/api/events` | GET | List events |
| `/api/events/[id]` | PUT | Update event |
| `/api/events/[id]` | DELETE | Delete event |
| `/api/keys` | POST | Generate API key |
| `/api/keys` | GET | List API keys |
| `/api/keys/[id]` | DELETE | Revoke API key |

**nullclaw Integration:** API endpoints use `Authorization: Bearer <api_key>` header for external access.

---

## 4. nullclaw AI Integration

### 4.1 Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Discord   │────▶│   nullclaw   │────▶│ Your API    │
│   (User)    │     │   (AI Bot)   │     │ (Endpoints) │
└─────────────┘     └──────────────┘     └─────────────┘
                                                 │
                                                 ▼
                                          ┌─────────────┐
                                          │  Supabase   │
                                          │  Database   │
                                          └─────────────┘
```

### 4.2 User Flow

1. User navigates to Settings page
2. Clicks "Generate API Key"
3. Copies API key
4. Provides key to nullclaw (one-time setup)
5. nullclaw includes key in API requests
6. Your API validates and executes commands

### 4.3 Supported Commands

**Tasks:**
- `"Add 'finish homework' to my todo list"`
- `"Mark 'study for test' as complete"`
- `"Show me my tasks"`
- `"Delete 'old task' from my todos"`

**Calendar:**
- `"Add 'birthday party' to my calendar on March 20th"`
- `"Add 'exam' to calendar for next Friday at 2pm"`
- `"Show me what's coming up this week"`
- `"What events do I have this week?"`

### 4.4 Security Model

- Per-user API keys (SHA-256 hashed)
- Keys revocable anytime
- Full audit trail (`last_used_at`)
- Opt-in (no AI features visible unless enabled)
- Rate limiting (recommended: 100 req/min)

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page Load | < 2s | Lighthouse |
| Time to Interactive | < 3s | Lighthouse |
| API Response | < 200ms | p95 latency |
| Task Creation | < 100ms | End-to-end |

### 5.2 Reliability

| Metric | Target |
|--------|--------|
| Uptime | 99.5% |
| Data Loss | 0% |
| API Error Rate | < 0.1% |

### 5.3 Security

| Requirement | Implementation |
|-------------|----------------|
| Authentication | Supabase Auth (email/password) |
| Authorization | Row-Level Security (RLS) |
| API Security | SHA-256 hashed keys |
| Data Encryption | Supabase-managed (at rest, in transit) |
| XSS Prevention | React auto-escaping, input sanitization |

### 5.4 Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation for all features
- Screen reader support
- Color contrast ≥ 4.5:1
- Focus indicators on all interactive elements

---

## 6. Design Principles

### 6.1 Visual Design

**Current Phase:** Light mode only (dark mode deferred)

**Characteristics:**
- Minimal, clean interface
- High contrast for readability
- Generous whitespace
- Clear visual hierarchy
- Consistent spacing (4px base unit)

**Typography:**
- System font stack (San Francisco, Inter, Segoe UI)
- Base: 16px
- Headings: 24-32px
- Body: 14-16px

**Color Palette (Light Mode):**
- Background: #FFFFFF
- Surface: #F9FAFB
- Border: #E5E7EB
- Text Primary: #111827
- Text Secondary: #6B7280
- Primary: #3B82F6 (Blue)
- Success: #10B981 (Green)
- Destructive: #EF4444 (Red)

### 6.2 Interaction Design

**Micro-interactions:**
- Button hover: 150ms transition
- Input focus: Blue outline, 200ms transition
- Page transitions: None (instant)
- Loading states: Skeleton screens

**Feedback:**
- Success: Toast notification
- Error: Inline message + toast
- Pending: Spinner or skeleton

---

## 7. Development Phases

### Phase 1: Core Application (Current)

**Scope:**
- Remove terminal interface
- Simplify to light mode
- Add navigation component
- Build calendar page
- Test and deploy

**Deliverables:**
- Working two-page app
- Task CRUD functional
- Calendar CRUD functional
- Clean, minimal UI

**Timeline:** Week 1-2

### Phase 2: nullclaw Integration (Future)

**Scope:**
- API keys table migration
- API route implementation
- Settings page build
- Discord command testing

**Deliverables:**
- Full API endpoint suite
- API key management UI
- Tested nullclaw integration

**Timeline:** Week 3-4

### Phase 3: Polish (Future)

**Scope:**
- Dark mode implementation
- Mobile responsive improvements
- Performance optimization
- User feedback iterations

**Deliverables:**
- Production-ready app
- Performance benchmarks met
- User acceptance testing passed

**Timeline:** Week 5-6

---

## 8. Success Metrics

### 8.1 User Engagement

- Task creation rate: > 5 tasks/week/active user
- Calendar event creation: > 2 events/week/active user
- Session duration: > 5 minutes
- Return rate: > 50% weekly

### 8.2 Technical Performance

- Build success rate: 100%
- Test coverage: > 80%
- Lighthouse score: > 90
- Zero critical bugs in production

### 8.3 Business Metrics

- User growth: +10 users/week (initial)
- Churn rate: < 10% monthly
- API integration rate: > 20% of users
- Support tickets: < 5/week

---

## 9. Out of Scope (Explicitly NOT Building)

- ❌ Mobile app (PWA possible future)
- ❌ Real-time collaboration
- ❌ File attachments
- ❌ Recurring events
- ❌ Task dependencies
- ❌ Time tracking
- ❌ Reminders/notifications
- ❌ Real-time Google Calendar sync (import/export only)
- ❌ Export to PDF
- ❌ Team workspaces
- ❌ Advanced search/filter
- ❌ Tags/labels on tasks
- ❌ Task due dates (separate from calendar)

**Rationale:** Focus on simplicity. These features can be evaluated post-launch based on user feedback.

---

## 10. Dependencies

### 10.1 External Services

| Service | Purpose | Cost | SLA |
|---------|---------|------|-----|
| Vercel | Hosting | $0 (free tier) | 99.95% |
| Supabase | Database/Auth | $0 (free tier) | 99.9% |
| nullclaw | AI Integration | $0 (user's Discord bot) | Best effort |

### 10.2 npm Packages

```json
{
  "dependencies": {
    "@fullcalendar/react": "^6.1.0",
    "@fullcalendar/core": "^6.1.0",
    "@fullcalendar/daygrid": "^6.1.0",
    "@fullcalendar/timegrid": "^6.1.0",
    "@fullcalendar/interaction": "^6.1.0",
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/auth-helpers-nextjs": "^0.9.0",
    "next": "15.0.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tailwindcss": "^3.4.1",
    "lucide-react": "^0.344.0",
    "sonner": "^1.4.0",
    "ics-to-json": "^1.0.1",
    "ical-generator": "^8.0.0"
  }
}
```

---

## 11. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Supabase free tier limits | Low | Medium | Monitor usage, optimize queries |
| nullclaw API changes | Medium | Low | Abstract integration, version endpoints |
| Calendar library cost increase | Low | Low | Use free version, evaluate alternatives |
| Security vulnerabilities | Low | High | Regular audits, dependency updates |
| Performance degradation | Medium | Medium | Load testing, caching strategy |

---

## 12. Appendices

### Appendix A: API Key Format

```
Format: mdl_{32-character-hex}
Example: mdl_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### Appendix B: Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_API_KEY` | API key not found or revoked | 401 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `VALIDATION_ERROR` | Invalid input data | 400 |
| `NOT_FOUND` | Resource not found | 404 |
| `SERVER_ERROR` | Internal server error | 500 |

### Appendix C: Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

**Document Owner:** Product Team
**Last Review:** 2025-03-14
**Next Review:** Post Phase 1 completion

---

**End of PRD**
