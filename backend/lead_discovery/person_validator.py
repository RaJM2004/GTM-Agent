"""
Person Validator - Ensures leads represent real human individuals,
filtering out company profiles, news headlines, directories, and department names.
"""

import re
from typing import Optional

# Non-person keywords: corporate identifiers, departments, news, listings
DISQUALIFYING_TERMS = {
    # Corporate entity types & business buzzwords
    "pvt", "ltd", "inc", "corp", "corporation", "llc", "llp", "technologies",
    "technology", "solutions", "services", "systems", "ventures", "holdings",
    "software", "labs", "studio", "group", "agency", "consulting", "enterprises",
    "networks", "digital", "global", "industries", "associates", "logistics",

    # Educational / Academic entities (when appearing as the name itself)
    "university", "college", "school", "department", "dept", "institute",
    "institution", "centre", "center", "academy", "campus", "library",
    "faculty listing", "faculty directory", "faculty members", "faculty member",
    "adjunct faculty", "visiting faculty", "emeritus", "faculty", "members",
    "staff", "personnel", "scholars", "researchers", "fellows", "alumni",
    "syllabus", "admissions",

    # Website navigation & meta phrases
    "contact us", "about us", "our team", "meet our", "home page", "overview",
    "terms of service", "privacy policy", "careers", "jobs", "hiring",

    # News, Listings, Crunchbase, and Article keywords
    "profile & funding", "funding", "invested in", "portfolio", "list of",
    "top 10", "top 20", "top 50", "top 100", "best", "raises", "raised",
    "valuation", "series a", "series b", "seed round", "round", "million",
    "billion", "announced", "acquires", "acquisition", "merger", "market",
    "report", "guide", "news", "press release", "summit", "conference",
    "awards", "jury", "fellowship", "companies", "startups", "investors",
    "directory", "course", "training", "tutorial", "certification",

    # Broad Academic Fields / Subjects (when mistakenly matched as names)
    "artificial intelligence", "machine learning", "deep learning", "data science",
    "liberal arts", "computer science", "information technology", "robotics",
    "cyber security", "cloud computing", "neural network",

    # Generic roles without a person's name
    "professor at", "founder at", "ceo at", "cto at", "director at", "manager at",
    "executive at", "lead at", "head of", "dean of", "speaker at"
}

# Accepted title prefixes / honorifics
HONORIFICS = {"dr", "dr.", "prof", "prof.", "mr", "mr.", "ms", "ms.", "mrs", "mrs."}


def clean_person_name(raw_name: str) -> str:
    """Clean a raw person name by removing common artifacts."""
    if not raw_name:
        return ""

    name = raw_name.strip()

    # Remove common URL/title suffixes
    name = re.sub(r'\s*[-–|:]\s*(LinkedIn|Crunchbase.*|Facebook|Twitter|X|YouTube|Wikipedia).*$', '', name, flags=re.I)
    
    # Remove credentials at the end, like ", Ph.D.", ", MD", ", MBA", ", F.C.A."
    name = re.sub(r',\s*(Ph\.?D\.?|M\.?D\.?|M\.?B\.?A\.?|M\.?Tech|B\.?Tech|M\.?S\.?|PMP).*$', '', name, flags=re.I)
    
    # Remove leading numbering or bullets (e.g., "1. Shailendra" -> "Shailendra")
    name = re.sub(r'^\d+[\.\)\-\s]+', '', name)
    
    # Remove brackets or parenthesized text (e.g., "Dr. John Doe (AI Researcher)")
    name = re.sub(r'\(.*?\)', '', name)
    name = re.sub(r'\[.*?\]', '', name)

    # Clean double spaces
    name = re.sub(r'\s+', ' ', name).strip()
    return name


def is_valid_person_name(name: str) -> bool:
    """
    Validate whether a given string is a genuine human name.
    Rejects company names, headlines, department titles, and placeholders.
    """
    cleaned = clean_person_name(name)
    if not cleaned:
        return False

    cleaned_lower = cleaned.lower()

    # 1. Reject if length is too short or too long
    if len(cleaned) < 3 or len(cleaned) > 40:
        return False

    # 2. Reject if any disqualifying phrase is in the name
    for term in DISQUALIFYING_TERMS:
        # Match whole word or phrase
        if re.search(r'\b' + re.escape(term) + r'\b', cleaned_lower):
            return False

    # 3. Reject if it contains " at " (placeholder like "Professor at Kore.ai")
    if " at " in cleaned_lower:
        return False

    # 4. Reject if it contains numbers or invalid symbols
    if re.search(r'[\d@#\$%\^&\*\+=\<\>\\/_{}\[\]~]', cleaned):
        return False

    # 5. Token analysis
    tokens = cleaned.split()
    
    # Filter out honorifics from token count
    name_tokens = [t for t in tokens if t.lower().rstrip('.') not in {"dr", "prof", "mr", "ms", "mrs"}]

    # A real person name typically has 2 to 4 tokens (e.g. "Shailendra Kadre", "Uma N. Dulhare")
    # Single-token names are rarely verifiable B2B leads unless known, but usually indicate noise
    if len(name_tokens) < 2 or len(name_tokens) > 4:
        return False

    # Each name token should start with an uppercase letter and be alphabetic (allowing dots/hyphens for initials)
    for token in name_tokens:
        clean_token = token.rstrip('.').replace('-', '').replace("'", "")
        if not clean_token:
            return False
        # Must start with uppercase
        if not token[0].isupper():
            return False
        # Must be alphabetic
        if not clean_token.isalpha():
            return False

    return True
