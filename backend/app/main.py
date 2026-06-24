"""
Genquantaa GTM OS - Backend API Server
Main entry point for the FastAPI application.
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from api.discovery import router as discovery_router
from api.campaigns import router as campaigns_router
from api.integrations import router as integrations_router
from database import connect_to_mongo, close_mongo_connection
from fastapi.staticfiles import StaticFiles

@asynccontextmanager
async def lifespan(app: FastAPI):
    connect_to_mongo()
    yield
    close_mongo_connection()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Genquantaa GTM OS API",
    description="Backend API for Genquantaa GTM OS - AI Lead Discovery and Multi-channel Campaigns",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for images
import os
STATIC_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Include Routers
app.include_router(discovery_router)
app.include_router(campaigns_router)
app.include_router(integrations_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Genquantaa GTM OS API", "version": "1.0.0"}

@app.get("/health")
def health_check():
    from config import settings
    return {
        "status": "healthy",
        "services": {
            "groq": "configured" if settings.GROQ_API_KEY else "not_configured",
            "search_engine": "duckduckgo (keyless)",
            "google_maps": "configured" if settings.GOOGLE_MAPS_API_KEY else "not_configured",
            "apollo": "configured" if settings.APOLLO_API_KEY else "not_configured",
        }
    }

if __name__ == "__main__":
    import uvicorn
    from config import settings
    logger.info(f"Starting GTM OS API on {settings.HOST}:{settings.PORT}")
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)

