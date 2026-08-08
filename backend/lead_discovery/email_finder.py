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

    async def verify_email_exists(self, email: str) -> bool:
        """
        Verify whether an email address actually exists using the locally hosted
        Reacher Docker container (https://github.com/reacherhq/check-if-email-exists).

        Reacher performs an SMTP handshake with the mail server without sending
        a real email to check inbox existence. No external API key required.

        Run the container before using this:
            docker run -p 8080:8080 reacherhq/check-if-email-exists

        Returns:
            True  → email is safe or risky (usable in campaigns)
            False → email is invalid/unknown, or Reacher is unreachable
        """
        if not email or "@" not in email:
            return False

        reacher_url = f"{settings.REACHER_API_URL.rstrip('/')}/v0/check_email"
        payload = {"to_email": email}

        try:
            response = await self.client.post(reacher_url, json=payload, timeout=15)
            response.raise_for_status()
            data = response.json()

            reachability = data.get("is_reachable", "unknown")
            logger.info(f"[Reacher] {email} → is_reachable={reachability}")

            return reachability in REACHER_USABLE_STATUSES

        except httpx.ConnectError:
            logger.warning(
                f"[Reacher] Docker container not running at {settings.REACHER_API_URL}. "
                "Skipping verification for this email. "
                "Start it with: docker run -p 8080:8080 reacherhq/check-if-email-exists"
            )
            return False
        except httpx.TimeoutException:
            logger.warning(f"[Reacher] Timeout verifying {email}. Skipping.")
            return False
        except Exception as e:
            logger.error(f"[Reacher] Unexpected error verifying {email}: {e}")
            return False

    async def get_verified_email(self, name: str, domain: str) -> tuple[Optional[str], bool]:
        """
        Generate all possible email permutations for a person, verify each one
        against the local Reacher instance in parallel, and return the first that
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

        # Run all verifications concurrently for speed
        verification_tasks = [self.verify_email_exists(email) for email in candidates]
        results = await asyncio.gather(*verification_tasks, return_exceptions=True)

        for email, result in zip(candidates, results):
            if result is True:
                logger.info(f"[EmailFinder] ✓ Verified email found: {email}")
                return email, True

        # Reacher unavailable or no email passed — fall back to best heuristic guess
        logger.info(f"[EmailFinder] No email verified by Reacher, falling back to best-scored guess for {name}.")
        best_email = max(candidates, key=self.score_email, default=None)
        return best_email, False

    async def close(self):
        await self.client.aclose()
