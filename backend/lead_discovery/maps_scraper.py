"""
Google Maps Scraper - Uses Google Places API to find businesses
and extract contact information (phone, website, address).
"""

import logging
from typing import List, Dict
import httpx

from config import settings
from schemas.discovery import LeadContact

logger = logging.getLogger(__name__)
PLACES_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
PLACES_DETAIL_URL = "https://maps.googleapis.com/maps/api/place/details/json"


class GoogleMapsScraper:
    def __init__(self):
        self.api_key = settings.GOOGLE_MAPS_API_KEY
        self.client = httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT)

    async def search_businesses(self, industry: str, location: str, role: str = "", max_results: int = 30) -> List[LeadContact]:
        if not self.api_key:
            logger.warning("GOOGLE_MAPS_API_KEY not set - skipping Maps search")
            return []
        
        queries = [
            f"{industry} companies in {location}",
            f"{industry} startups in {location}",
            f"{industry} technology company {location}",
        ]
        
        all_leads: List[LeadContact] = []
        seen = set()
        
        for query in queries:
            if len(all_leads) >= max_results:
                break
            try:
                places = await self._text_search(query)
                for place in places:
                    if len(all_leads) >= max_results:
                        break
                    name = place.get("name", "")
                    if name.lower() in seen:
                        continue
                    seen.add(name.lower())
                    
                    detail = await self._get_details(place.get("place_id", ""))
                    lead = LeadContact(
                        name=f"{role.title()} at {name}" if role else name,
                        title=role.title() if role else "Company Contact",
                        company=name,
                        phone=detail.get("formatted_phone_number", ""),
                        website=detail.get("website", ""),
                        location=detail.get("formatted_address", place.get("formatted_address", "")),
                        source="google_maps",
                        confidence=0.65,
                        industry=industry,
                    )
                    all_leads.append(lead)
            except Exception as e:
                logger.error(f"Maps search failed for '{query}': {e}")
        
        logger.info(f"Google Maps found {len(all_leads)} businesses")
        return all_leads

    async def _text_search(self, query: str) -> List[Dict]:
        params = {"query": query, "key": self.api_key, "type": "establishment"}
        resp = await self.client.get(PLACES_SEARCH_URL, params=params)
        resp.raise_for_status()
        data = resp.json()
        return data.get("results", [])[:15]

    async def _get_details(self, place_id: str) -> Dict:
        if not place_id:
            return {}
        params = {"place_id": place_id, "key": self.api_key, "fields": "formatted_phone_number,website,formatted_address,name,url"}
        try:
            resp = await self.client.get(PLACES_DETAIL_URL, params=params)
            resp.raise_for_status()
            return resp.json().get("result", {})
        except Exception as e:
            logger.error(f"Place details failed: {e}")
            return {}

    async def close(self):
        await self.client.aclose()
