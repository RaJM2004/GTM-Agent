"""
Search Scraper - Uses DuckDuckGo (ddgs) to find genuine people profiles
from LinkedIn and Google Web (university faculty, team bios, conference speakers).
Strictly validates that results are real individuals, not companies or news articles.
"""

import logging
import re
import asyncio
from typing import List, Dict, Optional
import httpx
from ddgs import DDGS

from config import settings
from schemas.discovery import LeadContact
from lead_discovery.person_validator import is_valid_person_name, clean_person_name

logger = logging.getLogger(__name__)


class GoogleSearchScraper:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT)

    async def search(self, queries: List[str], max_results: int = 50) -> List[LeadContact]:
        all_leads: List[LeadContact] = []
        seen_names = set()
        
        for query in queries:
            if len(all_leads) >= max_results:
                break
            try:
                results = await self._execute_search(query)
                leads = self._extract_leads(results)
                for lead in leads:
                    key = lead.name.lower().strip()
                    if key and key not in seen_names and len(all_leads) < max_results:
                        seen_names.add(key)
                        all_leads.append(lead)
            except Exception as e:
                logger.error(f"Search failed for '{query}': {e}")
                
        logger.info(f"Search found {len(all_leads)} verified people leads from {len(queries)} queries")
        return all_leads

    async def _execute_search(self, query: str, num: int = 35) -> Dict:
        def fetch():
            results = []
            try:
                with DDGS() as ddgs:
                    ddgs_results = ddgs.text(query, max_results=num)
                    if ddgs_results:
                        for r in ddgs_results:
                            results.append({
                                "title": r.get("title", ""),
                                "link": r.get("href", ""),
                                "snippet": r.get("body", "")
                            })
            except Exception as e:
                logger.error(f"DDGS fetch error for '{query}': {e}")
            return {"organic_results": results}

        try:
            return await asyncio.to_thread(fetch)
        except Exception as e:
            logger.error(f"DuckDuckGo search failed: {e}")
            return {"organic_results": []}

    def _extract_leads(self, results: Dict) -> List[LeadContact]:
        leads = []
        for r in results.get("organic_results", []):
            lead = self._parse_result(r.get("title", ""), r.get("link", ""), r.get("snippet", ""))
            if lead and lead.name and is_valid_person_name(lead.name):
                leads.append(lead)
        return leads

    def _parse_result(self, title: str, link: str, snippet: str) -> Optional[LeadContact]:
        if "linkedin.com/in/" in link:
            return self._parse_linkedin(title, link, snippet)
        if "crunchbase.com/person/" in link:
            return self._parse_crunchbase(title, link, snippet)
        return self._parse_general(title, link, snippet)

    def _parse_linkedin(self, title: str, link: str, snippet: str) -> Optional[LeadContact]:
        """Extract person profile from LinkedIn Google/DDG result."""
        # Clean title suffix
        clean_t = re.sub(r'\s*[-–|:]\s*LinkedIn.*$', '', title, flags=re.I).strip()
        
        # Format usually: Name - Title - Company or Name – Title at Company – Location
        segs = [s.strip() for s in re.split(r'\s*[-–|:]\s*', clean_t) if s.strip()]
        if not segs:
            return None

        raw_name = segs[0]
        name = clean_person_name(raw_name)

        if not is_valid_person_name(name):
            return None

        job_title = segs[1] if len(segs) > 1 else ""
        company = segs[2] if len(segs) > 2 else ""

        if " at " in job_title:
            parts = job_title.split(" at ", 1)
            job_title, company = parts[0].strip(), parts[1].strip()

        # If company not in title segments, attempt extraction from snippet
        if not company:
            current_m = re.search(r'(?:Current|Experience):\s*([^·\n]+)', snippet, re.I)
            if current_m:
                curr_text = current_m.group(1).strip()
                if " at " in curr_text:
                    company = curr_text.split(" at ", 1)[1].strip()
                else:
                    company = curr_text

        # Extract email if directly present in snippet
        email_m = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', snippet)
        email = email_m.group(0) if email_m and not email_m.group(0).endswith("linkedin.com") else ""

        # Extract phone if present
        phone_m = re.search(r'(?:\+\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}', snippet)
        phone = phone_m.group(0).strip() if phone_m else ""

        # Extract location if in snippet (e.g. "Location: Hyderabad", "Hyderabad, Telangana")
        loc_m = re.search(r'(?:Location:\s*)?([A-Za-z\s]+(?:,\s*[A-Za-z\s]+)*)', snippet)
        location = ""
        for city in ["Hyderabad", "Bengaluru", "Bangalore", "Mumbai", "Delhi", "Pune", "Chennai", "San Francisco", "New York", "London"]:
            if city.lower() in snippet.lower() or city.lower() in clean_t.lower():
                location = city
                break

        return LeadContact(
            name=name,
            title=job_title,
            company=company,
            email=email,
            phone=phone,
            linkedin_url=link,
            location=location,
            source="linkedin",
            confidence=0.85
        )

    def _parse_crunchbase(self, title: str, link: str, snippet: str) -> Optional[LeadContact]:
        """Extract person profile from Crunchbase /person/ profile."""
        clean_t = title.replace(" - Crunchbase Person Profile", "").replace(" - Crunchbase", "").strip()
        name = clean_person_name(clean_t)

        if not is_valid_person_name(name):
            return None

        company, job_title = "", ""
        m = re.search(r'(?:is|as)\s+(?:the\s+)?(\w+(?:\s+\w+)?)\s+(?:of|at)\s+(.+?)(?:\.|,|$)', snippet, re.I)
        if m:
            job_title, company = m.group(1).strip(), m.group(2).strip()

        return LeadContact(
            name=name,
            title=job_title,
            company=company,
            website=link,
            source="crunchbase",
            confidence=0.80
        )

    def _parse_general(self, title: str, link: str, snippet: str) -> Optional[LeadContact]:
        """
        Extract real people from university faculty directories, speaker bios,
        leadership pages, and research profiles on Google/Web.
        """
        name = ""
        job_title = ""
        company = ""

        # Pattern 1: Title starts with honorific (e.g., "Dr. John Doe - Professor of AI - IIT Hyderabad")
        honorific_m = re.match(r'^(?:Prof\.|Dr\.|Mr\.|Ms\.|Mrs\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z\.]+){1,3})\s*[-–|:]\s*(.+)', title, re.I)
        if honorific_m:
            candidate_name = clean_person_name(title.split("-")[0].split("|")[0].split("–")[0])
            if is_valid_person_name(candidate_name):
                name = candidate_name
                rem = honorific_m.group(2).strip()
                if " - " in rem or " | " in rem:
                    parts = re.split(r'\s*[-–|]\s*', rem)
                    job_title = parts[0].strip()
                    company = parts[1].strip()
                elif " at " in rem:
                    p = rem.split(" at ", 1)
                    job_title, company = p[0].strip(), p[1].strip()
                else:
                    job_title = rem

        # Pattern 2: Standard "Name - Role - Organization/University"
        if not name:
            segments = [s.strip() for s in re.split(r'\s*[-–|:]\s*', title) if s.strip()]
            if len(segments) >= 2:
                candidate = clean_person_name(segments[0])
                if is_valid_person_name(candidate):
                    # Make sure this is a person profile, not an article
                    # Check if second segment looks like a role/title or affiliation
                    kws = ['professor', 'faculty', 'director', 'head', 'dean', 'founder', 'ceo', 'cto', 'researcher', 'scientist', 'chair', 'lead', 'fellow', 'lecturer']
                    rem_text = " ".join(segments[1:]).lower()
                    if any(k in rem_text for k in kws) or any(k in snippet.lower() for k in kws):
                        name = candidate
                        job_title = segments[1]
                        if len(segments) > 2:
                            company = segments[2]
                        elif " at " in job_title:
                            p = job_title.split(" at ", 1)
                            job_title, company = p[0].strip(), p[1].strip()

        # Pattern 3: Snippet bio extraction: "Dr. / Prof. [Name] is a [Title] at [Company]"
        if not name:
            bio_m = re.search(r'(?:Dr\.|Prof\.|Mr\.|Ms\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z\.]+){1,3})\s+(?:is|serves as|works as)\s+(?:a|the)?\s*([A-Za-z\s]+?)\s+(?:at|in|of)\s+([A-Za-z0-9\s,\.\-]+?)(?:\.|\;|\n|$)', snippet, re.I)
            if bio_m:
                candidate = clean_person_name(bio_m.group(1))
                if is_valid_person_name(candidate):
                    name = candidate
                    job_title = bio_m.group(2).strip()
                    company = bio_m.group(3).strip()

        # If we couldn't find a valid person name, drop this web result (it's likely a generic article or company)
        if not name or not is_valid_person_name(name):
            return None

        # Clean job title and company from page header suffixes
        job_title = re.sub(r'\s*(?:Faculty Listing|Faculty Directory|Overview|Home|Members|Staff).*$', '', job_title, flags=re.I).strip()
        company = re.sub(r'\s*(?:Faculty Listing|Faculty Directory|Overview|Home|Members|Staff).*$', '', company, flags=re.I).strip()

        if len(job_title) > 60:
            job_title = job_title[:60].strip()

        # Extract direct contact info from snippet if available
        email_m = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', snippet)
        email = email_m.group(0) if email_m else ""
        
        # Don't take generic domain emails like info@ or office@ if we want personal
        phone_m = re.search(r'(?:\+\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}', snippet)
        phone = phone_m.group(0).strip() if phone_m else ""

        return LeadContact(
            name=name,
            title=job_title,
            company=company,
            email=email,
            phone=phone,
            website=link,
            source="google_web",
            confidence=0.70
        )

    async def close(self):
        await self.client.aclose()
