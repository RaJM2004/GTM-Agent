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

from groq import AsyncGroq

from config import settings
from schemas.discovery import ParsedQuery

logger = logging.getLogger(__name__)


PARSE_PROMPT = """You are an expert at parsing lead discovery queries. Given a natural language prompt from a sales/marketing professional, extract structured search parameters.

INPUT PROMPT: "{user_prompt}"

Extract the following fields and return ONLY a valid JSON object (no markdown, no code fences):
{{
  "role": "the job title or role they want to find (e.g., founder, CTO, VP Engineering, CEO, director). Keep it generic and searchable.",
  "industry": "the industry or domain (e.g., AI, SaaS, FinTech, Healthcare, EdTech)",
  "location": "the city, region, or country",
  "experience_years": <integer, minimum years of experience, 0 if not specified>,
  "company_size": "company size if mentioned (e.g., '50+ employees', 'startup', 'enterprise'), empty string if not specified",
  "count": <integer, number of leads requested, default 50>,
  "keywords": ["additional", "relevant", "search", "keywords"],
  "search_queries": [
    "Generate 5-8 diverse Google search queries that would help find REAL people matching this criteria. Each query should use different search operators and angles. Include site:linkedin.com queries, company directory queries, conference speaker queries, and general web queries. Make them specific to the location and industry.",
    "example: site:linkedin.com/in/ \\"AI\\" \\"founder\\" \\"Hyderabad\\"",
    "example: \\"AI startup\\" \\"founder\\" \\"Hyderabad\\" email contact",
    "example: \\"artificial intelligence\\" company founder Hyderabad CEO",
    "example: AI startup Hyderabad founder site:crunchbase.com",
    "example: \\"machine learning\\" \\"deep learning\\" startup founder Hyderabad India",
    "example: AI companies Hyderabad founders directors list",
    "example: \\"AI\\" \\"co-founder\\" OR \\"founder\\" Hyderabad contact email"
  ]
}}

IMPORTANT:
- The search_queries MUST be optimized to find REAL people with real contact information
- Include queries targeting LinkedIn, Crunchbase, AngelList, company about pages, conference speaker bios
- Make queries diverse - don't repeat the same pattern
- Include the location in most queries
- Use OR operators and quotation marks for precision
- Generate at least 6 different search queries
"""


class PromptParser:
    """Parses natural language discovery prompts using Groq."""

    def __init__(self):
        if settings.GROQ_API_KEY:
            self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)
            self.model = "llama-3.3-70b-versatile"
        else:
            self.client = None
            logger.warning("GROQ_API_KEY not set - using fallback regex parser")

    async def parse(self, prompt: str) -> ParsedQuery:
        """Parse a natural language prompt into structured search parameters."""
        if self.client:
            return await self._parse_with_groq(prompt)
        return self._parse_with_regex(prompt)

    async def _parse_with_groq(self, prompt: str) -> ParsedQuery:
        """Use Groq to parse the prompt."""
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
            logger.error(f"Groq parsing failed: {e}, falling back to regex")
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
        """Generate diverse Google search queries for finding leads."""
        queries = []
        
        if role and industry and location:
            queries.extend([
                f'site:linkedin.com/in/ "{industry}" "{role}" "{location}"',
                f'"{industry}" "{role}" "{location}" email contact',
                f'"{industry}" company "{role}" "{location}" about',
                f'"{role}" "{industry}" startup "{location}" site:crunchbase.com',
                f'"{industry}" "{role}" "{location}" speaker conference bio',
                f'"{role}" "{industry}" companies "{location}" list directory',
                f'"{industry}" "{role}" OR "co-{role}" "{location}" contact email phone',
                f'"{location}" top "{industry}" companies {role}s list',
            ])
        elif role and location:
            queries.extend([
                f'site:linkedin.com/in/ "{role}" "{location}"',
                f'"{role}" "{location}" email contact company',
                f'"{role}" technology company "{location}" about team',
            ])
        elif industry and location:
            queries.extend([
                f'"{industry}" companies "{location}" founders team',
                f'site:linkedin.com/in/ "{industry}" "{location}"',
                f'"{industry}" startup "{location}" contact about',
            ])
        else:
            # Very generic fallback
            queries.append(f'"{role or "founder"}" "{industry or "technology"}" "{location or "India"}" email contact')
        
        return queries
