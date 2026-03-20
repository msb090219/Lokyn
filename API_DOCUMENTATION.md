# My Dashboard API Documentation

## Overview
RESTful API for creating and managing tasks in My Dashboard. All endpoints require API key authentication.

## Base URL
```
http://localhost:3000/api/nullclaw
```

## Authentication
All requests must include an API key in the header:
```
x-nullclaw-api-key: YOUR_API_KEY_HERE
```

**How to get your API key:**
1. Go to Settings in your dashboard
2. Scroll to "API Keys" section
3. Enter a key (or generate one)
4. Save settings

---

## Endpoints

### 1. Create Task
Create a new task in your dashboard.

**Endpoint:** `POST /tasks`

**Request Headers:**
```
Content-Type: application/json
x-nullclaw-api-key: YOUR_API_KEY_HERE
```

**Request Body:**
```json
{
  "title": "Task title here",
  "section": "To Do",
  "column": "col-today"
}
```

**Parameters:**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| title | string | Yes | - | The task text/title |
| section | string | No | "To Do" | Section name (will be created if doesn't exist) |
| column | string | No | "col-today" | Column: "col-today" or "col-backlog" |

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/nullclaw/tasks \
  -H "Content-Type: application/json" \
  -H "x-nullclaw-api-key: YOUR_API_KEY_HERE" \
  -d '{
    "title": "Review project documentation",
    "section": "Work",
    "column": "col-today"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "task": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Review project documentation",
    "completed": false,
    "section": "Work",
    "column": "col-today",
    "position": 0
  }
}
```

**Error Responses:**

401 Unauthorized:
```json
{
  "error": "Unauthorized"
}
```

400 Bad Request:
```json
{
  "error": "Title is required"
}
```

500 Internal Server Error:
```json
{
  "error": "Failed to create task",
  "details": "Error message here"
}
```

---

### 2. Get All Tasks
Retrieve all tasks for the authenticated user.

**Endpoint:** `GET /tasks`

**Request Headers:**
```
x-nullclaw-api-key: YOUR_API_KEY_HERE
```

**Example Request:**
```bash
curl http://localhost:3000/api/nullclaw/tasks \
  -H "x-nullclaw-api-key: YOUR_API_KEY_HERE"
```

**Success Response (200):**
```json
{
  "success": true,
  "tasks": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Review project documentation",
      "completed": false,
      "section": "Work",
      "column": "col-today",
      "position": 0
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Team meeting at 2pm",
      "completed": true,
      "section": "Work",
      "column": "col-today",
      "position": 1
    }
  ],
  "count": 2
}
```

---

## Quick Examples

### Using JavaScript/TypeScript
```typescript
const API_KEY = 'YOUR_API_KEY_HERE';
const BASE_URL = 'http://localhost:3000/api/nullclaw';

// Create a task
async function createTask(title: string, section = 'To Do') {
  const response = await fetch(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-nullclaw-api-key': API_KEY,
    },
    body: JSON.stringify({ title, section }),
  });

  const data = await response.json();
  return data;
}

// Get all tasks
async function getTasks() {
  const response = await fetch(`${BASE_URL}/tasks`, {
    headers: {
      'x-nullclaw-api-key': API_KEY,
    },
  });

  const data = await response.json();
  return data.tasks;
}
```

### Using Python
```python
import requests

API_KEY = 'YOUR_API_KEY_HERE'
BASE_URL = 'http://localhost:3000/api/nullclaw'

headers = {
    'x-nullclaw-api-key': API_KEY,
    'Content-Type': 'application/json'
}

# Create a task
def create_task(title, section='To Do'):
    response = requests.post(
        f'{BASE_URL}/tasks',
        headers=headers,
        json={'title': title, 'section': section}
    )
    return response.json()

# Get all tasks
def get_tasks():
    response = requests.get(f'{BASE_URL}/tasks', headers=headers)
    return response.json()['tasks']
```

---

## Common Use Cases for Nullbot

### Add a quick task
```json
POST /tasks
{
  "title": "Follow up with client"
}
```

### Add to backlog
```json
POST /tasks
{
  "title": "Research new framework",
  "column": "col-backlog"
}
```

### Add to specific section
```json
POST /tasks
{
  "title": "Fix bug in login flow",
  "section": "Bugs",
  "column": "col-today"
}
```

---

## Notes

- Tasks are automatically added to the bottom of the section
- Sections are created automatically if they don't exist
- All tasks are created as incomplete (completed: false)
- API key is stored in your user preferences table
- Keep your API key secret - it grants full access to your tasks
