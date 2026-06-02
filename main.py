# Root-level entry point for Azure App Service
# This re-exports the FastAPI app from the backend package
# so that both "uvicorn main:app" and "uvicorn backend.main:app" work.
from backend.main import app
