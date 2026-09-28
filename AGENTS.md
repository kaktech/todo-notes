# AGENTS.md

This file gives coding agents persistent context about this project.
Follow these rules in every session.

---

## Project Overview

TaskFlow — a todo list and notes web app with dark/light themes.
Built with FastAPI (Python) + React (Vite) + SQLite.
Each visitor gets their own separate data via a browser-generated unique ID (no login).

---

## Architecture

- **Backend**: FastAPI, SQLAlchemy ORM, SQLite database
- **Frontend**: React 18, Vite, @dnd-kit for drag-and-drop, plain CSS
- **Database**: SQLite file at `backend/app.db`
- **API prefix**: All endpoints are under `/api`
- **Production**: FastAPI serves the built React app from `frontend/dist` at `/`

---

## Folder Structure (organized by feature, NOT by file type)

```
backend/
  features/
    tasks/       (models.py, routes.py, schemas.py, test_tasks.py)
    categories/  (models.py, routes.py, schemas.py, test_categories.py)
    notes/       (models.py, routes.py, schemas.py, test_notes.py)
  database.py
  main.py        (just wires the feature routers together)
frontend/
  src/
    features/
      tasks/      (TaskCard, TaskForm, TaskList, ProgressBar, useTasks hook)
      categories/ (CategoryPicker, CategoryBadge)
      notes/      (NotesList, NoteEditor, useNotes hook)
    shared/       (NavBar, SearchBar, Toggle, FAB button, theme context)
    theme/        (colors.js for light/dark mode values)
```

---

## Naming Conventions

- **Python files**: lowercase with underscores (`routes.py`, `test_tasks.py`)
- **React components**: PascalCase (`TaskCard.jsx`, `useTasks.js`)
- **CSS classes**: kebab-case (`.task-card`, `.btn-primary`)
- **API endpoints**: kebab-case (`/api/tasks`, `/api/categories`)
- **Database columns**: snake_case (`category_id`, `due_date`, `created_at`)
- **Variables**: snake_case in Python, camelCase in JavaScript

---

## Code Style

- **Python**: Follow PEP 8, use type hints where helpful
- **JavaScript**: Use functional components with hooks
- **Comments**: Write short comments explaining WHY, not WHAT
- **Keep it simple**: The owner is a beginner — avoid clever tricks
- **No external UI libraries**: Use plain CSS only (except @dnd-kit for drag-and-drop)

---

## Testing Rules

- Write tests for ALL endpoints, covering success cases and error cases (404, invalid input)
- Always validate that endpoints work: run the test suite after every change to the backend
- Do NOT say a task is done until all tests pass
- Tests must use a separate temporary SQLite database, never the real app.db
- Also run the real server and check key endpoints with curl before finishing
- If a command or test fails, fix the cause and re-run
- Never skip or delete a failing test to make it pass

---

## API Rules

- All endpoints return JSON
- Use proper HTTP status codes: 200, 201, 204, 404, 422
- Validate input with Pydantic schemas (reject empty titles with 422)
- Return 404 for missing items
- Every task/note is linked to a `user_id` — always filter by it

---

## Deployment

- Platform: Render (free tier)
- Build Command: `cd frontend && npm install && npm run build && cd ../backend && pip3 install -r requirements.txt`
- Start Command: `cd backend && python3 -m uvicorn main:app --host 0.0.0.0 --port $PORT`
- The app reads `PORT` from the environment variable
- Frontend calls `/api` with relative paths (no localhost URLs)

---

## Common Pitfalls

- Route ordering: define specific routes BEFORE parameterized routes
- Python version: use `runtime.txt` to pin Python 3.12+ for Render compatibility
- `--only-binary=:all:` prevents pip from trying to compile packages from source
- @dnd-kit: use `DndContext` + `SortableContext` + `useSortable` pattern
- Recurring tasks: when completing, create next occurrence with updated due date
