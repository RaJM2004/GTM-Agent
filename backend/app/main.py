"""
Genquantaa GTM OS - Backend API Server
Main entry point for the FastAPI application.
"""

import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from api.discovery import router as discovery_router
from api.campaigns import router as campaigns_router
from api.integrations import router as integrations_router
from api.leads import router as leads_router
from api.contacts import router as contacts_router
from api.auth import router as auth_router
from api.dashboard import router as dashboard_router
from api.payments import router as payments_router
from api.admin import router as admin_router
from api.notifications import router as notifications_router
from api.whatsapp import router as whatsapp_router
from database import connect_to_mongo, close_mongo_connection
from fastapi.staticfiles import StaticFiles
from middlewares.audit_logger import AuditLoggerMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from services.background_poller import background_email_poller
import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    connect_to_mongo()
    
    # Start the background email polling task
    polling_task = asyncio.create_task(background_email_poller())
    
    yield
    
    polling_task.cancel()
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

# Rate Limiter (slowapi)
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173", 
        "http://localhost:5174", 
        "http://127.0.0.1:5174",
        "https://green-dune-0f170e510.7.azurestaticapps.net"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Audit Logger Middleware (additive — does not change response behaviour)
app.add_middleware(AuditLoggerMiddleware)

# Mount static files for images
import os
STATIC_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Include Routers
app.include_router(auth_router)
app.include_router(discovery_router)
app.include_router(campaigns_router)
app.include_router(integrations_router)
app.include_router(leads_router)
app.include_router(contacts_router)
app.include_router(dashboard_router)
app.include_router(payments_router)
app.include_router(admin_router)
app.include_router(notifications_router)
app.include_router(whatsapp_router)
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
            "vapi": "configured" if settings.VAPI_API_KEY else "not_configured",
        }
    }

# Root-level webhook alias for VAPI (ngrok URL points here)
@app.post("/vapi-webhook")
async def vapi_webhook_root(request: Request):
    """Root-level VAPI webhook — forwards to the campaigns voice webhook handler."""
    from api.campaigns import voice_webhook
    return await voice_webhook(request)

if __name__ == "__main__":
    import uvicorn
    from config import settings
    logger.info(f"Starting GTM OS API on {settings.HOST}:{settings.PORT}")
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)

