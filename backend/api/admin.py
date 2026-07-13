"""
Admin Router
Admin-only endpoints for user management, integration monitoring, and Vapi assistant inventory.
Every endpoint is protected by the `get_current_admin` dependency, ensuring only admins can access it.
"""

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from services.auth import get_current_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


# ── User Management ────────────────────────────────────────────────────────────

@router.get("/users")
async def list_all_users(
    page: int = 1,
    limit: int = 50,
    _admin: dict = Depends(get_current_admin)
):
    """
    List all registered users with their campaign and lead counts.
    Admin-only endpoint.
    """
    from database import db
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    skip = (page - 1) * limit
    cursor = db.users.find(
        {},
        {
            "_id": 0,
            "user_id": 1,
            "email": 1,
            "name": 1,
            "company": 1,
            "role": 1,
            "is_active": 1,
            "auth_provider": 1,
            "token_balance": 1,
            "trial_active": 1,
            "created_at": 1,
        }
    ).sort("created_at", -1).skip(skip).limit(limit)

    users = await cursor.to_list(length=limit)
    total = await db.users.count_documents({})

    # Enrich each user with their campaign and lead counts
    for user in users:
        uid = user.get("user_id")
        user["campaign_count"] = await db.campaigns.count_documents({"user_id": uid})
        user["lead_count"] = await db.leads.count_documents({"user_id": uid})
        # Serialise datetime
        if "created_at" in user and hasattr(user["created_at"], "isoformat"):
            user["created_at"] = user["created_at"].isoformat()

    return {"users": users, "total": total, "page": page, "limit": limit}


@router.patch("/users/{user_id}/status")
async def toggle_user_status(
    user_id: str,
    body: dict,
    _admin: dict = Depends(get_current_admin)
):
    """
    Activate or deactivate a user account.
    Body: { "is_active": true/false }
    """
    from database import db
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    is_active = body.get("is_active")
    if is_active is None:
        raise HTTPException(status_code=400, detail="'is_active' field is required")

    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_active": is_active, "updated_at": datetime.now(timezone.utc)}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    action = "activated" if is_active else "deactivated"
    return {"success": True, "user_id": user_id, "status": action}


@router.post("/users/{user_id}/notify-reconnect")
async def notify_user_reconnect(
    user_id: str,
    _admin: dict = Depends(get_current_admin)
):
    """
    Send a notification to a user asking them to reconnect an expired integration.
    """
    from services.notifications import create_notification
    await create_notification(
        user_id=user_id,
        title="Action Required: Reconnect Integration",
        message="Your admin has flagged that one or more of your integrations needs to be reconnected. Please visit the Integrations page.",
        notif_type="warning"
    )
    return {"success": True, "message": f"Reconnect notification sent to user {user_id}"}


# ── Integration Monitoring ─────────────────────────────────────────────────────

@router.get("/integrations/status")
async def get_all_integration_statuses(_admin: dict = Depends(get_current_admin)):
    """
    View all users' integration connection statuses (no credentials shown).
    Flags users with expired or missing integrations.
    """
    from database import db
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    cursor = db.users.find(
        {"integrations": {"$exists": True, "$ne": {}}},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1, "integrations": 1}
    )
    users = await cursor.to_list(length=1000)

    report = []
    for user in users:
        integrations = user.get("integrations", {})
        integration_summary = {}
        for platform, data in integrations.items():
            if isinstance(data, dict):
                import time
                expires_at = data.get("expires_at", None)
                is_expired = expires_at and time.time() > expires_at
                integration_summary[platform] = {
                    "connected": True,
                    "expired": is_expired,
                }
            else:
                integration_summary[platform] = {"connected": bool(data), "expired": False}

        report.append({
            "user_id": user.get("user_id"),
            "email": user.get("email"),
            "name": user.get("name"),
            "integrations": integration_summary,
        })

    return {"data": report, "total_users_with_integrations": len(report)}


# ── Vapi Assistant Inventory ───────────────────────────────────────────────────

@router.get("/vapi-assistants")
async def list_vapi_assistants(_admin: dict = Depends(get_current_admin)):
    """
    List all provisioned Vapi assistants across all campaigns and users.
    """
    from database import db
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    # Query all campaigns that have a vapi_assistant_id
    cursor = db.campaigns.find(
        {"vapi_assistant_id": {"$exists": True, "$ne": None}},
        {
            "_id": 0,
            "campaign_id": 1,
            "name": 1,
            "user_id": 1,
            "vapi_assistant_id": 1,
            "status": 1,
            "created_at": 1,
        }
    ).sort("created_at", -1)

    assistants = await cursor.to_list(length=1000)
    for a in assistants:
        if "created_at" in a and hasattr(a["created_at"], "isoformat"):
            a["created_at"] = a["created_at"].isoformat()

    return {"assistants": assistants, "total": len(assistants)}


@router.patch("/vapi-assistants/{campaign_id}/archive")
async def archive_vapi_assistant(
    campaign_id: str,
    _admin: dict = Depends(get_current_admin)
):
    """
    Force-archive a campaign's Vapi assistant by setting status to 'Archived'.
    """
    from database import db
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    result = await db.campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$set": {"status": "Archived", "updated_at": datetime.now(timezone.utc)}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")

    return {"success": True, "campaign_id": campaign_id, "status": "Archived"}


# ── Audit Logs ─────────────────────────────────────────────────────────────────

@router.get("/audit-logs")
async def get_audit_logs(
    page: int = 1,
    limit: int = 100,
    user_id: str = None,
    _admin: dict = Depends(get_current_admin)
):
    """
    Fetch audit logs. Optionally filter by user_id.
    """
    from database import db
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    query = {}
    if user_id:
        query["user_id"] = user_id

    skip = (page - 1) * limit
    cursor = db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit)
    logs = await cursor.to_list(length=limit)
    total = await db.audit_logs.count_documents(query)

    for log in logs:
        if "timestamp" in log and hasattr(log["timestamp"], "isoformat"):
            log["timestamp"] = log["timestamp"].isoformat()

    return {"logs": logs, "total": total, "page": page, "limit": limit}
