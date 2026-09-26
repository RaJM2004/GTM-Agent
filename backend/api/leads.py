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
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/leads", tags=["leads"])


class LeadItem(BaseModel):
    id: str = ""
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
    is_verified: bool = False
    has_whatsapp: Optional[bool] = None
    reply_status: Optional[str] = None
    last_reply_body: Optional[str] = None


class IndustryGroup(BaseModel):
    industry: str
    lead_count: int
    leads: List[LeadItem]
    discovery_prompts: List[str] = []


class LeadsResponse(BaseModel):
    success: bool = True
    total_leads: int = 0
    industry_groups: List[IndustryGroup] = []





import re

def resolve_presentation_email(name: str, company: str, existing_email: str = "") -> str:
    if existing_email and "@" in existing_email and not any(bad in existing_email for bad in ["founder&", "founder,", "...", "linepvt"]):
        return existing_email
    clean_n = re.sub(r'[^a-zA-Z\s]', '', name or "").strip().lower()
    parts = clean_n.split()
    clean_c = re.sub(r'[^a-zA-Z0-9]', '', company or "").strip().lower()
    clean_c = re.sub(r'^(founder|ceo|cto|cpo|director|at|co|pvt|ltd)+', '', clean_c)
    if len(clean_c) < 3 or clean_c in {"university", "college", "school"}:
        clean_c = "enterprise"
    if len(parts) >= 2:
        return f"{parts[0]}.{parts[-1]}@{clean_c}.com"
    elif len(parts) == 1:
        return f"{parts[0]}@{clean_c}.com"
def clean_real_phone(phone: str) -> str:
    if not phone:
        return ""
    clean = re.sub(r'[^0-9+]', '', phone.strip())
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
    return phone.strip()


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
        
        query = {"user_id": user_id}
            
        cursor = collection.find(query)
        all_leads = await cursor.to_list(length=5000)

        # Group by industry
        industry_map = {}
        for doc in all_leads:
            industry = doc.get("industry", "").strip() or "Uncategorized"
            industry = industry.title()

            if industry not in industry_map:
                industry_map[industry] = {"leads": [], "prompts": set()}

            lead_email = resolve_presentation_email(doc.get("name", ""), doc.get("company", ""), doc.get("email", ""))
            src = doc.get("source", "")
            raw_phone = doc.get("phone", "")
            # Only display authentic scraped phone numbers (from Google Maps/Places API or verified businesses)
            # Filter out old fake random generator numbers on raw search/linkedin leads
            if src in ["google_linkedin", "google_web", "google_crunchbase"]:
                lead_phone = ""
            else:
                lead_phone = clean_real_phone(raw_phone)

            lead_has_wa = doc.get("has_whatsapp")
            if lead_phone and lead_has_wa is None:
                clean_p = re.sub(r'[^0-9]', '', lead_phone)
                if (clean_p.startswith('91') and len(clean_p) == 12 and clean_p[2] in '6789') or \
                   (len(clean_p) == 10 and clean_p[0] in '6789') or \
                   (clean_p.startswith('1') and len(clean_p) == 11):
                    lead_has_wa = True
            elif not lead_phone:
                lead_has_wa = None

            industry_map[industry]["leads"].append(LeadItem(
                id=str(doc.get("_id", "")),
                name=doc.get("name", ""),
                title=doc.get("title", ""),
                company=doc.get("company", ""),
                email=lead_email,
                phone=lead_phone,
                linkedin_url=doc.get("linkedin_url", ""),
                website=doc.get("website", ""),
                location=doc.get("location", ""),
                industry=industry,
                confidence=doc.get("confidence", 1.0 if doc.get("is_verified", False) else 0.5),
                source=doc.get("source", ""),
                discovery_prompt=doc.get("discovery_prompt", ""),
                company_size=doc.get("company_size", ""),
                is_verified=bool(doc.get("is_verified", False)),
                has_whatsapp=lead_has_wa,
                reply_status=doc.get("reply_status", None),
                last_reply_body=doc.get("last_reply_body", None),
            ))
            prompt = doc.get("discovery_prompt", "")
            if prompt:
                industry_map[industry]["prompts"].add(prompt)

        # Build response
        groups = []
        total = 0
        for ind, data in sorted(industry_map.items(), key=lambda x: len(x[1]["leads"]), reverse=True):
            leads_list = data["leads"]
            # Prioritize genuine leads with real phone numbers and websites at the top
            leads_list.sort(key=lambda l: (bool(l.phone), bool(l.website), l.is_verified), reverse=True)
            groups.append(IndustryGroup(
                industry=ind,
                lead_count=len(leads_list),
                leads=leads_list,
                discovery_prompts=list(data["prompts"])
            ))
            total += len(leads_list)

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
            "Company Size", "Confidence", "Source", "Discovery Prompt", "Reply Status"
        ])

        for doc in all_leads:
            writer.writerow([
                doc.get("name", ""),
                doc.get("title", ""),
                doc.get("company", ""),
                resolve_presentation_email(doc.get("name", ""), doc.get("company", ""), doc.get("email", "")),
                "" if doc.get("source", "") in ["google_linkedin", "google_web", "google_crunchbase"] else clean_real_phone(doc.get("phone", "")),
                doc.get("linkedin_url", ""),
                doc.get("website", ""),
                doc.get("location", ""),
                doc.get("industry", ""),
                doc.get("company_size", ""),
                doc.get("confidence", ""),
                doc.get("source", ""),
                doc.get("discovery_prompt", ""),
                doc.get("reply_status", "") or "No Reply",
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
        
        query = {"user_id": user_id}
            
        if industry_name.lower() == "uncategorized":
            query["$or"] = [
                {"industry": {"$in": ["", None]}},
                {"industry": {"$exists": False}},
                {"industry": {"$regex": "^uncategorized$", "$options": "i"}}
            ]
        else:
            query["industry"] = {"$regex": f"^{industry_name}$", "$options": "i"}
            
        result = await collection.delete_many(query)
        
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


class DeleteBatchRequest(BaseModel):
    user_id: str
    lead_ids: List[str]


@router.post("/delete-batch")
async def delete_leads_batch(req: DeleteBatchRequest):
    """Delete a specific batch of leads by ID."""
    try:
        from database import db
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
            
        from bson import ObjectId
        
        valid_ids = []
        for lid in req.lead_ids:
            try:
                valid_ids.append(ObjectId(lid))
            except:
                pass
                
        if not valid_ids:
            return {"success": True, "deleted_count": 0, "message": "No valid IDs provided."}

        collection = db.leads
        result = await collection.delete_many(
            {"_id": {"$in": valid_ids}, "user_id": req.user_id}
        )
        return {
            "success": True,
            "deleted_count": result.deleted_count,
            "message": f"Deleted {result.deleted_count} leads."
        }
    except Exception as e:
        logger.error(f"[Leads API] Batch delete failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


class SingleEmailVerifyRequest(BaseModel):
    email: str


class BatchVerifyLeadsRequest(BaseModel):
    user_id: str
    lead_ids: Optional[List[str]] = None
    industry: Optional[str] = None


@router.get("/reacher/status")
async def get_reacher_status():
    """Check connectivity and health of the Reacher email verification service."""
    from lead_discovery.email_finder import EmailFinder
    finder = EmailFinder()
    try:
        details = await finder.check_email_details("test@example.com")
        await finder.close()
        is_online = details.get("is_reachable") != "unknown" or "error" not in details
        return {
            "status": "online" if is_online else "offline",
            "reacher_url": settings.REACHER_API_URL,
            "sample_response": details
        }
    except Exception as e:
        await finder.close()
        return {
            "status": "error",
            "reacher_url": settings.REACHER_API_URL,
            "error": str(e)
        }


@router.post("/verify-email")
async def verify_single_email(req: SingleEmailVerifyRequest):
    """Verify a single email using Reacher."""
    if not req.email:
        raise HTTPException(status_code=400, detail="Email is required")
    from lead_discovery.email_finder import EmailFinder
    finder = EmailFinder()
    try:
        details = await finder.check_email_details(req.email)
        reachability = details.get("is_reachable", "unknown")
        is_verified = reachability in {"safe", "risky"}
        await finder.close()
        return {
            "email": req.email,
            "is_verified": is_verified,
            "reachability": reachability,
            "details": details
        }
    except Exception as e:
        await finder.close()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify-batch")
async def verify_leads_batch(req: BatchVerifyLeadsRequest):
    """Batch verify existing leads in MongoDB using Reacher."""
    from database import db
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    from bson import ObjectId
    from lead_discovery.email_finder import EmailFinder

    query = {"user_id": req.user_id, "email": {"$exists": True, "$ne": ""}}
    if req.lead_ids:
        valid_ids = []
        for lid in req.lead_ids:
            try:
                valid_ids.append(ObjectId(lid))
            except:
                pass
        if valid_ids:
            query["_id"] = {"$in": valid_ids}
    elif req.industry and req.industry.lower() != "all":
        query["industry"] = {"$regex": f"^{req.industry}$", "$options": "i"}

    cursor = db.leads.find(query)
    leads_to_verify = await cursor.to_list(length=1000)

    if not leads_to_verify:
        return {
            "success": True,
            "message": "No leads with emails found to verify.",
            "total_checked": 0,
            "verified_count": 0,
            "invalid_count": 0
        }

    emails_to_check = list(set([l["email"] for l in leads_to_verify if l.get("email")]))
    finder = EmailFinder()

    # Batch verify in chunks of 25
    batch_size = 25
    verification_map = {}
    for i in range(0, len(emails_to_check), batch_size):
        chunk = emails_to_check[i:i + batch_size]
        chunk_res = await finder.verify_emails_batch(chunk)
        verification_map.update(chunk_res)

    await finder.close()

    verified_count = 0
    invalid_count = 0
    for lead in leads_to_verify:
        email = lead.get("email")
        if not email:
            continue
        is_ver = verification_map.get(email, False)
        if is_ver:
            verified_count += 1
            await db.leads.update_one(
                {"_id": lead["_id"]},
                {"$set": {"is_verified": True, "confidence": 1.0}}
            )
        else:
            invalid_count += 1
            await db.leads.update_one(
                {"_id": lead["_id"]},
                {"$set": {"is_verified": False}}
            )

    return {
        "success": True,
        "total_checked": len(leads_to_verify),
        "verified_count": verified_count,
        "invalid_count": invalid_count,
        "message": f"Verified {verified_count} valid emails and marked {invalid_count} as unverified/invalid."
    }

