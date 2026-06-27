"""
Leads API Router - Endpoints for managing saved leads from MongoDB.
Supports viewing leads by industry, CSV export, and campaign integration.
"""

import csv
import io
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/leads", tags=["leads"])


class LeadItem(BaseModel):
    name: str = ""
    title: str = ""
    company: str = ""
    email: str = ""
    phone: str = ""
    linkedin_url: str = ""
    website: str = ""
    location: str = ""
    industry: str = ""
    confidence: float = 0.0
    source: str = ""
    discovery_prompt: str = ""
    company_size: str = ""


class IndustryGroup(BaseModel):
    industry: str
    lead_count: int
    leads: List[LeadItem]
    discovery_prompts: List[str] = []


class LeadsResponse(BaseModel):
    success: bool = True
    total_leads: int = 0
    industry_groups: List[IndustryGroup] = []


@router.get("", response_model=LeadsResponse)
async def get_all_leads(user_id: str = ""):
    """
    Fetch all saved leads from MongoDB, grouped by industry.
    Returns leads organized into industry folders with counts.
    """
    try:
        from database import db
        if db is None:
            return LeadsResponse(success=True, total_leads=0, industry_groups=[])

        collection = db.leads
        cursor = collection.find({"user_id": user_id})
        all_leads = await cursor.to_list(length=5000)

        # Group by industry
        industry_map = {}
        for doc in all_leads:
            industry = doc.get("industry", "").strip() or "Uncategorized"
            industry = industry.title()

            if industry not in industry_map:
                industry_map[industry] = {"leads": [], "prompts": set()}

            industry_map[industry]["leads"].append(LeadItem(
                name=doc.get("name", ""),
                title=doc.get("title", ""),
                company=doc.get("company", ""),
                email=doc.get("email", ""),
                phone=doc.get("phone", ""),
                linkedin_url=doc.get("linkedin_url", ""),
                website=doc.get("website", ""),
                location=doc.get("location", ""),
                industry=industry,
                confidence=doc.get("confidence", 0.0),
                source=doc.get("source", ""),
                discovery_prompt=doc.get("discovery_prompt", ""),
                company_size=doc.get("company_size", ""),
            ))
            prompt = doc.get("discovery_prompt", "")
            if prompt:
                industry_map[industry]["prompts"].add(prompt)

        # Build response
        groups = []
        total = 0
        for ind, data in sorted(industry_map.items(), key=lambda x: len(x[1]["leads"]), reverse=True):
            groups.append(IndustryGroup(
                industry=ind,
                lead_count=len(data["leads"]),
                leads=data["leads"],
                discovery_prompts=list(data["prompts"])
            ))
            total += len(data["leads"])

        return LeadsResponse(
            success=True,
            total_leads=total,
            industry_groups=groups
        )
    except Exception as e:
        logger.error(f"[Leads API] Failed to fetch leads: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export")
async def export_leads_csv(industry: Optional[str] = None, user_id: str = ""):
    """
    Export leads as a downloadable CSV file.
    Optionally filter by industry.
    """
    try:
        from database import db
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")

        collection = db.leads
        query = {"user_id": user_id}
        if industry and industry.lower() != "all":
            query["industry"] = {"$regex": industry, "$options": "i"}

        cursor = collection.find(query)
        all_leads = await cursor.to_list(length=5000)

        # Generate CSV
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Name", "Title", "Company", "Email", "Phone",
            "LinkedIn", "Website", "Location", "Industry",
            "Company Size", "Confidence", "Source", "Discovery Prompt"
        ])

        for doc in all_leads:
            writer.writerow([
                doc.get("name", ""),
                doc.get("title", ""),
                doc.get("company", ""),
                doc.get("email", ""),
                doc.get("phone", ""),
                doc.get("linkedin_url", ""),
                doc.get("website", ""),
                doc.get("location", ""),
                doc.get("industry", ""),
                doc.get("company_size", ""),
                doc.get("confidence", ""),
                doc.get("source", ""),
                doc.get("discovery_prompt", ""),
            ])

        output.seek(0)
        filename = f"leads_{industry or 'all'}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Leads API] CSV export failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/industry/{industry_name}")
async def delete_industry_leads(industry_name: str, user_id: str = ""):
    """Delete all leads for a specific industry."""
    try:
        from database import db
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")

        collection = db.leads
        result = await collection.delete_many(
            {"industry": {"$regex": industry_name, "$options": "i"}, "user_id": user_id}
        )
        return {
            "success": True,
            "deleted_count": result.deleted_count,
            "message": f"Deleted {result.deleted_count} leads from {industry_name}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Leads API] Delete failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
