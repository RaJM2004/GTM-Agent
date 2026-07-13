import asyncio
import logging
import time
import database
from services.email_fetcher import refresh_gmail_token, fetch_emails_via_gmail_api, fetch_real_emails
from api.integrations import _process_incoming_emails
from services.notifications import create_notification

logger = logging.getLogger(__name__)

async def background_email_poller():
    """Continuously polls connected email accounts in the background to classify replies."""
    logger.info("Starting background email poller...")
    
    # Wait a few seconds before starting the first poll to let the server boot up
    await asyncio.sleep(5)
    
    while True:
        try:
            db = database.db
            if db is None:
                logger.warning("DB not connected in background poller. Retrying in 60s.")
                await asyncio.sleep(60)
                continue
                
            # Find all users with any integration
            users_cursor = db.users.find({"integrations": {"$exists": True, "$ne": {}}})
            users = await users_cursor.to_list(length=1000)
            
            for user in users:
                user_id = user.get("user_id")
                integrations = user.get("integrations", {})
                
                email_creds = None
                email_provider = None
                for provider in ["gmail", "outlook", "smtp", "imap"]:
                    if provider in integrations:
                        email_creds = integrations[provider]
                        email_provider = provider
                        break
                        
                if not email_creds or not email_creds.get("email"):
                    continue
                    
                logger.info(f"Background syncing emails for user {user_id} via {email_provider}")
                
                try:
                    if email_creds.get("auth_type") == "oauth" and email_provider == "gmail":
                        access_token = email_creds.get("access_token")
                        expires_at = email_creds.get("expires_at", 0)
                        refresh_token = email_creds.get("refresh_token")
                        
                        if time.time() >= expires_at - 60:
                            if refresh_token:
                                logger.info(f"Background poller refreshing Google token for {user_id}")
                                refreshed = await refresh_gmail_token(refresh_token)
                                access_token = refreshed["access_token"]
                                expires_at = time.time() + refreshed["expires_in"]
                                await db.users.update_one(
                                    {"user_id": user_id},
                                    {"$set": {
                                        "integrations.gmail.access_token": access_token,
                                        "integrations.gmail.expires_at": expires_at
                                    }}
                                )
                        
                        emails = await fetch_emails_via_gmail_api(access_token, folder="inbox")
                        new_replies = await _process_incoming_emails(emails, user_id)
                        if new_replies and len(new_replies) > 0:
                            await create_notification(
                                user_id=user_id,
                                title="New Email Replies",
                                message=f"You have {len(new_replies)} new reply(s) from your campaign leads.",
                                notif_type="info"
                            )
                    else:
                        # Standard IMAP
                        emails = await fetch_real_emails(
                            email_address=email_creds.get("email"),
                            password=email_creds.get("password"),
                            host=email_creds.get("host", ""),
                            folder="inbox"
                        )
                        await _process_incoming_emails(emails, user_id)
                except Exception as e:
                    logger.error(f"Error in background sync for user {user_id}: {e}")
                    
        except Exception as e:
            logger.error(f"Critical error in background email poller: {e}")
            
        # Poll every 60 seconds
        await asyncio.sleep(60)
