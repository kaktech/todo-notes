# Todo & Notes App

A simple, clean todo list and notes web app with a blue theme.
Built with **FastAPI** (Python) + **React** (Vite) + **SQLite**.

## Features

### Tasks
- Add, edit, complete, and delete tasks
- Reorder tasks with Up/Down buttons
- Filter: All / Active / Completed / Overdue
- Search tasks by text
- Bulk add (paste many lines at once)
- Due dates with badges (Overdue / Due today / Due in X days)
- Sort by due date toggle
- Progress bar with "X of Y tasks completed"
- Clear all completed tasks

### Notes
- Create, edit, delete notes (title + body)
- Auto-save while typing (debounced) with "Saved" indicator
- Search notes by title or content
- Last-updated time on each note

## Project Structure

```
├── backend/           # FastAPI + SQLAlchemy + SQLite
│   ├── main.py        # API endpoints + serves React build
│   ├── models.py      # Database models (Task, Note)
│   ├── schemas.py     # Pydantic validation schemas
│   ├── test_api.py    # pytest tests (44 tests)
│   └── requirements.txt
├── frontend/          # React + Vite
│   ├── src/
│   │   ├── App.jsx        # Main app with nav bar
│   │   ├── TasksPage.jsx  # Tasks page
│   │   ├── NotesPage.jsx  # Notes page
│   │   └── App.css        # Blue theme styles
│   ├── vite.config.js     # Vite config with /api proxy
│   └── index.html
├── AGENTS.md
└── README.md
```

## Local Development

### Prerequisites
- Python 3.9+
- Node.js 18+

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on http://localhost:5173 and proxies `/api` to the backend on port 8000.

### Run Tests

```bash
cd backend
python -m pytest test_api.py -v
```

## Single-Port Mode (Production)

The backend can serve the built React app at `/` while keeping API routes under `/api`.

```bash
# 1. Build the frontend
cd frontend
npm run build

# 2. Start the backend (it will serve frontend/dist automatically)
cd ../backend
python main.py
```

Now open http://localhost:8000 — the full app works on one port.

The backend looks for the build inside `frontend/dist`. If that folder is missing
(for example on a fresh clone before `npm run build`), the API still works but
there is no web page to show.

## Deploy to Render (Free Tier)

### Build Command
```bash
cd frontend && npm install && npm run build && cd ../backend && pip install -r requirements.txt
```

### Start Command
```bash
python backend/main.py
```

That's it — `backend/main.py` reads the `PORT` environment variable that Render
sets automatically, then listens on it. Locally there is no `PORT` set, so it
falls back to port 8000. The longer, equivalent form also works:

```bash
cd backend && python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Steps
1. Push this project to GitHub
2. Go to [render.com](https://render.com) and create a new **Web Service**
3. Connect your GitHub repo
4. Set the Build Command and Start Command above
5. Set the **Health Check Path** to `/api/health`
6. Deploy!

The app will be available at `https://your-app-name.onrender.com`.

> **Note about the free tier:** Render's free plan uses an *ephemeral*
> filesystem, so your `todos.db` gets wiped whenever the service restarts or
> redeploys. That's fine for trying the app out, but your tasks and notes will
> not survive a redeploy. For permanent data you would need to add a hosted
> database later.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/tasks` | List tasks (supports `?filter=`, `?search=`) |
| POST | `/api/tasks` | Create a task |
| POST | `/api/tasks/bulk` | Create multiple tasks |
| PUT | `/api/tasks/{id}` | Update a task |
| DELETE | `/api/tasks/{id}` | Delete a task |
| POST | `/api/tasks/{id}/move?direction=up\|down` | Reorder a task |
| DELETE | `/api/tasks/completed` | Clear all completed tasks |
| GET | `/api/notes` | List notes (supports `?search=`) |
| POST | `/api/notes` | Create a note |
| GET | `/api/notes/{id}` | Get a single note |
| PUT | `/api/notes/{id}` | Update a note |
| DELETE | `/api/notes/{id}` | Delete a note |
