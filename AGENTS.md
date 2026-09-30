# AGENTS.md

Instructions for AI coding agents working on this repository. Read this file first and follow it in every session.

## Project overview

**Pane** is a glass-styled planner: a Today view, a Week board and Notes, with one-line quick add ("gym tomorrow 6pm for an hour"). The GitHub repo is `kaktech/todo-notes` (older names in the code and history: TaskFlow).

- **Stack**: FastAPI (Python) + SQLAlchemy backend, React 19 + Vite frontend (plain CSS), SQLite locally, Postgres in production.
- **No login.** Each browser gets a random id (`user_id` in localStorage) and only sees its own tasks, lists, tags and notes.
- **Hosting**: one Vercel project — static frontend, the API as a serverless Python function, and a Postgres database.
- **The owner is a beginner**: keep code simple and readable, avoid clever tricks, explain WHY in comments (not WHAT).

## Special features

What makes Pane different from a plain to-do list. Keep these working and keep them the way they are.

1. **One-line quick add** — type "gym tomorrow 6pm for an hour" and Pane fills in the day, start time and length, live, as chips (`parseQuickAdd`). It works in the composer, the Today search line (press Enter) and the laptop side-rail Quick add box.
2. **"Now" card with a live countdown ring** — the task happening right now, minutes left, **Done** and **+15 min** buttons. When nothing is running it shows how long you are free and offers **Fill the gap**.
3. **Slipped tray** — overdue tasks are not a red wall of shame. Tap one to move it to Today or Tomorrow, edit it or delete it, in one step.
4. **Week board** — seven day columns; drag a card to another day to reschedule it (its time is kept). Swipeable on phones.
5. **Two layouts on purpose** — a floating glass dock on phones; a top bar, a Today dashboard with a side rail (quick add, today-so-far progress, Slipped, this-week overview) and a list-plus-editor Notes page on laptops.
6. **Frosted-glass design in light, dark or system mode** — blurred translucent panels over a blue gradient; the whole look is driven by CSS variables.
7. **Tint and glyph for every task** — a colour and one of 24 glyphs, shown on tiles, the Week board and the Now card.
8. **Flexible durations** — 17 preset lengths from 5 minutes to 8 hours plus a custom-minutes box.
9. **Anytime tasks you can drag to reorder**, plus Timed tasks that sort themselves by start time.
10. **Lists, tags, steps and repeats** — colour-coded lists, #tags on tiles, checklist steps inside a task, and daily/weekly/monthly repeating tasks that create the next one when you finish.
11. **Notes that save themselves** — glass sticky-note tiles with search, auto-save and a "Saved" indicator; nothing is lost when you leave the editor.
12. **Load sample data / Back to empty** — one click fills every screen with realistic tasks, lists, tags and notes so reviewers see everything; one click returns to a clean empty state.
13. **No login, private by browser** — open the site and start; each browser keeps its own data.
14. **Runs on one Vercel project** — static frontend, the API as a serverless function, and Postgres for saved data.

## Setup commands

```bash
# Backend (http://localhost:8000). Python 3.9+ locally; Vercel builds with the newest Python.
cd backend
python3 -m venv ../venv
../venv/bin/pip install -r requirements.txt
../venv/bin/python -m uvicorn main:app --port 8000

# Frontend (http://localhost:5173, proxies /api to the backend)
cd frontend
npm install
npm run dev
```

| Task | Command |
| --- | --- |
| Run backend tests | `cd backend && ../venv/bin/python -m pytest -q` |
| Lint the frontend | `cd frontend && npx oxlint` |
| Build the frontend | `cd frontend && npx vite build` |
| Health check | `curl localhost:8000/api/health` → `{"status":"ok"}` |

`psycopg2-binary` may not install on an old local pip; it is only needed for Postgres, and the tests do not use it.

## Workflow and PR instructions

- **Before you say a task is done**: backend tests pass, `npx oxlint` shows no errors, `npx vite build` succeeds. If any command fails, fix the cause and re-run — never skip or delete a failing test.
- **Also check it works**: for UI changes run the app and use it (desktop width and phone widths 375, 390, 414); for backend changes start the real server and hit key endpoints with curl.
- **Git**: work on a branch, then fast-forward merge into `master` and push (the owner has asked for every change to be committed and merged). Write a descriptive commit message; end it with the co-author line.
- **Anti-loop rule**: if you catch yourself repeating the same diagnosis or plan without making a code edit, STOP and make the edit. Then report only "Fixed" or "Still broken: [one sentence]".
- **Be honest**: say clearly what was tested and what was not (for example, "not tested on a live Vercel deploy").

## Project structure

Organise by feature, not by file type. New code goes in its feature's folder.

```
api/index.py          # Vercel function entry (imports backend/main.py)
vercel.json           # build command, output folder, /api/* -> function
requirements.txt      # dependencies Vercel installs for the function
backend/
  features/
    auth/ tasks/ categories/ tags/ subtasks/ notes/   # models.py, routes.py, schemas.py, test_*.py
  database.py         # SQLite locally / Postgres when DATABASE_URL is set; add_missing_columns()
  database_notes.py   # notes engine (own SQLite file locally, shared Postgres in production)
  main.py             # wires feature routers together ONLY — no other logic
frontend/src/
  features/           # today/ week/ composer/ tasks/ categories/ tags/ subtasks/ notes/ settings/
  shared/             # AppShell, Dock, TopNav, Icon, EmptyState, ThemeContext, api.js, user.js,
                      # dates.js, useNow.js, useMediaQuery.js
  theme/colors.js     # tint choices (theme colours are CSS variables in App.css)
```

## Code style and naming

- **Python**: PEP 8, type hints where helpful. Files `lowercase_with_underscores`; variables `snake_case`.
- **JavaScript**: functional components with hooks. Components `PascalCase`; variables `camelCase`.
- **CSS**: plain CSS in `frontend/src/App.css`, classes `kebab-case`. No UI framework or component library (only `@dnd-kit` for drag and drop).
- **API endpoints** are `kebab-case`; **database columns** are `snake_case`.
- **Comments** explain WHY, not WHAT.
- Dates are local-time `"YYYY-MM-DD"` strings from `shared/dates.js` — never `toISOString()` (it shifts the day near midnight).

## Testing instructions

- Write tests for every endpoint: success, error (404, 422) and, for `/api/auth/*`, unauthorized (401). The data endpoints identify users by `user_id`, not a token.
- Tests use a temporary SQLite database, never the real `app.db`. There are 102 backend tests; keep them all passing.
- When fixing a bug, add a regression test and record it under "Known pitfalls" below if it could come back.
- There is no frontend test runner. The quick-add parser can be checked with a small Node script; UI is verified by running the app.

## Architecture and API rules

- **Data isolation**: data endpoints take a `user_id` from the frontend (the browser's random id, `shared/user.js`). Every task, list, tag and note is linked to a `user_id` — always filter by it. Anyone who knows an id can read that data: it separates users, it is not security.
- All endpoints live under `/api`, return JSON and use proper status codes (200, 201, 204, 404, 422). Validate input with Pydantic (reject empty titles with 422).
- Define specific routes (e.g. `/api/tasks/completed`, `/api/tags/task-map`) BEFORE parameterised ones (`/api/tasks/{task_id}`).
- **Database**: `create_all()` never alters existing tables, so every new column must also be listed in `NEW_COLUMNS` in `backend/database.py` (added at startup by `add_missing_columns()`).
- Tasks carry optional `color` and `icon`. Deleting a task or tag must clean up related rows (see pitfalls).
- Auth endpoints (`/api/auth/*`) still exist but the frontend does not use them.

## Design system — "Pane" (frosted glass, blue)

Translucent blurred panels over a soft blue gradient, bright top edges, gentle shadows, very round corners, one blue accent. No hard black borders or offset shadows (the old neobrutalist look — do not bring it back). All colours are CSS variables at the top of `App.css` (`:root` and `:root[data-theme='dark']`); never hardcode a theme colour elsewhere.

**This is an original layout, not a copy of any reference app.** Keep wording and structure our own: sentence case, and the words Now / Up next / Anytime / Slipped / Open air / Tint / Glyph / Steps / Setup. Do not add a left sidebar, a month-calendar sidebar, a day-strip + free-time timeline, or a long stacked "new task" modal.

**Two layouts on purpose (break at 900px).**
- *Phones and tablets (under 900px)*: floating glass **Dock** (Today · Week · + · Notes · Setup), single column, bottom-sheet composer, Notes as tiles that open a full editor.
- *Laptops (900px and up)*: **TopNav** (brand, tabs, Add task) and no dock; Today is a two-column dashboard with a sticky glass **side rail** (quick add, today-so-far bar, Slipped with Today/Tomorrow buttons, this-week glance); Notes is a list with an always-open editor; Setup is two columns; the composer is a wider card with vertical tabs.
- Switch with the CSS media query, or `useMediaQuery(DESKTOP_QUERY)` when React must render a different tree. Keep the two layouts different — do not merge them.

**Look**
- Light: sky-blue gradient (#DCEBFF → #B7D3FF) with blue/cyan/violet blobs, glass rgba(255,255,255,.36), text #0F1B3D, muted #5B6B8C. Dark: deep navy gradient (#0A1330 → #10285C), glass rgba(255,255,255,.07), text #EAF1FF, muted #9DB0D6. Appearance is System / Light / Dark in Setup (localStorage `theme`, `data-theme` on `<html>`, default Light).
- Primary accent: blue gradient #5AA9FF → #2F6BFF with white text. Secondary: sky gradient #8BE9FF → #38BDF8 with dark text.
- Glass recipe: `background: var(--sheen), var(--glass)` + `backdrop-filter: var(--blur)` + 1px `--glass-border` + `--glass-edge` hairline + bright top edge `--hi-top` + soft shadow. Add new panel classes to the shared glass selector list in `App.css`. Text-heavy panels (composer, dock) are more opaque; a `@supports` fallback keeps panels readable without backdrop-filter.
- Type: Plus Jakarta Sans — 800 headings, 700 buttons and labels; small uppercase "eyebrow" labels with letter-spacing.

**Screens**
- **Today** (`features/today`): greeting and a find-or-add line (typing filters; Enter opens the composer with that text); **Now** card with a countdown ring, Done and +15 min (or "Free for…" with Fill the gap); **Slipped** overdue tasks (move to Today/Tomorrow, edit, delete); **Up next** tiles; **Anytime** tiles (drag to reorder); **Done** (collapsed). Empty day = "Open air".
- **Week** (`features/week`): seven day columns; drag a card to another day to reschedule (the time is kept); on phones the columns swipe; jump to any date.
- **Composer** (`features/composer`): one line to type — `parseQuickAdd` in `features/tasks/quickAdd.js` understands "gym tomorrow 6pm for an hour" (dates like 5/10 are day/month). Tabs: When · Look (tint + glyph) · Details (notes, list, priority, repeat) · Tags · Steps. Durations: 5m to 8h plus a custom-minutes box. New tasks default to today.
- **Task tiles** (`features/tasks/PaneTile.jsx`) show ONLY: glyph, time line, bold title (struck through and muted when done), chips (High priority, list, #tags), Mark done, edit, delete. Never show the raw description on a tile — it lives in the composer's Details tab. Tags for all tasks come from one call, `GET /api/tags/task-map`.
- **Notes**: glass sticky-note tiles; open a note for a full editor with auto-save. **Setup**: appearance, lists, tags, sample data, clear every task.
- **Sample data**: Setup has "Load sample data" and "Back to empty" (`features/settings/sampleData.js`), and the empty Today screen offers Load sample data too. It creates tasks (running now, later, anytime, done, overdue, this week, repeating), 3 lists, 3 tags, steps and 3 notes through the normal API; "Back to empty" deletes all of them.

## Known pitfalls — do not reintroduce these

- **Title/description merge**: title and description must always be separate state. If you touch the task form, re-verify they are still independent.
- **Tags on a new task**: never assume `task.id` exists. Hold selected tags in local state and attach them through the API only after the task is saved and has a real id.
- **Steps (subtasks) on a new task**: same rule as tags.
- **Demo data**: never seed default lists or tasks for new users — they start empty. Sample data is only ever loaded by the user's click.
- **Orphan rows on delete**: deleting a task must also delete its tag links and subtasks, and deleting a tag must remove its links. Postgres enforces the foreign keys, and SQLite reuses ids, so leftovers attached themselves to the next task. Any new child table needs the same cleanup. Regression tests: `TestDeleteCleansUp` in `backend/features/tasks/test_tasks.py`.
- **Notes auto-save**: flush unsaved edits when leaving the editor, and never PUT an empty title (422).

## Deployment

**Vercel (primary)** — one project runs everything.
1. Import the GitHub repo in Vercel: framework preset **Other**, root directory = repo root. `vercel.json` sets the build command (`cd frontend && npm install && npm run build`), output folder (`frontend/dist`) and the `/api/*` → `api/index.py` rewrite.
2. Add a **Postgres** database (Storage tab, Neon). It sets `DATABASE_URL` / `POSTGRES_URL`. Without one the function refuses to start on Vercel (its disk is read-only and temporary).
3. Turn **Deployment Protection off** (Project → Settings) so anyone can open the site without logging in to Vercel.
4. Deploy, then open `https://<site>/api/health` — it should return `{"status":"ok"}`.

Notes:
- Tables are created automatically on the first request (`create_all` + `add_missing_columns`).
- Vercel builds with the newest Python (3.14 at the time of writing), so keep `requirements.txt` on releases that ship wheels for it (e.g. `psycopg2-binary>=2.9.11`). "Failed to build psycopg2 / pg_config not found" means a package has no wheel for Vercel's Python.
- The frontend calls relative `/api`, so no CORS and no `VITE_API_URL` are needed.
- Data in a local `app.db` is not copied to Postgres.
- Tests cover URL handling, engine choice and the function entry point with SQLite; a real Postgres server and a live Vercel deploy have not been tested here — check the function logs after the first deploy.

**Render (alternative single server)**: build `cd frontend && npm install && npm run build && cd ../backend && pip3 install -r requirements.txt`; start `cd backend && python3 -m uvicorn main:app --host 0.0.0.0 --port $PORT`. Needs a persistent disk for the SQLite files (set `DATABASE_URL` and `NOTES_DATABASE_URL` to paths on it) or a Postgres `DATABASE_URL`. `runtime.txt` pins Python 3.12.

## Security and privacy

- Never commit secrets, connection strings or `.env` files. Database URLs live only in Vercel environment variables.
- Do not log or display another user's data; filter every query by `user_id`.
- Database files (`*.db`) are git-ignored and must stay that way.
