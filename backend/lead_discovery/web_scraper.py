"""
Web Contact Scraper - Scrapes company websites and public pages 
to extract email addresses and phone numbers.
"""

import logging
import re
import asyncio
from typing import List, Tuple, Set
from urllib.parse import urljoin, urlparse
import httpx
from bs4 import BeautifulSoup

from config import settings

logger = logging.getLogger(__name__)

EMAIL_RE = re.compile(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}')
PHONE_RE = re.compile(r'(?:\+91[\s\-]?)?(?:\(?0?\d{2,5}\)?[\s\-]?)?\d{5,10}[\s\-]?\d{0,5}')
PHONE_INTL = re.compile(r'\+\d{1,3}[\s\-]?\(?\d{1,5}\)?[\s\-]?\d{3,5}[\s\-]?\d{3,5}')

SKIP_EMAILS = {'example.com', 'email.com', 'domain.com', 'yoursite.com', 'sentry.io', 'w3.org', 'schema.org', 'wixpress.com', 'googleapis.com'}
CONTACT_PATHS = ['/contact', '/about', '/team', '/about-us', '/contact-us', '/our-team', '/leadership', '/people', '/founders']

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}


class WebContactScraper:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT, follow_redirects=True, headers=HEADERS)
        self.semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_REQUESTS)

    async def scrape_website(self, url: str) -> Tuple[List[str], List[str]]:
        """Scrape a website for emails and phones. Returns (emails, phones)."""
        if not url or not url.startswith("http"):
            return [], []
        
        all_emails: Set[str] = set()
        all_phones: Set[str] = set()
        
        # Scrape main page + contact/about pages
        pages_to_scrape = [url]
        parsed = urlparse(url)
        base = f"{parsed.scheme}://{parsed.netloc}"
        for path in CONTACT_PATHS:
            pages_to_scrape.append(urljoin(base, path))
        
        tasks = [self._scrape_page(page_url) for page_url in pages_to_scrape]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in results:
            if isinstance(result, Exception):
                continue
            emails, phones = result
            all_emails.update(emails)
            all_phones.update(phones)
        
        return list(all_emails), list(all_phones)

    async def _scrape_page(self, url: str) -> Tuple[List[str], List[str]]:
        async with self.semaphore:
            try:
                resp = await self.client.get(url)
                if resp.status_code != 200:
                    return [], []
                
                content_type = resp.headers.get("content-type", "")
                if "text/html" not in content_type and "text" not in content_type:
                    return [], []
                
                html = resp.text
                return self._extract_contacts(html)
            except Exception:
                return [], []

    def _extract_contacts(self, html: str) -> Tuple[List[str], List[str]]:
        soup = BeautifulSoup(html, "lxml")
        text = soup.get_text(separator=" ")
        
        # Extract emails
        raw_emails = EMAIL_RE.findall(text)
        # Also check href="mailto:" links
        for a in soup.select('a[href^="mailto:"]'):
            href = a.get("href", "").replace("mailto:", "").split("?")[0].strip()
            if href:
                raw_emails.append(href)
        
        emails = []
        for e in raw_emails:
            domain = e.split("@")[1].lower()
            if domain not in SKIP_EMAILS and not e.endswith(('.png', '.jpg', '.gif')):
                emails.append(e.lower())
        
        # Extract phones
        phones = []
        intl_phones = PHONE_INTL.findall(text)
        for p in intl_phones:
            cleaned = re.sub(r'[\s\-\(\)]', '', p)
            if 8 <= len(cleaned.replace('+', '')) <= 15:
                phones.append(p.strip())
        
        # Also check href="tel:" links
        for a in soup.select('a[href^="tel:"]'):
            href = a.get("href", "").replace("tel:", "").strip()
            if href:
                phones.append(href)
        
        return list(set(emails)), list(set(phones))

    async def batch_scrape(self, urls: List[str]) -> dict:
        """Scrape multiple websites. Returns {url: (emails, phones)}."""
        results = {}
        tasks = [(url, self.scrape_website(url)) for url in urls if url]
        
        gathered = await asyncio.gather(*[t[1] for t in tasks], return_exceptions=True)
        
        for i, (url, _) in enumerate(tasks):
            if isinstance(gathered[i], Exception):
                results[url] = ([], [])
            else:
                results[url] = gathered[i]
        
        return results

    async def close(self):
        await self.client.aclose()
