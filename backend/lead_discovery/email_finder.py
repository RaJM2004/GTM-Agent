"""
Email Finder - Attempts to discover/guess email addresses for leads
using common email patterns and domain-based lookups.
Includes real-time email verification via a locally hosted Reacher Docker container.
"""

import logging
import re
import asyncio
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

# Reacher API returns one of these reachability statuses.
# "safe"  → mailbox confirmed to accept mail
# "risky" → catch-all / grey-listed, still usable
# "invalid" / "unknown" → do not use
REACHER_USABLE_STATUSES = {"safe", "risky"}


class EmailFinder:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=10)

    def generate_possible_emails(self, name: str, company_domain: str) -> List[str]:
        """Generate possible email addresses based on name and company domain."""
        if not name or not company_domain:
            return []
        
        # Clean and strictly validate domain
        domain = company_domain.lower().strip()
        domain = domain.replace("http://", "").replace("https://", "").replace("www.", "")
        domain = domain.split("/")[0].split("?")[0].strip()
        
        # Reject invalid characters or directory platforms
        if any(bad in domain for bad in [
            "@", ",", "&", "..", "crunchbase", "linkedin", "wellfound", "angel",
            "google", "duckduckgo", "facebook", "twitter", "youtube", "instagram",
            "wikipedia", "github", "medium", "x.com", "echai"
        ]):
            return []
            
        if not re.match(r'^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,})+$', domain):
            return []
        
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
        domain = url.split("/")[0].split("?")[0].strip()
        if any(bad in domain for bad in ["crunchbase", "linkedin", "wellfound", "angel", "google", "wikipedia", "github", "twitter", "x.com"]):
            return ""
        if not re.match(r'^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,})+$', domain):
            return ""
        return domain

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

    async def check_email_details(self, email: str) -> dict:
        """
        Query Reacher to get full email verification details.
        Supports both modern Reacher (POST / with to_emails) and legacy (POST /v0/check_email with to_email).
        """
        if not email or "@" not in email:
            return {"is_reachable": "invalid", "error": "Invalid email format"}

        base_url = settings.REACHER_API_URL.rstrip('/')
        
        # 1. Try modern Reacher endpoint: POST / with {"to_emails": [email]}
        try:
            response = await self.client.post(
                f"{base_url}/",
                json={"to_emails": [email]},
                timeout=15
            )
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    return data[0]
                elif isinstance(data, dict):
                    return data
        except (httpx.ConnectError, httpx.TimeoutException) as e:
            logger.warning(f"[Reacher] Connection issue on primary endpoint: {e}")
        except Exception as e:
            logger.debug(f"[Reacher] Primary endpoint check returned error: {e}")

        # 2. Fallback to legacy endpoint: POST /v0/check_email with {"to_email": email}
        try:
            response = await self.client.post(
                f"{base_url}/v0/check_email",
                json={"to_email": email},
                timeout=15
            )
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.warning(f"[Reacher] Fallback check failed: {e}")

        return {"is_reachable": "unknown", "error": "Reacher unavailable"}

    async def verify_email_exists(self, email: str) -> bool:
        """
        Verify whether an email address actually exists using the hosted Reacher container.
        Returns:
            True  → email is safe or risky (usable in campaigns)
            False → email is invalid/unknown, or Reacher is unreachable
        """
        if not email or "@" not in email:
            return False

        details = await self.check_email_details(email)
        reachability = details.get("is_reachable", "unknown")
        logger.info(f"[Reacher] {email} → is_reachable={reachability}")
        return reachability in REACHER_USABLE_STATUSES

    async def verify_emails_batch(self, emails: List[str]) -> dict[str, bool]:
        """
        Batch verify multiple emails in a single Reacher request for maximum performance.
        Returns a dict mapping {email: is_usable_bool}.
        """
        if not emails:
            return {}

        valid_candidates = [e for e in emails if e and "@" in e]
        if not valid_candidates:
            return {e: False for e in emails}

        base_url = settings.REACHER_API_URL.rstrip('/')
        results = {e: False for e in emails}

        try:
            response = await self.client.post(
                f"{base_url}/",
                json={"to_emails": valid_candidates},
                timeout=25
            )
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    for item in data:
                        inp = item.get("input", "")
                        reachability = item.get("is_reachable", "unknown")
                        is_usable = reachability in REACHER_USABLE_STATUSES
                        if inp:
                            results[inp] = is_usable
                            logger.info(f"[Reacher Batch] {inp} → is_reachable={reachability} (usable={is_usable})")
                    return results
        except Exception as e:
            logger.warning(f"[Reacher Batch] Batch endpoint failed ({e}), falling back to individual checks")

        # Fallback to individual checks if batch failed
        tasks = [self.verify_email_exists(e) for e in valid_candidates]
        indiv_results = await asyncio.gather(*tasks, return_exceptions=True)
        for e, res in zip(valid_candidates, indiv_results):
            results[e] = res if isinstance(res, bool) else False

        return results

    async def get_verified_email(self, name: str, domain: str) -> tuple[Optional[str], bool]:
        """
        Generate all possible email permutations for a person, verify each one
        against Reacher (using fast batch verification), and return the first that
        passes verification.

        Falls back to the highest-scored guess (no verification) if Reacher is
        not running or none of the permutations pass.

        Args:
            name:   Full name of the person (e.g., "John Smith")
            domain: Company domain (e.g., "acmecorp.com")

        Returns:
            A tuple of (email, is_verified).
        """
        candidates = self.generate_possible_emails(name, domain)
        if not candidates:
            return None, False

        logger.info(f"[EmailFinder] Verifying {len(candidates)} email permutations for '{name}' @ '{domain}'")

        # Use batch verification for speed
        batch_results = await self.verify_emails_batch(candidates)

        for email in candidates:
            if batch_results.get(email) is True:
                logger.info(f"[EmailFinder] ✓ Verified email found: {email}")
                return email, True

        # Do not return fake/unverified emails if Reacher verification fails
        logger.info(f"[EmailFinder] No email verified by Reacher for {name} @ {domain}. Leaving email blank.")
        return None, False

    async def close(self):
        await self.client.aclose()
