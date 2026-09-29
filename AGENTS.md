# AGENTS.md

This file gives coding agents persistent context about this project.
Follow these rules in every session.

---

## Project Overview

TaskFlow — a todo list + notes web app with a blue accent, modernist/editorial design (bold typography, minimal decoration). Built with FastAPI (Python) + React (Vite) + SQLite. Users sign up and log in; each user only sees their own tasks, lists, tags, and notes.

---

## Anti-loop rule (read this first)

If you catch yourself repeating the same diagnosis, explanation, or plan more than once without making an actual code edit, STOP. Make the edit immediately, then report only: "Fixed" or "Still broken: [one sentence]." Never re-explain a bug you've already explained in this session.

---

## Architecture

- **Backend**: FastAPI, SQLAlchemy ORM, SQLite database, session-based auth
- **Frontend**: React 18, Vite, plain CSS (no UI framework)
- **Database**: SQLite file at `backend/app.db`
- **API prefix**: All endpoints are under `/api`, all require authentication except `/api/auth/*`
- **Production**: FastAPI serves the built React app from `frontend/dist` at `/`

---

## Folder structure (organize by feature, NOT by file type)

```
backend/
  features/
    auth/        (models.py, routes.py, schemas.py, test_auth.py)
    tasks/       (models.py, routes.py, schemas.py, test_tasks.py)
    categories/  (models.py, routes.py, schemas.py, test_categories.py)
    tags/        (models.py, routes.py, schemas.py, test_tags.py)
    subtasks/    (models.py, routes.py, schemas.py, test_subtasks.py)
    notes/       (models.py, routes.py, schemas.py, test_notes.py)
  database.py
  main.py         # wires feature routers together only
frontend/
  src/
    features/
      auth/ tasks/ categories/ tags/ subtasks/ notes/
    shared/       # NavBar, Sidebar, SearchBar, Toggle
    theme/        # colors.js for light/dark mode
```

New code always goes in its feature's folder. Do not add logic to main.py beyond wiring routers.

---

## Design system

- **Style**: modernist/editorial — bold sans-serif headings, minimal color, generous whitespace, no heavy shadows
- **Light mode**: background #F5F3EF, card #EDEAE4, text #1A1A1A, accent terracotta #C97B4A, primary action blue #2563EB
- **Dark mode**: background #17171A, card #232326, text #F1F1F1, accent #E0975E, primary action blue #3B82F6
- **Task cards** show ONLY: checkbox + bold title + small metadata line (due date/priority badge). Never show raw description or unlabeled text on a card — description lives in the task detail panel only.

---

## Known past bugs — do not reintroduce these

- **Title/description merge**: Title and description fields must always be fully independent state. They were once concatenated by a shared form-state bug — if you touch the task form, re-verify they're still separate.
- **Tag attach on new task**: Tag-attach code must never assume `task.id` exists. When creating a brand-new task, hold selected tags in local state and attach them via the API only after the task is saved and a real ID exists.
- **Seed data**: Do not seed demo/default lists (e.g. "personal", "list 2") for new users — new accounts start with zero lists.

---

## Naming conventions

- **Python files**: lowercase_with_underscores
- **React components**: PascalCase
- **CSS classes**: kebab-case
- **API endpoints**: kebab-case (`/api/tasks`, `/api/tasks/bulk`)
- **Database columns**: snake_case
- **Variables**: snake_case in Python, camelCase in JavaScript

---

## Code style

- **Python**: PEP 8, type hints where helpful
- **JavaScript**: functional components with hooks
- **Comments**: explain WHY, not WHAT
- **Keep it simple**: the owner is a beginner, avoid clever tricks
- **No external UI libraries**: plain CSS only (except @dnd-kit for drag-and-drop)

---

## Testing rules

- Write tests for ALL endpoints: success cases, error cases (404, 422), and unauthorized cases (401)
- Run the full test suite after every backend change — do not say a task is done until all tests pass
- Tests use a separate temporary SQLite database, never the real app.db
- Also start the real server and check key endpoints with curl before finishing
- If a command or test fails, fix the cause and re-run. Never skip or delete a failing test to make it pass.
- When fixing a bug, add a regression test for it and note it under "Known past bugs" above if it's the kind of thing that could resurface

---

## API rules

- All endpoints return JSON, use proper status codes (200, 201, 204, 401, 404, 422)
- Validate input with Pydantic schemas (reject empty titles with 422)
- Every task/list/tag/note is linked to a `user_id` — always filter by the logged-in user, and confirm a user can never read or modify another user's data
- Specific routes (e.g. `/api/tasks/completed`) must be defined BEFORE parameterized routes (e.g. `/api/tasks/{task_id}`)

---

## Deployment

### Render (recommended)

- **Build**: `cd frontend && npm install && npm run build && cd ../backend && pip3 install -r requirements.txt`
- **Start**: `cd backend && python3 -m uvicorn main:app --host 0.0.0.0 --port $PORT`
- App reads `PORT` from the environment; frontend calls `/api` with relative paths only
- `runtime.txt` pins Python 3.12+ for Render compatibility

### Vercel

- **Frontend only**: Deploy the React app to Vercel
- **Backend**: Deploy the FastAPI backend separately (Render, Railway, or Fly.io)
- **Environment variables**: Set `VITE_API_URL` to your backend URL (e.g. `https://your-app.onrender.com`)
- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Install command**: `npm install`
- **Framework preset**: Vite
- **Note**: Vercel is serverless — it cannot run the SQLite backend. The backend must be hosted elsewhere.
