# AGENTS.md

This file gives coding agents persistent context about this project.
Follow these rules in every session.

---

## Project Overview

Pane — a glass-styled planner (today view, week board, notes) in a blue frosted-glass style. (Repo and folder names still say todo-notes / TaskFlow.) Built with FastAPI (Python) + React (Vite) + SQLite. There is no login: each browser gets a random id (`user_id` in localStorage) and only sees its own tasks, lists, tags, and notes.

---

## Anti-loop rule (read this first)

If you catch yourself repeating the same diagnosis, explanation, or plan more than once without making an actual code edit, STOP. Make the edit immediately, then report only: "Fixed" or "Still broken: [one sentence]." Never re-explain a bug you've already explained in this session.

---

## Architecture

- **Backend**: FastAPI, SQLAlchemy ORM, SQLite database. Auth endpoints (`/api/auth/*`) still exist but the frontend no longer uses them.
- **Frontend**: React 19, Vite, plain CSS (no UI framework)
- **Database**: SQLite file at `backend/app.db` locally; Postgres when `DATABASE_URL` (or `POSTGRES_URL`) is set — `backend/database.py` picks the right engine, and notes share the same Postgres database. `create_all()` never alters existing tables, so new columns must also be listed in `NEW_COLUMNS` in `backend/database.py` (added at startup by `add_missing_columns()`).
- **Data isolation**: data endpoints take a `user_id` (the browser's random id, from `shared/user.js`) from the frontend. Anyone who knows an id can read that data — it separates users, it is not security.
- **API prefix**: All endpoints are under `/api`.
- **Production (Vercel)**: the React build is served as static files; the FastAPI app runs as one serverless function (`api/index.py`) behind `/api/*`, with Postgres for data. Locally FastAPI can still serve `frontend/dist` and uses SQLite.

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
      today/ week/ composer/ tasks/ categories/ tags/ subtasks/ notes/ settings/
    shared/       # AppShell, Dock, TopNav, Icon, EmptyState, ThemeContext, api.js, user.js, dates.js, useNow.js, useMediaQuery.js
    theme/        # colors.js (tint choices; theme colours are CSS variables in App.css)
```

New code always goes in its feature's folder. Do not add logic to main.py beyond wiring routers.

---

## Design system — "Pane" (frosted glass, blue)

Translucent blurred panels floating over a soft blue gradient, bright top edges, gentle shadows, very round corners, one blue accent. No hard black borders or offset shadows (old neobrutalist look — do not bring it back). All colours are CSS variables at the top of `frontend/src/App.css` (`:root` and `:root[data-theme='dark']`) — never hardcode a theme colour elsewhere.

**This is an original layout, not a copy of any reference app.** Keep wording and structure our own: sentence case, the words Now / Up next / Anytime / Slipped / Open air / Tint / Glyph / Steps / Setup. Do not reintroduce a left sidebar, a month-calendar sidebar, a day-strip + free-time timeline, or a long stacked "new task" modal.

**Two layouts, on purpose (break at 900px).** Phones/tablets (under 900px): floating Dock, single column, bottom-sheet composer, Notes tiles → full editor. Laptops (900px and up): `TopNav` (brand, tabs, Add task), no dock; Today is a two-column dashboard with a sticky glass **side rail** (quick add, today-so-far bar, Slipped with Today/Tomorrow buttons, this-week glance); Notes is list + always-open editor; Setup is two columns; the composer is a wider card with vertical tabs. Switch with the CSS media query, or `useMediaQuery(DESKTOP_QUERY)` when React needs to render a different tree. Keep the two layouts different — do not collapse them into one.

- **Light**: sky-blue gradient page (#DCEBFF → #B7D3FF) with blue/cyan/violet blobs, glass panels rgba(255,255,255,.36), text #0F1B3D, muted #5B6B8C
- **Dark**: deep navy gradient (#0A1330 → #10285C), glass rgba(255,255,255,.07), text #EAF1FF, muted #9DB0D6
- **Accent (primary)**: blue gradient #5AA9FF → #2F6BFF, white text — primary buttons, active dock item, the + button, active chips/tabs
- **Secondary**: sky gradient #8BE9FF → #38BDF8, dark text — count badges, today's outline on the week board
- **Glass recipe**: `background: var(--sheen), var(--glass)` + `backdrop-filter: var(--blur)` (28px, saturate 190%) + 1px `--glass-border` + `--glass-edge` hairline + bright top edge (`--hi-top`) + soft shadow. Add new panel classes to the shared glass selector list in App.css. Text-heavy panels (composer, dock) use a more opaque background. A `@supports` fallback keeps panels readable without backdrop-filter.
- **Type**: Plus Jakarta Sans — 800 for headings, 700 for buttons/labels. Small uppercase labels ("eyebrow") use letter-spacing.
- **Appearance**: System / Light / Dark in Setup (localStorage `theme`, `data-theme` on `<html>`; default Light)
- **Navigation**: phones use a floating glass **Dock** — Today · Week · (+) · Notes · Setup; laptops use the **TopNav** tabs plus an Add task button. The + / Add task opens the composer from anywhere. No sidebar, no tab bar, no floating action button.
- **Today** (`features/today`): greeting + find-or-add line (typing filters, Enter opens the composer with that text); **Now** card with a countdown ring, Done and +15 min (or "Free for…" with Fill the gap when nothing is running); **Slipped** tray of overdue tasks — tap one to move it to Today/Tomorrow, edit or delete; **Up next** tiles (timed); **Anytime** tiles (drag to reorder); **Done** (collapsed). Empty day = "Open air".
- **Week** (`features/week`): seven day columns, drag a card to another day to reschedule (time is kept); on phones the columns swipe. Jump to any date with the calendar button.
- **Composer** (`features/composer`): one line to type — `parseQuickAdd` (`features/tasks/quickAdd.js`) understands "gym tomorrow 6pm for an hour" (dates like 5/10 are day/month). Tabs below: When · Look (tint + glyph) · Details (notes, list, priority, repeat) · Tags · Steps (subtasks). Centered card on desktop, bottom sheet on phones. New tasks default to today.
- **Task tiles** (`features/tasks/PaneTile.jsx`) show ONLY: glyph, time line, bold title (struck through + muted when done), chips (High priority, list, #tags), Mark done, edit, delete. Never show the raw description on a tile — it lives in the composer's Details tab. Tags come from one call, `GET /api/tags/task-map`.
- **Durations**: chips from 5m to 8h plus a custom-minutes box (max 23h59).
- **Notes**: glass sticky-note tiles in columns; tap to open a full editor with auto-save. **Setup**: appearance, lists, tags, clear every task.
- Dates are always local-time "YYYY-MM-DD" strings from `shared/dates.js` — never `toISOString()` (it shifts the day near midnight).

---

## Known past bugs — do not reintroduce these

- **Title/description merge**: Title and description fields must always be fully independent state. They were once concatenated by a shared form-state bug — if you touch the task form, re-verify they're still separate.
- **Tag attach on new task**: Tag-attach code must never assume `task.id` exists. When creating a brand-new task, hold selected tags in local state and attach them via the API only after the task is saved and a real ID exists.
- **Seed data**: Do not seed demo/default lists (e.g. "personal", "list 2") for new users — new accounts start with zero lists.
- **Steps (subtasks) on a new task**: like tags, hold them in local state and create them via the API only after the task has a real id.
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

### Vercel (primary)

One Vercel project runs everything: static frontend + the API as a Python function + a Postgres database.

- **Files**: `vercel.json` (build command, output folder, `/api/*` → function), `api/index.py` (function entry), root `requirements.txt` (function deps), `.vercelignore`, `.python-version`.
- **Setup**: import the GitHub repo in Vercel (framework preset "Other", root directory = repo root) → **Storage** tab → create a **Postgres** (Neon) database and connect it to the project (this sets `DATABASE_URL` / `POSTGRES_URL`) → deploy.
- **Tables** are created automatically on the first request (`create_all` + `add_missing_columns` run when the function starts). New columns still need an entry in `NEW_COLUMNS` in `backend/database.py`.
- **Without a database** the function refuses to start on Vercel with a clear message (its disk is read-only and temporary, so SQLite would lose data).
- **Check**: open `https://<your-site>/api/health` — it should return `{"status":"ok"}`.
- The frontend calls relative `/api`, so no CORS and no `VITE_API_URL` are needed.
- Data in a local `app.db` is not copied to Postgres automatically.
- Not yet verified on a live Vercel deploy or against a real Postgres server (tests cover URL handling, engine choice and the function entry point with SQLite) — check the first deploy's function logs.

### Render (alternative, single server)

- **Build**: `cd frontend && npm install && npm run build && cd ../backend && pip3 install -r requirements.txt`
- **Start**: `cd backend && python3 -m uvicorn main:app --host 0.0.0.0 --port $PORT`
- Needs a persistent disk for the SQLite files (set `DATABASE_URL` and `NOTES_DATABASE_URL` to paths on it), or a Postgres `DATABASE_URL`. `runtime.txt` pins Python 3.12 for Render.
