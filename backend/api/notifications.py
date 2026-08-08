"""
Notifications Router
Endpoints for fetching and marking in-app notifications as read.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from services.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.get("")
async def get_notifications(
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """
    Fetch the latest notifications for the current user.
    Unread notifications are returned first, then read ones, newest first.
    """
    from database import db
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    user_id = current_user.get("user_id")
    cursor = db.notifications.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort([("is_read", 1), ("created_at", -1)]).limit(limit)

    notifications = await cursor.to_list(length=limit)

    # Convert datetime objects to ISO strings for JSON serialisation
    for n in notifications:
        if "created_at" in n and hasattr(n["created_at"], "isoformat"):
            n["created_at"] = n["created_at"].isoformat()

    return notifications


@router.get("/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Return the count of unread notifications for badge display."""
    from database import db
    if db is None:
        return {"count": 0}

    user_id = current_user.get("user_id")
    count = await db.notifications.count_documents({"user_id": user_id, "is_read": False})
    return {"count": count}


@router.patch("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark a single notification as read. Only the owner can mark their notification."""
    from database import db
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    user_id = current_user.get("user_id")
    result = await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user_id},
        {"$set": {"is_read": True}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")

    return {"success": True, "notification_id": notification_id}


@router.patch("/mark-all-read")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    """Mark ALL notifications as read for the current user."""
    from database import db
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    user_id = current_user.get("user_id")
    result = await db.notifications.update_many(
        {"user_id": user_id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"success": True, "updated_count": result.modified_count}
