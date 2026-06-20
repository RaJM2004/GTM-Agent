"""
Google Search Scraper - Uses SerpAPI for structured Google results.
Primary data source for finding real people matching discovery criteria.
"""

import logging
import re
from typing import List, Dict, Optional
import httpx
from bs4 import BeautifulSoup

from config import settings
from schemas.discovery import LeadContact

logger = logging.getLogger(__name__)
SERPAPI_BASE = "https://serpapi.com/search.json"


class GoogleSearchScraper:
    def __init__(self):
        self.api_key = settings.SERPAPI_KEY
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
        logger.info(f"Google Search found {len(all_leads)} leads from {len(queries)} queries")
        return all_leads

    async def _execute_search(self, query: str, num: int = 20) -> Dict:
        if not self.api_key:
            return await self._fallback_search(query, num)
        params = {"engine": "google", "q": query, "api_key": self.api_key, "num": num, "hl": "en"}
        resp = await self.client.get(SERPAPI_BASE, params=params)
        resp.raise_for_status()
        return resp.json()

    async def _fallback_search(self, query: str, num: int = 20) -> Dict:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }
        try:
            resp = await self.client.get("https://www.google.com/search", params={"q": query, "num": num}, headers=headers, follow_redirects=True)
            if resp.status_code == 200:
                return self._parse_html(resp.text)
        except Exception as e:
            logger.error(f"Fallback search failed: {e}")
        return {"organic_results": []}

    def _parse_html(self, html: str) -> Dict:
        soup = BeautifulSoup(html, "lxml")
        results = []
        for div in soup.select("div.g, div.tF2Cxc"):
            title_el = div.select_one("h3")
            link_el = div.select_one("a[href]")
            snippet_el = div.select_one("div.VwiC3b, span.aCOpRe")
            if title_el and link_el:
                href = link_el.get("href", "")
                if href.startswith("/url?q="):
                    href = href.split("/url?q=")[1].split("&")[0]
                results.append({"title": title_el.get_text(strip=True), "link": href, "snippet": snippet_el.get_text(strip=True) if snippet_el else ""})
        return {"organic_results": results}

    def _extract_leads(self, results: Dict) -> List[LeadContact]:
        leads = []
        for r in results.get("organic_results", []):
            lead = self._parse_result(r.get("title",""), r.get("link",""), r.get("snippet",""))
            if lead and lead.name:
                leads.append(lead)
        return leads

    def _parse_result(self, title: str, link: str, snippet: str) -> Optional[LeadContact]:
        if "linkedin.com/in/" in link:
            return self._parse_linkedin(title, link, snippet)
        if "crunchbase.com" in link:
            return self._parse_crunchbase(title, link, snippet)
        return self._parse_general(title, link, snippet)

    def _parse_linkedin(self, title: str, link: str, snippet: str) -> Optional[LeadContact]:
        parts = title.replace(" | LinkedIn","").replace(" - LinkedIn","")
        segs = [s.strip() for s in parts.split(" - ")]
        name = re.sub(r'[^\w\s.\-]', '', segs[0]).strip() if segs else ""
        job_title = segs[1] if len(segs) > 1 else ""
        company = segs[2] if len(segs) > 2 else ""
        if " at " in job_title:
            p = job_title.split(" at ", 1)
            job_title, company = p[0].strip(), p[1].strip()
        if not name or len(name) < 2:
            return None
        return LeadContact(name=name, title=job_title, company=company, linkedin_url=link, source="google_linkedin", confidence=0.75)

    def _parse_crunchbase(self, title: str, link: str, snippet: str) -> Optional[LeadContact]:
        name = title.replace(" - Crunchbase Person Profile","").replace(" - Crunchbase","").strip()
        company, job_title = "", ""
        m = re.search(r'(?:is|as)\s+(?:the\s+)?(\w+(?:\s+\w+)?)\s+(?:of|at)\s+(.+?)(?:\.|,|$)', snippet, re.I)
        if m:
            job_title, company = m.group(1).strip(), m.group(2).strip()
        if not name or len(name) < 2:
            return None
        return LeadContact(name=name, title=job_title, company=company, website=link, source="google_crunchbase", confidence=0.7)

    def _parse_general(self, title: str, link: str, snippet: str) -> Optional[LeadContact]:
        email_m = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', snippet)
        phone_m = re.search(r'(?:\+\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}', snippet)
        name, job_title, company = "", "", ""
        m = re.match(r'^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\s*[-|,]\s*(.+)', title)
        if m:
            name = m.group(1).strip()
            rem = m.group(2).strip()
            kws = ['founder','ceo','cto','director','head','vp','manager','lead','president']
            if any(k in rem.lower() for k in kws):
                job_title = rem.split(" at ")[0].strip()
                if " at " in rem:
                    company = rem.split(" at ")[1].strip()
            else:
                company = rem
        if not name or not re.match(r'^[A-Za-z]+(?:\s+[A-Za-z]+)+$', name):
            return None
        return LeadContact(name=name, title=job_title, company=company, email=email_m.group(0) if email_m else "", phone=phone_m.group(0).strip() if phone_m else "", website=link, source="google_web", confidence=0.5)

    async def close(self):
        await self.client.aclose()
