# NullClaw Integration Guide

## Overview

Your Student Dashboard now has a REST API that NullClaw can use to:
- View and manage tasks
- View and manage calendar events
- Schedule reminders

## API Endpoints

All endpoints require authentication via the `x-nullclaw-api-key` header.

### Base URL
```
https://your-domain.com/api/nullclaw
```

### Authentication
Include your API key in the request header:
```
x-nullclaw-api-key: YOUR_API_KEY_HERE
```

### Endpoints

#### 1. Health Check
```
GET /api/auth
```
Response:
```json
{
  "status": "ok",
  "message": "NullClaw API is working"
}
```

#### 2. Get Tasks
```
GET /api/nullclaw/tasks
```
Response:
```json
{
  "success": true,
  "tasks": [
    {
      "id": "uuid",
      "title": "Study Math",
      "description": "Chapter 5",
      "completed": false,
      "section": "To Do",
      "column": "col-today",
      "position": 0
    }
  ],
  "count": 1
}
```

#### 3. Create Task
```
POST /api/nullclaw/tasks
Content-Type: application/json

{
  "title": "New Task",
  "description": "Task description",
  "section": "To Do",
  "column": "col-today"
}
```
Response:
```json
{
  "success": true,
  "task": { ... }
}
```

#### 4. Get Calendar Events
```
GET /api/nullclaw/calendar?start=2025-03-01T00:00:00Z&end=2025-03-31T23:59:59Z
```
Response:
```json
{
  "success": true,
  "events": [
    {
      "id": "uuid",
      "title": "Math Class",
      "description": "Chapter 5-7",
      "start": "2025-03-20T09:00:00Z",
      "duration": 60,
      "color": "blue"
    }
  ],
  "count": 1
}
```

#### 5. Create Calendar Event
```
POST /api/nullclaw/calendar
Content-Type: application/json

{
  "title": "Study Session",
  "start": "2025-03-20T14:00:00Z",
  "duration": 90,
  "description": "Math and Physics",
  "color": "blue"
}
```

## Setup Instructions

### 1. Generate an API Key
1. Go to your Settings page (`/settings`)
2. In the "Nullclaw API Key" field, enter a secure random string
3. Click "Save Changes"

**Generate a secure key:**
```bash
openssl rand -hex 32
```

### 2. Configure NullClaw

Add this to your NullClaw configuration file (e.g., `nullclaw.toml`):

```toml
[api.student_dashboard]
base_url = "https://your-domain.com/api"
api_key = "YOUR_API_KEY_HERE"

[channels.discord]
# Your Discord bot configuration
```

### 3. Example NullClaw Agent Script

```zig
// NullClaw can now interact with your dashboard
const dashboard = API.connect("student_dashboard");

// Get all tasks
const tasks = dashboard.get("/nullclaw/tasks");
log("You have ${tasks.count} tasks:");

// Add a new task
dashboard.post("/nullclaw/tasks", {
  title: "Study for exam",
  description: "Chapters 1-5",
  section: "To Do"
});

// Get calendar events for this week
const events = dashboard.get("/nullclaw/calendar", {
  start: DateTime.now().startOfWeek(),
  end: DateTime.now().endOfWeek()
});

// Schedule a reminder
dashboard.post("/nullclaw/calendar", {
  title: "Exam Review",
  start: "2025-03-25T14:00:00Z",
  duration: 60,
  description: "Review all chapters"
});
```

## Security Notes

- Your API key is stored encrypted in the database
- Never share your API key publicly
- Use HTTPS for all API calls
- The API key is required for all requests

## Features Available

### Task Management
- ✅ View all tasks
- ✅ Create new tasks
- ✅ Tasks organized by section (To Do, Today, etc.)

### Calendar Management
- ✅ View calendar events
- ✅ Create new events
- ✅ Date range filtering
- ✅ Event duration and colors

### Coming Soon
- Mark tasks as complete
- Update existing tasks
- Delete tasks/events
- Get upcoming reminders

## Troubleshooting

### "Unauthorized" Error
- Check that your API key matches in Settings
- Verify the header is set: `x-nullclaw-api-key`
- Make sure you've saved your settings

### "Invalid start time format"
- Use ISO 8601 format: `2025-03-20T14:00:00Z`
- Include timezone (Z for UTC)

### Tasks not appearing
- Check the column_id (should be "col-today" or "col-backlog")
- Verify user_id matches

## Support

For issues or questions, check the console logs for detailed error messages.
