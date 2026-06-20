"""
Email Finder - Attempts to discover/guess email addresses for leads
using common email patterns and domain-based lookups.
"""

import logging
import re
from typing import Optional, List
import httpx

from config import settings

logger = logging.getLogger(__name__)

# Common email patterns for companies
EMAIL_PATTERNS = [
    "{first}@{domain}",
    "{first}.{last}@{domain}",
    "{first}{last}@{domain}",
    "{f}{last}@{domain}",
    "{first}_{last}@{domain}",
    "{first}.{l}@{domain}",
    "{last}@{domain}",
    "{f}.{last}@{domain}",
]


class EmailFinder:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=10)

    def generate_possible_emails(self, name: str, company_domain: str) -> List[str]:
        """Generate possible email addresses based on name and company domain."""
        if not name or not company_domain:
            return []
        
        # Clean domain
        domain = company_domain.lower().strip()
        domain = domain.replace("http://", "").replace("https://", "").replace("www.", "")
        domain = domain.split("/")[0]  # Remove paths
        
        # Parse name
        parts = name.strip().split()
        if len(parts) < 2:
            return []
        
        first = parts[0].lower()
        last = parts[-1].lower()
        f = first[0]
        l = last[0]
        
        # Remove non-alpha characters
        first = re.sub(r'[^a-z]', '', first)
        last = re.sub(r'[^a-z]', '', last)
        
        if not first or not last:
            return []
        
        emails = []
        for pattern in EMAIL_PATTERNS:
            email = pattern.format(first=first, last=last, f=f, l=l, domain=domain)
            emails.append(email)
        
        return emails

    def extract_domain_from_url(self, url: str) -> str:
        """Extract the domain from a URL."""
        if not url:
            return ""
        url = url.lower().replace("http://", "").replace("https://", "").replace("www.", "")
        return url.split("/")[0]

    def score_email(self, email: str) -> float:
        """Score how likely an email is to be valid (basic heuristic)."""
        if not email or "@" not in email:
            return 0.0
        
        local, domain = email.split("@", 1)
        
        # Generic emails score lower
        generic = ['info', 'contact', 'hello', 'support', 'admin', 'sales', 'hr', 'team', 'office', 'mail', 'enquiry', 'noreply']
        if local in generic:
            return 0.3
        
        # Personal emails on free providers score lower for B2B
        free_providers = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'rediffmail.com']
        if domain in free_providers:
            return 0.4
        
        # Name-based emails on company domains score highest
        if re.match(r'^[a-z]+[.\-_]?[a-z]+$', local):
            return 0.8
        
        return 0.5

    async def close(self):
        await self.client.aclose()
