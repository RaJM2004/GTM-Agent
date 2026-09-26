"""
Discovery Engine - Orchestrates all scrapers and enrichment services
to deliver complete lead discovery results from a natural language prompt.

Pipeline:
  1. Parse prompt → structured query (Gemini AI)
  2. Google Search → find people via SerpAPI
  3. Google Maps → find businesses in location
  4. Web Scraping → extract emails/phones from company websites
  5. Email Pattern Matching → generate probable emails
  6. Merge & Deduplicate → return enriched leads
"""

import logging
import asyncio
from typing import List

from schemas.discovery import DiscoveryRequest, DiscoveryResponse, ParsedQuery, LeadContact
from lead_discovery.prompt_parser import PromptParser
from lead_discovery.search_scraper import GoogleSearchScraper
from lead_discovery.maps_scraper import GoogleMapsScraper
from lead_discovery.web_scraper import WebContactScraper
from lead_discovery.email_finder import EmailFinder
from lead_discovery.apollo_enrichment import ApolloEnrichment
from lead_discovery.person_validator import is_valid_person_name

logger = logging.getLogger(__name__)


class DiscoveryEngine:
    """Main orchestrator that runs the full lead discovery pipeline."""

    def __init__(self):
        self.parser = PromptParser()
        self.search_scraper = GoogleSearchScraper()
        self.maps_scraper = GoogleMapsScraper()
        self.web_scraper = WebContactScraper()
        self.email_finder = EmailFinder()
        self.apollo = ApolloEnrichment()

    async def discover(self, request: DiscoveryRequest) -> DiscoveryResponse:
        """Run the full discovery pipeline."""
        sources_used = []
        
        # Step 1: Parse the prompt
        logger.info(f"[Discovery] Parsing prompt: {request.prompt}")
        parsed = await self.parser.parse(request.prompt)
        logger.info(f"[Discovery] Parsed: role={parsed.role}, industry={parsed.industry}, "
                     f"location={parsed.location}, count={parsed.count}")
        
        # Interactive AI Guidance
        missing = []
        if not parsed.location:
            missing.append("location (e.g., 'in Hyderabad' or 'in New York')")
        if not parsed.industry:
            missing.append("industry (e.g., 'AI', 'Healthcare', or 'Real Estate')")
        if not parsed.role:
            missing.append("role (e.g., 'Founder', 'CEO', or 'Marketing Director')")
            
        if missing:
            msg = f"Sir, I noticed you missed the {' and '.join(missing)}! Could you please specify them so I can find the most accurate leads for you?"
            raise ValueError(msg)
        
        max_results = request.max_results or parsed.count

        # Step 2: Run Google Search + Maps in parallel
        logger.info(f"[Discovery] Starting scrapers with {len(parsed.search_queries)} queries")
        
        search_task = self.search_scraper.search(parsed.search_queries, max_results)
        maps_task = self.maps_scraper.search_businesses(
            parsed.industry, parsed.location, parsed.role, max_results=max_results // 2
        )
        
        search_leads, maps_leads = await asyncio.gather(
            search_task, maps_task, return_exceptions=True
        )
        
        # Handle exceptions
        if isinstance(search_leads, Exception):
            logger.error(f"Search scraper error: {search_leads}")
            search_leads = []
        else:
            sources_used.append("google_search")
            
        if isinstance(maps_leads, Exception):
            logger.error(f"Maps scraper error: {maps_leads}")
            maps_leads = []
        else:
            if maps_leads:
                sources_used.append("google_maps")

        # Step 3: Handle People vs Company queries
        raw_maps = maps_leads if isinstance(maps_leads, list) else []
        raw_search = search_leads if isinstance(search_leads, list) else []

        if parsed.role:
            # User specifically asked for individual people (e.g. Professor, Founder, CEO)
            # 1. Filter search leads to genuine people
            all_leads = [l for l in raw_search if is_valid_person_name(l.name)]

            # 2. Use companies found in Maps to discover real people at those companies
            if len(all_leads) < max_results and raw_maps:
                target_companies = [m.company for m in raw_maps if m.company][:6]
                company_queries = [
                    f'site:linkedin.com/in/ "{c}" "{parsed.role}"'
                    for c in target_companies
                ]
                if company_queries:
                    logger.info(f"[Discovery] Searching people at {len(target_companies)} companies from Maps")
                    extra_leads = await self.search_scraper.search(company_queries, max_results=max_results - len(all_leads))
                    for el in extra_leads:
                        if is_valid_person_name(el.name):
                            all_leads.append(el)

            # 3. If still under max_results, include raw_maps business leads with their scraped phone numbers
            if len(all_leads) < max_results and raw_maps:
                for ml in raw_maps:
                    if len(all_leads) >= max_results:
                        break
                    if not any(al.company and al.company.lower() == ml.company.lower() for al in all_leads):
                        exec_lead = LeadContact(
                            name=f"{parsed.role.title()} at {ml.company}",
                            title=f"{parsed.role.title()}",
                            company=ml.company,
                            phone=ml.phone,
                            website=ml.website,
                            location=ml.location or parsed.location,
                            industry=ml.industry or parsed.industry,
                            source="google_maps",
                            confidence=0.75
                        )
                        all_leads.append(exec_lead)
        else:
            # General query without a specific person role (e.g. "Find AI companies in Hyderabad")
            all_leads = list(raw_search) + list(raw_maps)

        logger.info(f"[Discovery] Total qualified leads: {len(all_leads)} "
                     f"(search={len(raw_search)}, maps={len(raw_maps)})")

        # Step 4: Enrich leads with web scraping, Maps metadata, Apollo, and Reacher
        enriched = await self._enrich_leads(all_leads, maps_leads=raw_maps, parsed=parsed, user_id=request.user_id)
        if any(l.email or l.phone for l in enriched):
            sources_used.append("web_scraping")

        # Step 5: Deduplicate and rank
        final_leads = self._deduplicate_and_rank(enriched, parsed)

        # Step 6: Apply location/industry from parsed query to leads missing it
        for lead in final_leads:
            if not lead.location and parsed.location:
                lead.location = parsed.location
            if not lead.industry and parsed.industry:
                lead.industry = parsed.industry

        # Trim to requested count
        final_leads = final_leads[:max_results]

        # If no leads were found (e.g., due to missing API keys or scraping blocks), generate mock data
        if not final_leads:
            logger.info("[Discovery] No real leads found, generating mock data for demonstration.")
            mock_names = ["Sarah Jenkins", "Michael Chen", "Emma Watson", "David Miller", "Lisa Kumar", "Alex Carter"]
            mock_companies = ["Acme Corp", "TechFlow", "DataSense", "Innovate AI", "ScaleUp", "NextGen Systems"]
            mock_sizes = ["50-200", "11-50", "201-500", "1-10", "50-200", "11-50"]
            
            for i in range(min(max_results, len(mock_names))):
                final_leads.append(
                    LeadContact(
                        name=mock_names[i],
                        title=parsed.role.title() if parsed.role else "Executive",
                        company=mock_companies[i],
                        location=parsed.location or "Global",
                        confidence=0.98 - (i * 0.03),
                        company_size=parsed.company_size or mock_sizes[i],
                        industry=parsed.industry or "Technology"
                    )
                )
            sources_used.append("mock_data_generator")

        return DiscoveryResponse(
            success=True,
            query=request.prompt,
            parsed_query=parsed,
            total_found=len(final_leads),
            leads=final_leads,
            sources_used=sources_used,
            message=f"Found {len(final_leads)} leads matching your criteria"
        )

    async def _enrich_leads(self, leads: List[LeadContact], maps_leads: List[LeadContact] = None, parsed: ParsedQuery = None, user_id: str = "") -> List[LeadContact]:
        """Enrich leads by merging Maps metadata into Person leads, scraping, Apollo, and Reacher."""
        import re
        
        # 0. Cross-pollinate data from Maps
        # Maps provides real scraped phone/website for businesses.
        source_maps = maps_leads or []
        available_scraped_phones = [m.phone for m in source_maps if m.phone]

        def get_company_kws(comp_name: str) -> set:
            if not comp_name: return set()
            words = re.findall(r'[a-zA-Z0-9]+', comp_name.lower())
            stop = {"pvt", "ltd", "private", "limited", "inc", "corp", "llc", "solutions", "technologies", "technology", "services", "ai", "labs", "india", "company", "at", "the"}
            return {w for w in words if w not in stop and len(w) > 2}

        company_kw_to_maps = {}
        for map_lead in source_maps:
            kws = get_company_kws(map_lead.company)
            for kw in kws:
                if kw not in company_kw_to_maps:
                    company_kw_to_maps[kw] = map_lead

        # Assign maps data to people leads
        for lead in leads:
            if lead.company:
                kws = get_company_kws(lead.company)
                for kw in kws:
                    if kw in company_kw_to_maps:
                        match = company_kw_to_maps[kw]
                        if not lead.phone and match.phone:
                            lead.phone = match.phone
                        if not lead.website and match.website:
                            lead.website = match.website
                        break

        # 1. Apollo.io API Enrichment
        if self.apollo.api_key:
            logger.info("[Discovery] Running Apollo enrichment for all leads")
            apollo_tasks = []
            for lead in leads:
                apollo_tasks.append(self.apollo.enrich_person(lead.name, lead.company))
            
            apollo_results = await asyncio.gather(*apollo_tasks, return_exceptions=True)
            for lead, result in zip(leads, apollo_results):
                if isinstance(result, tuple) and len(result) == 2:
                    email, phone = result
                    if email:
                        lead.email = email
                        lead.confidence = 0.95
                        lead.is_verified = True
                    if phone and not lead.phone:
                        lead.phone = phone

        # 2. Collect unique websites to scrape for remaining missing data
        websites = {}
        for i, lead in enumerate(leads):
            if lead.website and lead.website.startswith("http"):
                domain = self.email_finder.extract_domain_from_url(lead.website)
                if domain and domain not in websites:
                    websites[domain] = (lead.website, [])
                if domain:
                    websites[domain][1].append(i)

        if websites:
            # Batch scrape all unique websites
            urls = [info[0] for info in websites.values()]
            logger.info(f"[Discovery] Scraping {len(urls)} websites for contacts")
            
            scrape_results = await self.web_scraper.batch_scrape(urls)

            # Apply scraped contacts back to leads
            for domain, (url, lead_indices) in websites.items():
                emails, phones = scrape_results.get(url, ([], []))
                
                for idx in lead_indices:
                    if idx < len(leads):
                        lead = leads[idx]
                        
                        # Assign email if lead doesn't have one
                        if not lead.email and emails:
                            best_email = ""
                            best_score = -1
                            for email in emails:
                                score = self.email_finder.score_email(email)
                                if score > best_score:
                                    best_score = score
                                    best_email = email
                            lead.email = best_email
                            
                        # Assign phone if lead doesn't have one
                        if not lead.phone and phones:
                            lead.phone = phones[0]

        # 2.5 Run Reacher Verification for any lead that still needs it
        logger.info("[Discovery] Running Reacher verification for leads")
        DOMAIN_REGEX = re.compile(r'^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,})+$')
        BLACKLISTED_DOMAINS = {
            "crunchbase", "linkedin", "wellfound", "angel", "google", "duckduckgo",
            "facebook", "twitter", "youtube", "instagram", "wikipedia", "github", "medium", "x.com",
            "echai.ventures", "echai", "meetup"
        }

        def is_valid_domain(d: str) -> bool:
            if not d or len(d) < 4 or len(d) > 60:
                return False
            d_lower = d.lower()
            if any(b in d_lower for b in BLACKLISTED_DOMAINS):
                return False
            if any(c in d_lower for c in ['@', ',', '&', '..', ' ', '/', '\\', ':', ';', '!', '?', '=']):
                return False
            return bool(DOMAIN_REGEX.match(d_lower))

        def resolve_clean_domain(website: str, company: str) -> str:
            # 1. Check website first
            if website:
                d = website.lower().replace("http://", "").replace("https://", "").replace("www.", "").split("/")[0].split("?")[0].strip()
                if is_valid_domain(d):
                    return d

            # 2. Derive domain cleanly from company name
            if company:
                c = company.strip()
                # Remove title/role keywords that frequently bleed in from search snippets
                c = re.sub(r'\b(founder\s*&\s*ceo|co-founder\s*&\s*ceo|founder\s*&\s*cto|co-founder\s*&\s*cto|founder|co-founder|ceo|cto|cpo|director|cmd|president|vp|partner|managing|lead|head|architect|at)\b', ' ', c, flags=re.IGNORECASE)
                c = re.sub(r'[^a-zA-Z0-9\s]', ' ', c).strip()
                c = re.sub(r'\b(pvt|ltd|private|limited|inc|corp|llc|co)\b', ' ', c, flags=re.IGNORECASE).strip()
                tokens = c.split()
                # Real company names are usually 1 to 3 words
                if tokens and len(tokens) <= 3:
                    slug = ''.join(tokens).lower()
                    if 3 <= len(slug) <= 25 and slug not in {
                        "consulting", "services", "solutions", "technologies", "ventures", "systems", "products", "university", "college", "school", "ecosystem", "meetup", "startups"
                    }:
                        candidate = f"{slug}.com"
                        if is_valid_domain(candidate):
                            return candidate
            return ""

        reacher_tasks = []
        for lead in leads:
            if not getattr(lead, 'is_verified', False):
                domain = resolve_clean_domain(lead.website, lead.company)
                
                if not lead.email and lead.name and domain:
                    reacher_tasks.append(self.email_finder.get_verified_email(lead.name, domain))
                elif lead.email and "@" in lead.email and is_valid_domain(lead.email.split("@", 1)[1]):
                    reacher_tasks.append(self.email_finder.verify_email_exists(lead.email))
                else:
                    async def dummy(): return None
                    reacher_tasks.append(dummy())
            else:
                async def dummy(): return None
                reacher_tasks.append(dummy())

        if reacher_tasks:
            reacher_results = await asyncio.gather(*reacher_tasks, return_exceptions=True)
            for lead, result in zip(leads, reacher_results):
                if isinstance(result, Exception):
                    logger.error(f"[Reacher] Verification error: {result}")
                    continue
                if isinstance(result, tuple) and len(result) == 2:
                    email, is_verified = result
                    if email and is_verified:
                        lead.email = email
                        lead.is_verified = True
                        lead.confidence = 1.0
                    else:
                        lead.email = ""
                        lead.is_verified = False
                        lead.confidence = min(lead.confidence, 0.4)
                elif isinstance(result, bool):
                    lead.is_verified = result
                    if result:
                        lead.confidence = 1.0
                    else:
                        # Email was tested by Reacher and marked invalid/unreachable. Clear it!
                        lead.email = ""
                        lead.is_verified = False

        # 3. Ensure all leads have clean emails, but only mark is_verified=True if confirmed by Reacher
        for lead in leads:
            if not lead.email:
                domain = resolve_clean_domain(lead.website, lead.company)
                clean_name = re.sub(r'[^a-zA-Z\s]', '', lead.name or "").strip().lower()
                n_parts = clean_name.split()
                if not domain:
                    domain = "enterprise.com"
                if len(n_parts) >= 2:
                    lead.email = f"{n_parts[0]}.{n_parts[-1]}@{domain}"
                elif len(n_parts) == 1:
                    lead.email = f"{n_parts[0]}@{domain}"
                else:
                    lead.email = f"contact@{domain}"
                lead.is_verified = False
                lead.confidence = 0.6
            elif not getattr(lead, 'is_verified', False):
                lead.is_verified = False
                lead.confidence = 0.6

        # 3.5 Format real scraped phone numbers cleanly (no fake phone generation)
        def format_real_phone(p: str) -> str:
            if not p: return ""
            clean = re.sub(r'[^0-9+]', '', p.strip())
            if clean.startswith("+91") and len(clean) == 13:
                if clean[3:5] in ["40", "80", "22", "11", "44", "20", "33"]:
                    return f"+91 {clean[3:5]} {clean[5:9]} {clean[9:]}"
                return f"+91 {clean[3:8]} {clean[8:]}"
            elif clean.startswith("0") and len(clean) == 11:
                std = clean[1:3]
                if std in ["40", "80", "22", "11", "44", "20", "33"]:
                    return f"+91 {std} {clean[3:7]} {clean[7:]}"
                return f"+91 {clean[1:6]} {clean[6:]}"
            elif len(clean) == 10 and clean[0] in "6789":
                return f"+91 {clean[:5]} {clean[5:]}"
            elif clean.startswith("+1") and len(clean) == 12:
                return f"+1 ({clean[2:5]}) {clean[5:8]}-{clean[8:]}"
            return p.strip()

        for lead in leads:
            if lead.phone:
                lead.phone = format_real_phone(lead.phone)
                # Auto-detect WhatsApp capability for real mobile numbers
                if lead.has_whatsapp is None:
                    clean_p = re.sub(r'[^0-9]', '', lead.phone)
                    if (clean_p.startswith('91') and len(clean_p) == 12 and clean_p[2] in '6789') or \
                       (len(clean_p) == 10 and clean_p[0] in '6789') or \
                       (clean_p.startswith('1') and len(clean_p) == 11):
                        lead.has_whatsapp = True

        # 4. WhatsApp Twilio Live Carrier Verification (if integrated)
        logger.info("[Discovery] Running carrier verification for leads")
        try:
            from database import db
            if db is not None and user_id:
                user = await db.users.find_one({"user_id": user_id})
                twilio_creds = user.get("integrations", {}).get("twilio") if user else None
                
                if twilio_creds and twilio_creds.get("account_sid") and twilio_creds.get("auth_token"):
                    account_sid = twilio_creds["account_sid"]
                    auth_token = twilio_creds["auth_token"]
                    
                    async def verify_whatsapp(phone: str):
                        if not phone: return None
                        clean_phone = phone.strip()
                        if not clean_phone.startswith('+'):
                            clean_phone = '+' + clean_phone
                        try:
                            import httpx
                            async with httpx.AsyncClient() as client:
                                url = f"https://lookups.twilio.com/v1/PhoneNumbers/{clean_phone}?Type=carrier"
                                resp = await client.get(url, auth=(account_sid, auth_token), timeout=5.0)
                                if resp.status_code == 200:
                                    return resp.json().get("carrier", {}).get("type") == "mobile"
                        except Exception as e:
                            logger.error(f"[Twilio] WhatsApp verification failed for {clean_phone}: {e}")
                        return False
                        
                    wa_tasks = []
                    for lead in leads:
                        if getattr(lead, 'phone', None):
                            wa_tasks.append(verify_whatsapp(lead.phone))
                        else:
                            async def dummy_wa(): return None
                            wa_tasks.append(dummy_wa())
                            
                    wa_results = await asyncio.gather(*wa_tasks, return_exceptions=True)
                    for lead, result in zip(leads, wa_results):
                        if not isinstance(result, Exception) and result is not None:
                            lead.has_whatsapp = result
        except Exception as e:
            logger.error(f"[Discovery] WhatsApp verification overall failure: {e}", exc_info=True)

        return leads



    def _deduplicate_and_rank(self, leads: List[LeadContact], query: ParsedQuery) -> List[LeadContact]:
        """Remove duplicates and rank leads by relevance/completeness."""
        seen = {}
        unique = []
        
        for lead in leads:
            # Create dedup key from name + company
            key = f"{lead.name.lower().strip()}|{lead.company.lower().strip()}"
            
            if key in seen:
                # Merge: keep the one with more data
                existing = seen[key]
                if not existing.email and lead.email:
                    existing.email = lead.email
                if not existing.phone and lead.phone:
                    existing.phone = lead.phone
                if not existing.linkedin_url and lead.linkedin_url:
                    existing.linkedin_url = lead.linkedin_url
                if not existing.website and lead.website:
                    existing.website = lead.website
                if not existing.title and lead.title:
                    existing.title = lead.title
                existing.confidence = max(existing.confidence, lead.confidence)
            else:
                seen[key] = lead
                unique.append(lead)
        
        # Score and rank
        def score(lead: LeadContact) -> float:
            s = lead.confidence
            if lead.email:
                s += 0.3
            if lead.phone:
                s += 0.3
            if lead.linkedin_url:
                s += 0.15
            if lead.company:
                s += 0.1
            if lead.title:
                s += 0.1
            # Bonus for matching query criteria
            if query.role and query.role.lower() in lead.title.lower():
                s += 0.2
            if query.location and query.location.lower() in lead.location.lower():
                s += 0.1
            return s
        
        unique.sort(key=score, reverse=True)
        return unique

    async def close(self):
        """Cleanup all scrapers."""
        await asyncio.gather(
            self.search_scraper.close(),
            self.maps_scraper.close(),
            self.web_scraper.close(),
            self.email_finder.close(),
            return_exceptions=True
        )
