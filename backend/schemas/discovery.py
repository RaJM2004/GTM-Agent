"""
Pydantic schemas for the Lead Discovery module.
Defines request/response models for the discovery API.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class DiscoveryRequest(BaseModel):
    """Request model for AI-powered lead discovery."""
    prompt: str = Field(
        ...,
        description="Natural language search prompt",
        examples=["Find 50 founders of AI companies with 5+ years of experience in Hyderabad"]
    )
    max_results: int = Field(default=50, ge=1, le=200, description="Maximum number of leads to return")


class ParsedQuery(BaseModel):
    """Structured representation of a parsed natural language query."""
    role: str = Field(default="", description="Target role/title (e.g., 'founder', 'CTO', 'VP Engineering')")
    industry: str = Field(default="", description="Target industry (e.g., 'AI', 'SaaS', 'FinTech')")
    location: str = Field(default="", description="Target location/city/region")
    experience_years: int = Field(default=0, description="Minimum years of experience")
    company_size: str = Field(default="", description="Target company size range")
    count: int = Field(default=50, description="Number of leads requested")
    keywords: List[str] = Field(default_factory=list, description="Additional search keywords")
    search_queries: List[str] = Field(
        default_factory=list,
        description="Generated Google search queries for finding these leads"
    )


class LeadContact(BaseModel):
    """Discovered lead with contact information."""
    name: str = Field(default="", description="Full name of the person")
    title: str = Field(default="", description="Job title / role")
    company: str = Field(default="", description="Company name")
    email: str = Field(default="", description="Email address")
    phone: str = Field(default="", description="Phone number")
    linkedin_url: str = Field(default="", description="LinkedIn profile URL")
    website: str = Field(default="", description="Company or personal website")
    location: str = Field(default="", description="City / Region")
    source: str = Field(default="", description="Data source (google, maps, web)")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0, description="Confidence score 0-1")
    experience_years: Optional[int] = Field(default=None, description="Estimated years of experience")
    company_size: str = Field(default="", description="Company size estimate")
    industry: str = Field(default="", description="Industry classification")


class DiscoveryResponse(BaseModel):
    """Response model for lead discovery results."""
    success: bool = True
    query: str = ""
    parsed_query: Optional[ParsedQuery] = None
    total_found: int = 0
    leads: List[LeadContact] = Field(default_factory=list)
    sources_used: List[str] = Field(default_factory=list)
    message: str = ""


class DiscoveryStatus(BaseModel):
    """Status response for async discovery jobs."""
    job_id: str
    status: str  # "pending", "running", "completed", "failed"
    progress: int = 0  # percentage 0-100
    total_found: int = 0
    message: str = ""
