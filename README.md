# Pane

A glass-styled planner: today view, week board and notes, with one-line quick add ("gym tomorrow 6pm for an hour").
Built with **FastAPI** (Python) + **React** (Vite) + **SQLite** locally / **Postgres** on Vercel.

There is no login: each browser gets its own private id, and everything is saved under it.

## Run it locally

```bash
# backend (http://localhost:8000)
cd backend
python3 -m venv ../venv && ../venv/bin/pip install -r requirements.txt
../venv/bin/python -m uvicorn main:app --port 8000

# frontend (http://localhost:5173, proxies /api to the backend)
cd frontend
npm install
npm run dev
```

Tests: `cd backend && ../venv/bin/python -m pytest`

## Host it on Vercel

1. Import this repo at vercel.com (framework preset **Other**, root directory = repo root).
2. In the project's **Storage** tab, create a **Postgres** database and connect it to the project.
3. Deploy, then open `https://<your-site>/api/health` to confirm the API is up.

`vercel.json` builds the frontend, serves it as static files and sends `/api/*` to the Python function in `api/index.py`.

See `AGENTS.md` for the design system, architecture and project rules.
