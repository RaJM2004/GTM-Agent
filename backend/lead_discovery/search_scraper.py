"""
DuckDuckGo Search Scraper - Uses ddgs for keyless, free search results.
Primary data source for finding real people matching discovery criteria.
"""

import logging
import re
import asyncio
from typing import List, Dict, Optional
import httpx
from bs4 import BeautifulSoup
try:
    from ddgs import DDGS
except ImportError:
    try:
        from duckduckgo_search import DDGS
    except ImportError:
        DDGS = None

from config import settings
from schemas.discovery import LeadContact

logger = logging.getLogger(__name__)

class GoogleSearchScraper:
    def __init__(self):
        # Kept the name GoogleSearchScraper to not break other imports,
        # but under the hood we use DuckDuckGo / HTTPX keyless search
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
        logger.info(f"Search found {len(all_leads)} leads from {len(queries)} queries")
        return all_leads

    async def _execute_search(self, query: str, num: int = 40) -> Dict:
        def fetch():
            results = []
            if DDGS:
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
                    logger.error(f"DDGS fetch error: {e}")
            return {"organic_results": results}

        try:
            res = await asyncio.to_thread(fetch)
            if res.get("organic_results"):
                return res
            # Fallback to keyless HTML search via httpx if DDGS package returns empty or fails
            return await self._execute_html_search(query, num)
        except Exception as e:
            logger.error(f"DuckDuckGo search failed: {e}")
            return {"organic_results": []}

    async def _execute_html_search(self, query: str, num: int = 40) -> Dict:
        results = []
        try:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            resp = await self.client.post("https://html.duckduckgo.com/html/", data={"q": query}, headers=headers)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                for a in soup.select("a.result__url"):
                    link = a.get("href", "")
                    title_elem = a.find_parent("div", class_="result__body")
                    title = title_elem.select_one("a.result__title").text.strip() if title_elem and title_elem.select_one("a.result__title") else ""
                    snippet = title_elem.select_one("a.result__snippet").text.strip() if title_elem and title_elem.select_one("a.result__snippet") else ""
                    if link and title:
                        results.append({"title": title, "link": link, "snippet": snippet})
        except Exception as e:
            logger.error(f"HTML search fallback error: {e}")
        return {"organic_results": results[:num]}

    def _extract_leads(self, results: Dict) -> List[LeadContact]:
        leads = []
        for r in results.get("organic_results", []):
            lead = self._parse_result(r.get("title",""), r.get("link",""), r.get("snippet",""))
            if lead and lead.name:
                leads.append(lead)
        return leads

    def _parse_result(self, title: str, link: str, snippet: str) -> Optional[LeadContact]:
        if "dice.com" in link:
            return self._parse_dice(title, link, snippet)
        if "indeed.com" in link:
            return self._parse_indeed(title, link, snippet)
        if "ziprecruiter.com" in link:
            return self._parse_ziprecruiter(title, link, snippet)
        if "linkedin.com/in/" in link:
            return self._parse_linkedin(title, link, snippet)
        if "crunchbase.com" in link:
            return self._parse_crunchbase(title, link, snippet)
        return self._parse_general(title, link, snippet)

    def _extract_skills(self, text: str) -> List[str]:
        """Helper to extract common technical and business skills from snippet/text."""
        common_skills = [
            "React", "Node.js", "Python", "Java", "JavaScript", "TypeScript", "C++", "Go", "Ruby",
            "SQL", "PostgreSQL", "MongoDB", "AWS", "Azure", "Docker", "Kubernetes", "DevOps",
            "Machine Learning", "AI", "Deep Learning", "Data Engineering", "Tailwind", "REST API",
            "Salesforce", "HubSpot", "Product Management", "Scrum", "Agile", "HR", "Recruiting"
        ]
        found = []
        for skill in common_skills:
            if re.search(r'\b' + re.escape(skill) + r'\b', text, re.I):
                found.append(skill)
        return found[:6]

    def _parse_dice(self, title: str, link: str, snippet: str) -> Optional[LeadContact]:
        clean = title.replace(" - Dice.com", "").replace(" | Dice", "").replace(" - Dice", "").strip()
        parts = [p.strip() for p in clean.split(" - ")]
        name = parts[0] if parts else "Dice Candidate"
        job_title = parts[1] if len(parts) > 1 else "Candidate Profile"
        skills = self._extract_skills(snippet + " " + title)
        email_m = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', snippet)
        phone_m = re.search(r'(?:\+\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}', snippet)

        return LeadContact(
            name=name,
            title=job_title,
            company="Dice Candidate Pool",
            email=email_m.group(0) if email_m else "",
            phone=phone_m.group(0).strip() if phone_m else "",
            website=link,
            resume_url=link,
            platform_source="Dice",
            is_hr_candidate=True,
            skills=skills,
            source="dice_candidates",
            confidence=0.9
        )

    def _parse_indeed(self, title: str, link: str, snippet: str) -> Optional[LeadContact]:
        clean = title.replace(" - Indeed.com", "").replace(" | Indeed", "").replace(" Resumes", "").replace(" Resume", "").strip()
        parts = [p.strip() for p in clean.split(" - ")]
        name = parts[0] if parts else "Indeed Candidate"
        job_title = parts[1] if len(parts) > 1 else "Candidate Profile"
        skills = self._extract_skills(snippet + " " + title)
        email_m = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', snippet)
        phone_m = re.search(r'(?:\+\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}', snippet)

        return LeadContact(
            name=name,
            title=job_title,
            company="Indeed Candidate Pool",
            email=email_m.group(0) if email_m else "",
            phone=phone_m.group(0).strip() if phone_m else "",
            website=link,
            resume_url=link,
            platform_source="Indeed",
            is_hr_candidate=True,
            skills=skills,
            source="indeed_resumes",
            confidence=0.9
        )

    def _parse_ziprecruiter(self, title: str, link: str, snippet: str) -> Optional[LeadContact]:
        clean = title.replace(" - ZipRecruiter", "").replace(" | ZipRecruiter", "").strip()
        parts = [p.strip() for p in clean.split(" - ")]
        name = parts[0] if parts else "ZipRecruiter Candidate"
        job_title = parts[1] if len(parts) > 1 else "Candidate Profile"
        skills = self._extract_skills(snippet + " " + title)
        email_m = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', snippet)
        phone_m = re.search(r'(?:\+\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}', snippet)

        return LeadContact(
            name=name,
            title=job_title,
            company="ZipRecruiter Candidate Pool",
            email=email_m.group(0) if email_m else "",
            phone=phone_m.group(0).strip() if phone_m else "",
            website=link,
            resume_url=link,
            platform_source="ZipRecruiter",
            is_hr_candidate=True,
            skills=skills,
            source="ziprecruiter_candidates",
            confidence=0.9
        )

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
        skills = self._extract_skills(snippet + " " + title)
        return LeadContact(
            name=name,
            title=job_title,
            company=company or "LinkedIn Profile",
            linkedin_url=link,
            resume_url=link,
            platform_source="LinkedIn",
            skills=skills,
            source="google_linkedin",
            confidence=0.75
        )

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
        skills = self._extract_skills(snippet + " " + title)
        return LeadContact(
            name=name,
            title=job_title,
            company=company,
            email=email_m.group(0) if email_m else "",
            phone=phone_m.group(0).strip() if phone_m else "",
            website=link,
            resume_url=link if any(w in link.lower() for w in ["resume", "cv", "candidate", "profile"]) else "",
            skills=skills,
            source="google_web",
            confidence=0.5
        )

    async def close(self):
        await self.client.aclose()
