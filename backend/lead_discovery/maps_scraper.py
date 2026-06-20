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
PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"

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
                    name_obj = place.get("displayName", {})
                    name = name_obj.get("text", "") if isinstance(name_obj, dict) else name_obj
                    if not name or name.lower() in seen:
                        continue
                    seen.add(name.lower())
                    
                    lead = LeadContact(
                        name=f"{role.title()} at {name}" if role else name,
                        title=role.title() if role else "Company Contact",
                        company=name,
                        phone=place.get("nationalPhoneNumber", ""),
                        website=place.get("websiteUri", ""),
                        location=place.get("formattedAddress", ""),
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
        headers = {
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri",
            "Content-Type": "application/json"
        }
        body = {"textQuery": query}
        resp = await self.client.post(PLACES_SEARCH_URL, headers=headers, json=body)
        resp.raise_for_status()
        data = resp.json()
        return data.get("places", [])[:15]

    async def close(self):
        await self.client.aclose()
