"""
Discovery API Router - FastAPI endpoints for the lead discovery feature.
"""

import json
import logging
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from schemas.discovery import DiscoveryRequest, DiscoveryResponse, ParsedQuery
from lead_discovery.discovery_engine import DiscoveryEngine
from lead_discovery.prompt_parser import PromptParser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/discovery", tags=["discovery"])

# Shared engine instance
engine = DiscoveryEngine()


# ── ICP Scoring Models ──────────────────────────────────────────────────────────

class LeadForScoring(BaseModel):
    name: str = ""
    title: str = ""
    company: str = ""
    email: str = ""
    phone: str = ""
    linkedin_url: str = ""
    website: str = ""
    location: str = ""
    industry: str = ""
    confidence: float = 0.0

class ICPScoringRequest(BaseModel):
    leads: List[LeadForScoring]
    original_query: str = ""

class ICPScoreResult(BaseModel):
    score: float = 0.0
    reasoning: str = ""

class ICPScoringResponse(BaseModel):
    scores: List[ICPScoreResult]


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
        
        # Save to MongoDB
        from database import save_leads
        await save_leads(result.leads, request.prompt, request.user_id)
        
        logger.info(f"[API] Discovery complete: {result.total_found} leads found")
        return result
    except ValueError as ve:
        logger.warning(f"[API] Discovery validation failed: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"[API] Discovery failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Discovery failed: {str(e)}")


@router.post("/score-icp", response_model=ICPScoringResponse)
async def score_icp(request: ICPScoringRequest):
    """
    ICP (Ideal Customer Profile) Scoring endpoint.
    
    Takes discovered leads and scores them 0-100 based on:
    - Data accuracy: Is the name real? Does the email look legitimate?
    - Role match: Does the title match what was searched for?
    - Company validity: Does the company name look real and match the industry?
    - Location match: Does the location match the search criteria?
    - Contact quality: Are email/phone real or pattern-generated?
    """
    try:
        from config import settings
        from groq import AsyncGroq

        if not settings.GROQ_API_KEY:
            # Fallback: heuristic scoring without AI
            scores = [_heuristic_score(lead, request.original_query) for lead in request.leads]
            return ICPScoringResponse(scores=scores)

        client = AsyncGroq(api_key=settings.GROQ_API_KEY)

        # Process in batches of 15 to stay within token limits
        all_scores: List[ICPScoreResult] = []
        batch_size = 15

        for i in range(0, len(request.leads), batch_size):
            batch = request.leads[i:i + batch_size]
            batch_scores = await _score_batch_with_ai(client, batch, request.original_query)
            all_scores.extend(batch_scores)

        return ICPScoringResponse(scores=all_scores)
    except Exception as e:
        logger.error(f"[API] ICP Scoring failed: {e}", exc_info=True)
        # Fallback to heuristic scoring on any error
        scores = [_heuristic_score(lead, request.original_query) for lead in request.leads]
        return ICPScoringResponse(scores=scores)


async def _score_batch_with_ai(client, leads: List[LeadForScoring], original_query: str) -> List[ICPScoreResult]:
    """Use Groq AI to score a batch of leads for ICP fitness."""

    leads_text = ""
    for idx, lead in enumerate(leads):
        leads_text += f"""
Lead #{idx + 1}:
  Name: {lead.name}
  Title: {lead.title}
  Company: {lead.company}
  Email: {lead.email}
  Phone: {lead.phone}
  LinkedIn: {lead.linkedin_url}
  Website: {lead.website}
  Location: {lead.location}
  Industry: {lead.industry}
"""

    scoring_prompt = f"""You are an expert B2B lead quality analyst. Score each lead on a scale of 0-100 for ICP (Ideal Customer Profile) fitness.

ORIGINAL SEARCH QUERY: "{original_query}"

LEADS TO SCORE:
{leads_text}

SCORING CRITERIA (weight each equally):
1. **Name Authenticity (0-20)**: Is this a real person's name? Generic names like "Founder at XYZ" or "Company Contact" score 0. Real full names (first + last) score 15-20.
2. **Role/Title Match (0-20)**: Does the title match what was searched for? Exact match = 20, related = 10-15, generic/missing = 0-5.
3. **Company Validity (0-20)**: Does the company name look real and established? Is it in the right industry? Real company = 15-20, generic/unknown = 5-10, missing = 0.
4. **Contact Data Quality (0-20)**: Is the email a real corporate email (not pattern-generated like firstname@companyname.com)? Is the phone a real number (not randomly generated)?  Corporate email = 15-20, pattern email = 5-10, clearly fake = 0-5.
5. **Location/Industry Match (0-20)**: Does the lead's location and industry match the search criteria? Perfect match = 20, partial = 10, no match = 0.

Return ONLY a valid JSON array (no markdown, no code fences, no explanation outside the JSON). Each element must have:
- "score": integer 0-100
- "reasoning": one-line explanation (max 100 chars)

Example: [{{"score": 85, "reasoning": "Real founder with corporate email, matches AI industry in Hyderabad"}}, ...]

Return exactly {len(leads)} objects in the array, one per lead in order."""

    try:
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": scoring_prompt}],
            temperature=0.0,
        )

        text = response.choices[0].message.content.strip()
        # Strip markdown code fences if present
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)

        data = json.loads(text)

        results = []
        for item in data:
            results.append(ICPScoreResult(
                score=max(0, min(100, item.get("score", 0))),
                reasoning=item.get("reasoning", "")
            ))

        # Pad if AI returned fewer results
        while len(results) < len(leads):
            results.append(ICPScoreResult(score=0, reasoning="Scoring unavailable"))

        return results[:len(leads)]

    except Exception as e:
        logger.error(f"AI scoring failed for batch: {e}")
        return [_heuristic_score(lead, original_query) for lead in leads]


def _heuristic_score(lead: LeadForScoring, query: str) -> ICPScoreResult:
    """Fallback heuristic scoring when AI is unavailable."""
    score = 0
    reasons = []
    query_lower = query.lower()

    # Name quality (0-20)
    name_parts = lead.name.strip().split()
    if len(name_parts) >= 2 and not any(w in lead.name.lower() for w in ["at ", "company", "contact"]):
        score += 18
        reasons.append("real name")
    elif len(name_parts) >= 1:
        score += 5

    # Title match (0-20)
    if lead.title:
        role_keywords = ["founder", "ceo", "cto", "coo", "director", "head", "vp", "manager", "lead"]
        if any(k in lead.title.lower() for k in role_keywords):
            score += 15
            if any(k in query_lower for k in lead.title.lower().split()):
                score += 5
                reasons.append("title matches query")
        else:
            score += 5

    # Company validity (0-20)
    if lead.company and len(lead.company) > 2:
        score += 15
        reasons.append("has company")
    
    # Contact quality (0-20)
    if lead.email:
        if "@gmail.com" in lead.email or "@yahoo.com" in lead.email:
            score += 5
        elif lead.email.count("@") == 1 and "." in lead.email.split("@")[1]:
            score += 15
            reasons.append("corporate email")
    if lead.phone:
        score += 5

    # Location match (0-20)
    if lead.location:
        score += 10
        if lead.location.lower() in query_lower or any(w in query_lower for w in lead.location.lower().split(",")):
            score += 10
            reasons.append("location matches")

    reasoning = "; ".join(reasons) if reasons else "Heuristic scoring"
    return ICPScoreResult(score=min(100, score), reasoning=reasoning)


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
