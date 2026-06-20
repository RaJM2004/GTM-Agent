"""
Discovery API Router - FastAPI endpoints for the lead discovery feature.
"""

import logging
from fastapi import APIRouter, HTTPException

from schemas.discovery import DiscoveryRequest, DiscoveryResponse, ParsedQuery
from lead_discovery.discovery_engine import DiscoveryEngine
from lead_discovery.prompt_parser import PromptParser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/discovery", tags=["discovery"])

# Shared engine instance
engine = DiscoveryEngine()


@router.post("/search", response_model=DiscoveryResponse)
async def discover_leads(request: DiscoveryRequest):
    """
    AI-powered lead discovery endpoint.
    
    Accepts a natural language prompt and returns real-time lead data
    scraped from Google Search, Google Maps, and company websites.
    
    Example prompt: "Find 50 founders of AI companies with 5+ years of experience in Hyderabad"
    """
    try:
        logger.info(f"[API] Discovery request: {request.prompt}")
        result = await engine.discover(request)
        logger.info(f"[API] Discovery complete: {result.total_found} leads found")
        return result
    except ValueError as ve:
        logger.warning(f"[API] Discovery validation failed: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"[API] Discovery failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Discovery failed: {str(e)}")


@router.post("/parse", response_model=ParsedQuery)
async def parse_prompt(request: DiscoveryRequest):
    """
    Parse a natural language prompt into structured search parameters.
    Useful for previewing what the AI understood before running full discovery.
    """
    try:
        parser = PromptParser()
        parsed = await parser.parse(request.prompt)
        return parsed
    except Exception as e:
        logger.error(f"[API] Parse failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Parse failed: {str(e)}")


@router.get("/health")
async def discovery_health():
    """Health check for the discovery service."""
    from config import settings
    return {
        "status": "healthy",
        "services": {
            "groq_api": "configured" if settings.GROQ_API_KEY else "not_configured",
            "search_engine": "duckduckgo (keyless)",
            "google_maps": "configured" if settings.GOOGLE_MAPS_API_KEY else "not_configured",
            "apollo": "configured" if settings.APOLLO_API_KEY else "not_configured",
            "debug_apollo_key": settings.APOLLO_API_KEY,
            "debug_maps_key": settings.GOOGLE_MAPS_API_KEY,
            "debug_engine_key": engine.apollo.api_key
        }
    }
