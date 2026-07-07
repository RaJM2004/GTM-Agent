"""
Contacts API Router - Endpoints for managing user-uploaded contacts.
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

router = APIRouter(prefix="/api/contacts", tags=["contacts"])

class ContactItem(BaseModel):
    name: str = ""
    title: str = ""
    company: str = ""
    email: str = ""
    phone: str = ""
    linkedin_url: str = ""
    website: str = ""
    location: str = ""
    industry: str = ""
    source: str = "csv_import"
    list_name: str = ""
    confidence: float = 1.0

class ContactGroup(BaseModel):
    list_name: str
    contact_count: int
    contacts: List[ContactItem]

class ContactsResponse(BaseModel):
    success: bool = True
    total_contacts: int = 0
    contact_groups: List[ContactGroup] = []

@router.get("", response_model=ContactsResponse)
async def get_all_contacts(user_id: str = ""):
    """Fetch all imported contacts from MongoDB, grouped by list_name."""
    try:
        from database import db
        if db is None:
            return ContactsResponse(success=True, total_contacts=0, contact_groups=[])

        collection = db.contacts
        cursor = collection.find({"user_id": user_id} if user_id else {})
        all_contacts = await cursor.to_list(length=5000)

        # Group by list_name
        group_map = {}
        for doc in all_contacts:
            list_name = doc.get("list_name", "Uncategorized").strip() or "Uncategorized"

            if list_name not in group_map:
                group_map[list_name] = []

            group_map[list_name].append(ContactItem(
                name=doc.get("name", ""),
                title=doc.get("title", ""),
                company=doc.get("company", ""),
                email=doc.get("email", ""),
                phone=doc.get("phone", ""),
                linkedin_url=doc.get("linkedin_url", ""),
                website=doc.get("website", ""),
                location=doc.get("location", ""),
                industry=doc.get("industry", ""),
                source=doc.get("source", "csv_import"),
                list_name=list_name,
                confidence=doc.get("confidence", 1.0)
            ))

        # Build response
        groups = []
        total = 0
        for name, contacts in sorted(group_map.items(), key=lambda x: len(x[1]), reverse=True):
            groups.append(ContactGroup(
                list_name=name,
                contact_count=len(contacts),
                contacts=contacts
            ))
            total += len(contacts)

        return ContactsResponse(
            success=True,
            total_contacts=total,
            contact_groups=groups
        )
    except Exception as e:
        logger.error(f"[Contacts API] Failed to fetch contacts: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze")
async def analyze_contacts_csv(file: UploadFile = File(...)):
    """Analyze a CSV file and return its headers."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported at this time.")
        
    try:
        content = await file.read()
        text = content.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
        
        if not reader.fieldnames:
            raise HTTPException(status_code=400, detail="CSV file is empty or missing headers")
            
        return {"success": True, "headers": reader.fieldnames}
    except Exception as e:
        logger.error(f"[Contacts API] File analyze failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to analyze CSV: {str(e)}")

import json
from fastapi import Form

@router.post("/upload-mapped")
async def upload_mapped_contacts_csv(file: UploadFile = File(...), mapping: str = Form(...), user_id: str = Form("")):
    """Upload a CSV file of contacts using the user-provided column mapping."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported at this time.")
        
    try:
        from database import db
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
            
        col_map = json.loads(mapping)
        
        content = await file.read()
        text = content.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
        
        list_name = file.filename.replace(".csv", "")
        contacts_to_insert = []
        
        for row in reader:
            if not any(row.values()):
                continue
                
            contact_data = {
                "name": row.get(col_map.get("name", "")) if col_map.get("name") else "",
                "title": row.get(col_map.get("title", "")) if col_map.get("title") else "",
                "company": row.get(col_map.get("company", "")) if col_map.get("company") else "",
                "email": row.get(col_map.get("email", "")) if col_map.get("email") else "",
                "phone": row.get(col_map.get("phone", "")) if col_map.get("phone") else "",
                "linkedin_url": row.get(col_map.get("linkedin_url", "")) if col_map.get("linkedin_url") else "",
                "location": row.get(col_map.get("location", "")) if col_map.get("location") else "",
                "industry": row.get(col_map.get("industry", "")) if col_map.get("industry") else "",
                "source": "csv_import",
                "list_name": list_name,
                "confidence": 1.0,
                "user_id": user_id
            }
            contacts_to_insert.append(contact_data)
            
        if contacts_to_insert:
            await db.contacts.insert_many(contacts_to_insert)
            
        return {
            "success": True, 
            "message": f"Successfully imported {len(contacts_to_insert)} contacts into list '{list_name}'.",
            "count": len(contacts_to_insert)
        }
        
    except Exception as e:
        logger.error(f"[Contacts API] Mapped upload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process mapped CSV: {str(e)}")

@router.delete("/list/{list_name}")
async def delete_contact_list(list_name: str, user_id: str = ""):
    """Delete all contacts for a specific uploaded list."""
    try:
        from database import db
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")

        collection = db.contacts
        query = {"list_name": list_name}
        if user_id:
            query["user_id"] = user_id
        result = await collection.delete_many(query)
        return {
            "success": True,
            "deleted_count": result.deleted_count,
            "message": f"Deleted {result.deleted_count} contacts from list {list_name}"
        }
    except Exception as e:
        logger.error(f"[Contacts API] Delete failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
