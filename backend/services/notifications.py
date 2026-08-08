"""
Notifications Service
Provides a helper to create in-app notification records in MongoDB.
Called from background_poller, campaign endpoints, etc.
"""

import logging
import uuid
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


async def create_notification(user_id: str, title: str, message: str, notif_type: str = "info"):
    """
    Create an in-app notification for a user.

    Args:
        user_id:    The recipient user's ID.
        title:      Short notification title (e.g. "Campaign Completed").
        message:    Detailed notification body.
        notif_type: One of 'info', 'success', 'warning', 'error'.
    """
    try:
        import database
        if database.db is None:
            logger.warning("DB not connected. Notification not saved.")
            return

        notification = {
            "notification_id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": title,
            "message": message,
            "type": notif_type,
            "is_read": False,
            "created_at": datetime.now(timezone.utc),
        }

        await database.db.notifications.insert_one(notification)
        logger.info(f"Notification created for user {user_id}: {title}")

    except Exception as e:
        logger.error(f"Failed to create notification for user {user_id}: {e}")
