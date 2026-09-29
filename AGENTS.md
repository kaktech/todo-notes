# AGENTS.md

This file gives coding agents persistent context about this project.
Follow these rules in every session.

---

## Project Overview

TaskFlow — a todo timeline + notes web app in a blue "Glass" (frosted glass) style. Built with FastAPI (Python) + React (Vite) + SQLite. There is no login: each browser gets a random id (`user_id` in localStorage) and only sees its own tasks, lists, tags, and notes.

---

## Anti-loop rule (read this first)

If you catch yourself repeating the same diagnosis, explanation, or plan more than once without making an actual code edit, STOP. Make the edit immediately, then report only: "Fixed" or "Still broken: [one sentence]." Never re-explain a bug you've already explained in this session.

---

## Architecture

- **Backend**: FastAPI, SQLAlchemy ORM, SQLite database. Auth endpoints (`/api/auth/*`) still exist but the frontend no longer uses them.
- **Frontend**: React 19, Vite, plain CSS (no UI framework)
- **Database**: SQLite file at `backend/app.db`. `create_all()` never alters existing tables, so new columns must also be listed in `NEW_COLUMNS` in `backend/database.py` (added at startup by `add_missing_columns()`).
- **Data isolation**: data endpoints take a `user_id` (the browser's random id, from `shared/user.js`) from the frontend. Anyone who knows an id can read that data — it separates users, it is not security.
- **API prefix**: All endpoints are under `/api`.
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
      tasks/ categories/ tags/ subtasks/ notes/ settings/
    shared/       # AppShell, Sidebar, TabBar, MiniCalendar, Icon, EmptyState, ThemeContext, api.js, user.js, dates.js
    theme/        # colors.js (task/list colour choices; theme colours are CSS variables in App.css)
```

New code always goes in its feature's folder. Do not add logic to main.py beyond wiring routers.

---

## Design system — "Glass" (frosted glass, blue)

Translucent blurred panels floating over a soft blue gradient, thin light borders, gentle shadows, rounded corners, one blue accent. No hard black borders or offset shadows (that was the old neobrutalist "Tempo" look — do not bring it back). All colours are CSS variables at the top of `frontend/src/App.css` (`:root` and `:root[data-theme='dark']`) — never hardcode a theme colour elsewhere.

- **Light**: sky-blue gradient page (#DCEBFF → #B7D3FF) with soft blue/cyan/violet blobs, glass panels rgba(255,255,255,.55), text #0F1B3D, muted #5B6B8C
- **Dark**: deep navy gradient (#0A1330 → #10285C), glass panels rgba(255,255,255,.08), text #EAF1FF, muted #9DB0D6
- **Accent (primary)**: blue gradient #5AA9FF → #2F6BFF with white text — primary buttons, active nav/tab, floating +, mini-calendar selected day, active segments/chips/icon cell, today card
- **Secondary**: sky/cyan gradient #8BE9FF → #38BDF8 with dark text — selected card in the date strip, mini-calendar "today", year pill, count badges
- **Glass recipe**: `background: var(--sheen), var(--glass)` (translucent fill + diagonal light sheen) + `backdrop-filter: var(--blur)` (28px blur, saturate 190%) + 1px `--glass-border` + `--glass-edge` hairline + bright top edge (`--hi-top`) + soft shadow. Add new panel classes to the shared glass selector list in App.css. Panels that hold lots of text (modal, tab bar) use a more opaque background so text stays readable. A `@supports` fallback makes panels near-opaque where backdrop-filter is missing.
- **Corners**: 14-20px on cards/inputs, 28px on the modal and empty-state card, pills/circles fully round
- **Type**: Plus Jakarta Sans everywhere — 800 for headings, 700 for buttons/labels, 400-600 for body. Small uppercase labels use letter-spacing.
- **Appearance setting**: System / Light / Dark (localStorage `theme`, applied as `data-theme` on `<html>`; default Light)
- **Date strip**: selected = sky gradient, today (when not selected) = blue gradient. **Mini calendar**: selected = blue, today = sky.
- **Task cards** (`features/tasks/TaskCard.jsx`) show ONLY: coloured icon badge + colour edge, time/date line, bold title (struck through + muted when done), chips (HIGH priority, list, #tags), edit + delete buttons, check circle. Never show the raw description on a card — it lives in the task modal's "More options". Tags come from one call, `GET /api/tags/task-map`.
- **Empty states**: centered glass card, blue gradient square icon badge, bold heading, muted text, blue pill button (`EmptyState` in `shared/`)
- **Layout**: desktop = 280px glass sidebar (logo, + NEW TASK, Timeline / Notes / Settings, mini calendar) + main area. Below 768px = no sidebar; floating glass bottom tab bar (Notes / Timeline / Settings), floating blue + button, full-screen modals. Switch with the media query in App.css and `.desktop-only`, not JS.
- **New/Edit Task modal** (`features/tasks/NewTaskModal.jsx`): title + icon preview + time summary, WHEN (Timeline/Inbox), DATE, START, DURATION chips, COLOUR dots, ICON grid, and an expandable "More options" (description, list, priority, repeat, tags, subtasks). "Inbox" = no time yet (start/end saved as null). Default task colour is blue.
- **Calendar** (`shared/MiniCalendar.jsx`): round days with a status dot (blue open, red overdue, green done). Sidebar on desktop; on mobile it opens as a sheet from the calendar button in the top bar.
- **Overdue**: incomplete tasks due before today are listed in a red-tinted collapsible OVERDUE panel above the day's tasks (hidden on their own day), each with a "move to today" button.
- **Durations**: chips from 5m to 8h plus a custom-minutes box (max 23h59).
- **Timeline**: timed tasks sorted by start time with "Xh Ym free" + "+ PLAN" gap rows; untimed tasks (no time, or no date) sit in a drag-to-reorder "No time yet" list.
- Dates are always local-time "YYYY-MM-DD" strings from `shared/dates.js` — never `toISOString()` (it shifts the day near midnight).

---

## Known past bugs — do not reintroduce these

- **Title/description merge**: Title and description fields must always be fully independent state. They were once concatenated by a shared form-state bug — if you touch the task form, re-verify they're still separate.
- **Tag attach on new task**: Tag-attach code must never assume `task.id` exists. When creating a brand-new task, hold selected tags in local state and attach them via the API only after the task is saved and a real ID exists.
- **Seed data**: Do not seed demo/default lists (e.g. "personal", "list 2") for new users — new accounts start with zero lists.
- **Subtasks on a new task**: like tags, hold them in local state and create them via the API only after the task has a real id.
- **Notes auto-save**: flush unsaved edits when leaving the editor, and never PUT an empty title (422).

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
