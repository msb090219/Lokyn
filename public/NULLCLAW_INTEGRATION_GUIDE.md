# NullClaw Integration Guide for Student Dashboard

## Overview

NullClaw can interact with your Student Dashboard via HTTP requests to manage tasks and calendar events through Discord or other channels.

## Architecture

```
Discord → NullClaw → HTTP Request → Student Dashboard API → Supabase
```

## Prerequisites

1. **NullClaw installed** on your system
2. **Student Dashboard running** (locally or deployed)
3. **Supabase Service Role Key** added to `.env.local`

## Setup Steps

### 1. Dashboard Configuration

1. **Generate an API Key** for NullClaw:
   ```bash
   openssl rand -hex 32
   ```

2. **Save the API Key**:
   - Go to `/settings` in your dashboard
   - Paste the API key in "Nullclaw API Key" field
   - Click "Save Changes"

### 2. NullClaw Configuration

Edit `~/.nullclaw/config.json`:

```json
{
  "default_temperature": 0.7,

  "models": {
    "providers": {
      "openrouter": {
        "api_key": "YOUR_OPENROUTER_API_KEY"
      }
    }
  },

  "agents": {
    "defaults": {
      "model": {
        "primary": "openrouter/anthropic/claude-sonnet-4"
      }
    }
  },

  "channels": {
    "discord": {
      "accounts": {
        "main": {
          "token": "YOUR_DISCORD_BOT_TOKEN",
          "guild_id": "YOUR_GUILD_ID",
          "allow_from": ["YOUR_DISCORD_USER_ID"],
          "allow_bots": false
        }
      }
    }
  },

  "tools": {
    "http_request": {
      "allowed_domains": ["localhost", "your-domain.com"]
    }
  },

  "autonomy": {
    "level": "supervised",
    "workspace_only": true,
    "max_actions_per_hour": 50
  },

  "gateway": {
    "port": 3000,
    "host": "127.0.0.1",
    "require_pairing": true
  },

  "security": {
    "sandbox": {
      "backend": "auto"
    }
  }
}
```

### 3. NullClow Skills (Optional)

Create a custom skill file at `~/.nullclaw/workspace/skills/student-dashboard/SKILL.md`:

```markdown
# Student Dashboard Skill

## Purpose
Help manage tasks and calendar events in the Student Dashboard.

## Capabilities

### Task Management
- View all tasks with `/show tasks`
- Add a task with `/add task "Task name"`
- Task format: `"Task name" in "Section Name"`

### Calendar Management
- View calendar with `/show calendar`
- Add event with `/add event "Event name" at YYYY-MM-DD HH:MM`
- View upcoming events with `/show upcoming`

## Examples

User: "What tasks do I have?"
→ Use http_request to GET /api/nullclaw/tasks

User: "Add a task to study math"
→ Use http_request to POST /api/nullclaw/tasks with title "Study math"

User: "Schedule a study session tomorrow at 3pm"
→ Use http_request to POST /api/nullclaw/calendar with start time

## API Details

**Base URL:** `http://localhost:3000/api/nullclaw` (or your deployed URL)

**Authentication:** Include `x-nullclaw-api-key: YOUR_API_KEY` header

**Endpoints:**
- GET /tasks - Get all tasks
- POST /tasks - Create task: {title, description, section, column}
- GET /calendar?start=DATE&end=DATE - Get events
- POST /calendar - Create event: {title, start, duration, description, color}
```

### 4. Start NullClaw

```bash
# Start the gateway runtime
nullclaw gateway

# In another terminal, start Discord channel
nullclaw channel start discord
```

### 5. Use via Discord

Once running, you can interact with NullClaw in Discord:

```
You: /show tasks
NullClaw: You have 3 tasks:
  - Study Math (To Do)
  - Read Chapter 5 (To Do)
  - Submit Assignment (Today)

You: /add task "Call Mom" in "To Do"
NullClaw: Task "Call Mom" added to To Do section.

You: /add event "Math Study" tomorrow at 2pm
NullClaw: Created event "Math Study" for tomorrow at 2:00 PM.
```

## API Reference

### Authentication

All requests must include:
```
x-nullclaw-api-key: YOUR_API_KEY_HERE
```

### Get Tasks
```http
GET /api/nullclaw/tasks

Response:
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

### Create Task
```http
POST /api/nullclaw/tasks
Content-Type: application/json

{
  "title": "New Task",
  "description": "Task description",
  "section": "To Do",
  "column": "col-today"
}

Response:
{
  "success": true,
  "task": { ... }
}
```

### Get Calendar Events
```http
GET /api/nullclaw/calendar?start=2025-03-01T00:00:00Z&end=2025-03-31T23:59:59Z

Response:
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

### Create Calendar Event
```http
POST /api/nullclaw/calendar
Content-Type: application/json

{
  "title": "Study Session",
  "start": "2025-03-20T14:00:00Z",
  "duration": 90,
  "description": "Math and Physics",
  "color": "blue"
}

Response:
{
  "success": true,
  "event": { ... }
}
```

## NullClow http_request Tool Usage

NullClaw uses the `http_request` tool to call your dashboard API. Here's how it works internally:

**Example request from NullClaw:**
```json
{
  "url": "http://localhost:3000/api/nullclaw/tasks",
  "method": "GET",
  "headers": {
    "x-nullclaw-api-key": "your-api-key-here"
  }
}
```

**Example with POST:**
```json
{
  "url": "http://localhost:3000/api/nullclaw/tasks",
  "method": "POST",
  "headers": {
    "x-nullclaw-api-key": "your-api-key-here",
    "content-type": "application/json"
  },
  "body": "{\"title\":\"Study Math\",\"section\":\"To Do\"}"
}
```

## Troubleshooting

### "Unauthorized" Error
- Check that your API key matches in Settings
- Verify the header is set: `x-nullclaw-api-key`
- Make sure you've saved settings after adding the key

### "CORS" Error
- Add your NullClaw instance domain to allowed domains
- Check that NullClaw is configured with the correct base URL

### Tasks/Events not appearing
- Check the console logs in the dashboard
- Verify the Supabase tables exist
- Check that the service role key is set in `.env.local`

### NullClaw can't reach dashboard
- Ensure dashboard is running (`npm run dev`)
- Check the base URL in NullClow configuration
- Verify firewall/proxy settings

## Security Notes

1. **API Key Storage**: Your API key is stored in the Supabase `profiles` table
2. **HTTPS**: Use HTTPS in production for all API calls
3. **Domain Allowlisting**: Configure `http_request.allowed_domains` in NullClow
4. **Rate Limiting**: Consider adding rate limiting to the API endpoints

## Next Steps

1. **Set up Discord bot**: https://discord.com/developers/applications
2. **Configure NullClow**: Edit `~/.nullclaw/config.json`
3. **Test the integration**: Use NullClow in Discord to add a task
4. **Customize the AI**: Adjust the system prompt for your needs

## Advanced: Custom Commands

You can create custom Discord slash commands by extending NullClow's command handling. See NullClaw documentation for details.

## Support

For issues with:
- **Dashboard API**: Check browser console and server logs
- **NullClaw**: Check `nullclaw doctor` and `nullclaw status`
- **Integration**: Verify API key, base URL, and network connectivity
