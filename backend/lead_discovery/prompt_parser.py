"""
Prompt Parser - Uses Groq to parse natural language discovery prompts
into structured search parameters.

Example: "Find 50 founders of AI companies with 5+ years experience in Hyderabad"
  → ParsedQuery(role="founder", industry="AI", location="Hyderabad", 
                 experience_years=5, count=50, ...)
"""

import json
import logging
import re
from typing import Optional

from openai import AsyncOpenAI

from config import settings
from schemas.discovery import ParsedQuery

logger = logging.getLogger(__name__)


PARSE_PROMPT = """You are an expert at parsing lead discovery queries. Given a natural language prompt from a sales/marketing professional, extract structured search parameters.

INPUT PROMPT: "{user_prompt}"

Extract the following fields and return ONLY a valid JSON object (no markdown, no code fences):
{{
  "role": "the job title or role they want to find (e.g., founder, CTO, VP Engineering, CEO, professor, director). Keep it generic and searchable.",
  "industry": "the industry or domain (e.g., AI, SaaS, FinTech, Healthcare, EdTech)",
  "location": "the city, region, or country",
  "experience_years": <integer, minimum years of experience, 0 if not specified>,
  "company_size": "company size if mentioned (e.g., '50+ employees', 'startup', 'enterprise'), empty string if not specified",
  "count": <integer, number of leads requested, default 50>,
  "keywords": ["additional", "relevant", "search", "keywords"],
  "search_queries": [
    "Generate 10-15 queries targeting REAL INDIVIDUAL PEOPLE (not companies, news, or articles). Target LinkedIn personal profiles (site:linkedin.com/in/), Crunchbase person profiles (site:crunchbase.com/person/), university faculty directories (site:ac.in or site:edu), conference speaker bios, and leadership team pages.",
    "example: site:linkedin.com/in/ \\"AI\\" \\"founder\\" \\"Hyderabad\\"",
    "example: site:linkedin.com/in/ \\"founder\\" \\"Hyderabad\\" \\"AI startup\\"",
    "example: site:linkedin.com/in/ \\"CEO\\" \\"artificial intelligence\\" \\"Hyderabad\\"",
    "example: site:crunchbase.com/person/ \\"AI\\" \\"founder\\" \\"Hyderabad\\"",
    "example: site:ac.in (faculty OR professor) \\"artificial intelligence\\" \\"Hyderabad\\"",
    "example: \\"AI\\" \\"founder\\" \\"Hyderabad\\" (\\"speaker\\" OR \\"keynote\\" OR \\"bio\\")",
    "example: \\"AI startup\\" \\"Hyderabad\\" (\\"meet the team\\" OR \\"leadership\\" OR \\"executive team\\")",
    "example: site:linkedin.com/in/ \\"AI\\" \\"founder\\" \\"Hyderabad\\" (\\"email\\" OR \\"contact\\")"
  ]
}}

IMPORTANT:
- Every search query MUST be targeted at finding individual human profiles (people), NOT company profiles or news articles.
- Include queries specifically using `site:linkedin.com/in/`
- Include queries targeting Crunchbase individual person profiles (`site:crunchbase.com/person/`)
- Include queries for academic faculty directories if the role is academic (`site:ac.in`, `site:edu`)
- Include queries for conference speaker profiles and team leadership pages
"""



class PromptParser:
    """Parses natural language discovery prompts using Groq."""

    def __init__(self):
        if settings.OPENAI_API_KEY:
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            self.model = "gpt-4o-mini"
        else:
            self.client = None
            logger.warning("OPENAI_API_KEY not set - using fallback regex parser")

    async def parse(self, prompt: str) -> ParsedQuery:
        """Parse a natural language prompt into structured search parameters."""
        if self.client:
            return await self._parse_with_openai(prompt)
        return self._parse_with_regex(prompt)

    async def _parse_with_openai(self, prompt: str) -> ParsedQuery:
        """Use OpenAI to parse the prompt."""
        try:
            formatted_prompt = PARSE_PROMPT.format(user_prompt=prompt)
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": formatted_prompt}],
                temperature=0.0
            )
            
            text = response.choices[0].message.content.strip()
            # Strip markdown code fences if present
            text = re.sub(r'^```(?:json)?\s*', '', text)
            text = re.sub(r'\s*```$', '', text)
            
            data = json.loads(text)
            return ParsedQuery(**data)
        except Exception as e:
            logger.error(f"OpenAI parsing failed: {e}, falling back to regex")
            return self._parse_with_regex(prompt)

    def _parse_with_regex(self, prompt: str) -> ParsedQuery:
        """Fallback regex-based parser for when Gemini is unavailable."""
        prompt_lower = prompt.lower()
        
        # Extract count
        count_match = re.search(r'(\d+)\s*(?:people|founders?|ctos?|ceos?|directors?|leads?|contacts?|professionals?)', prompt_lower)
        count = int(count_match.group(1)) if count_match else 50
        
        # Extract experience years
        exp_match = re.search(r'(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)', prompt_lower)
        experience_years = int(exp_match.group(1)) if exp_match else 0
        
        # Extract role
        role_patterns = [
            r'(founder|co-founder|ceo|cto|coo|cfo|vp|vice president|director|head|manager|lead|chief)',
        ]
        role = ""
        for pattern in role_patterns:
            role_match = re.search(pattern, prompt_lower)
            if role_match:
                role = role_match.group(1)
                break
        
        # Extract industry
        industry_keywords = [
            'ai', 'artificial intelligence', 'machine learning', 'ml', 'saas', 
            'fintech', 'healthtech', 'edtech', 'biotech', 'ecommerce', 'e-commerce',
            'blockchain', 'crypto', 'web3', 'iot', 'cybersecurity', 'cloud',
            'software', 'technology', 'tech', 'data', 'analytics', 'robotics',
            'automation', 'devops', 'agritech', 'proptech', 'insurtech',
            'deeptech', 'quantum', 'ar', 'vr', 'gaming', 'media',
        ]
        industry = ""
        for keyword in industry_keywords:
            if keyword in prompt_lower:
                industry = keyword.upper() if len(keyword) <= 3 else keyword.title()
                break
        
        # Extract location - look for "in <location>" or "from <location>"
        location_match = re.search(r'(?:in|from|at|based in|located in)\s+([A-Z][a-zA-Z\s,]+?)(?:\s+(?:with|who|that|having|and|\.|$))', prompt)
        location = location_match.group(1).strip() if location_match else ""
        
        # If no location found, try common Indian cities
        if not location:
            cities = ['hyderabad', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'pune', 
                      'chennai', 'kolkata', 'ahmedabad', 'jaipur', 'noida', 'gurgaon',
                      'san francisco', 'new york', 'london', 'singapore', 'dubai',
                      'toronto', 'berlin', 'tokyo', 'sydney', 'austin', 'seattle']
            for city in cities:
                if city in prompt_lower:
                    location = city.title()
                    break

        # Generate search queries
        search_queries = self._generate_search_queries(role, industry, location, experience_years)

        return ParsedQuery(
            role=role,
            industry=industry,
            location=location,
            experience_years=experience_years,
            count=count,
            keywords=[w for w in [role, industry, location] if w],
            search_queries=search_queries
        )

    def _generate_search_queries(self, role: str, industry: str, location: str, exp_years: int) -> list:
        """Generate high-precision search queries to discover real individuals on LinkedIn and Google Web."""
        queries = []
        is_academic = any(r in role.lower() for r in ['professor', 'faculty', 'researcher', 'scientist', 'lecturer', 'dean', 'chair'])
        
        if role and industry and location:
            # LinkedIn Individual Profiles
            queries.append(f'site:linkedin.com/in/ "{industry}" "{role}" "{location}"')
            queries.append(f'site:linkedin.com/in/ "{role}" "{location}" "{industry}"')
            queries.append(f'site:linkedin.com/in/ "{role}" "{location}" ("@gmail.com" OR "contact" OR "email")')

            # Academic & Research Profiles
            if is_academic:
                queries.append(f'site:ac.in (faculty OR professor) "{industry}" "{location}"')
                queries.append(f'site:edu (faculty OR professor) "{industry}" "{location}"')
                queries.append(f'"{industry}" "{role}" "{location}" ("publications" OR "curriculum" OR "faculty directory")')
            else:
                # Leadership & Executive Profiles
                queries.append(f'"{industry}" "{location}" ("{role}") ("our team" OR "leadership" OR "executive team")')
                queries.append(f'"{industry}" "{role}" "{location}" ("speaker" OR "keynote" OR "panelist")')
            
            # Crunchbase individual person profiles only
            queries.append(f'site:crunchbase.com/person/ "{industry}" "{role}" "{location}"')

        elif role and location:
            queries.append(f'site:linkedin.com/in/ "{role}" "{location}"')
            queries.append(f'site:linkedin.com/in/ "{role}" "{location}" ("email" OR "contact")')
            if is_academic:
                queries.append(f'site:ac.in (faculty OR professor) "{location}"')
            else:
                queries.append(f'"{role}" "{location}" ("our team" OR "leadership")')
            queries.append(f'site:crunchbase.com/person/ "{role}" "{location}"')

        elif industry and location:
            queries.append(f'site:linkedin.com/in/ "{industry}" "founder" "{location}"')
            queries.append(f'site:linkedin.com/in/ "{industry}" "CEO" "{location}"')
            queries.append(f'site:linkedin.com/in/ "{industry}" "director" "{location}"')
        else:
            queries.append(f'site:linkedin.com/in/ "{role or "founder"}" "{industry or "technology"}" "{location or "India"}"')

        return queries
