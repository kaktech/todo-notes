"""
Vercel entry point: exposes the FastAPI app as a serverless function.
vercel.json rewrites every /api/... request here; the app's own routes already start with /api.
"""
import os
import sys

# The backend lives in ../backend and imports its modules by plain name (features.*, database)
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

from main import app  # noqa: E402,F401  (Vercel looks for a variable called `app`)
