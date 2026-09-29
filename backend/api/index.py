"""
Vercel serverless function entry point.
Vercel routes /api/* to this function via vercel.json rewrites.
"""
from fastapi import FastAPI
from mangum import Mangum

# Import the main app
from main import app

# Mangum wraps FastAPI for AWS Lambda / Vercel serverless
handler = Mangum(app)
