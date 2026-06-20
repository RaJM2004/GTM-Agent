"""
Apollo.io Enrichment Service - Uses Apollo's API to find verified personal 
emails and phone numbers based on name and company.
"""

import logging
import asyncio
from typing import Dict, Optional, Tuple
import httpx

from config import settings

logger = logging.getLogger(__name__)

class ApolloEnrichment:
    def __init__(self):
        self.api_key = settings.APOLLO_API_KEY
        self.client = httpx.AsyncClient(timeout=15)
        self.match_url = "https://api.apollo.io/v1/people/match"

    async def enrich_person(self, name: str, company: str) -> Tuple[str, str]:
        """
        Takes a name and company and attempts to find a verified email and phone number.
        Returns (email, phone).
        """
        if not self.api_key or not name or not company:
            return "", ""

        # Attempt to split name into first and last
        parts = name.strip().split()
        first_name = parts[0]
        last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

        payload = {
            "first_name": first_name,
            "last_name": last_name,
            "organization_name": company
        }
        
        headers = {
            "Content-Type": "application/json",
            "X-Api-Key": self.api_key
        }

        try:
            resp = await self.client.post(self.match_url, json=payload, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                person = data.get("person")
                if person:
                    email = person.get("email", "")
                    # Try to get mobile or corporate phone
                    phone = ""
                    for phone_obj in person.get("phone_numbers", []):
                        if phone_obj.get("sanitized_number"):
                            phone = phone_obj.get("sanitized_number")
                            # If it's mobile, break and use it
                            if phone_obj.get("type") == "mobile":
                                break
                    return email, phone
            return "", ""
        except Exception as e:
            logger.error(f"Apollo enrichment failed for {name}: {e}")
            return "", ""

    async def close(self):
        await self.client.aclose()
