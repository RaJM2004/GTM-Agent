import asyncio
import logging
import time
import datetime
import re
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
                        
                if not email_creds or not email_creds.get("email") or email_creds.get("auth_error"):
                    continue
                    
                logger.info(f"Background syncing emails for user {user_id} via {email_provider}")
                
                try:
                    if email_creds.get("auth_type") == "oauth" and email_provider == "gmail":
                        access_token = email_creds.get("access_token")
                        expires_at = email_creds.get("expires_at", 0)
                        refresh_token = email_creds.get("refresh_token")
                        
                        if time.time() >= expires_at - 60:
                            if not refresh_token:
                                continue
                            logger.info(f"Background poller refreshing Google token for {user_id}")
                            try:
                                refreshed = await refresh_gmail_token(refresh_token)
                                access_token = refreshed["access_token"]
                                expires_at = time.time() + refreshed["expires_in"]
                                await db.users.update_one(
                                    {"user_id": user_id},
                                    {"$set": {
                                        "integrations.gmail.access_token": access_token,
                                        "integrations.gmail.expires_at": expires_at,
                                        "integrations.gmail.auth_error": False
                                    }}
                                )
                            except Exception as refresh_err:
                                logger.warning(f"Google token refresh failed for user {user_id}: {refresh_err}")
                                if "invalid_grant" in str(refresh_err).lower():
                                    await db.users.update_one(
                                        {"user_id": user_id},
                                        {"$set": {
                                            "integrations.gmail.auth_error": True,
                                            "integrations.gmail.error_message": "Google authorization expired or revoked. Please reconnect."
                                        }}
                                    )
                                continue
                        
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


async def background_whatsapp_bot_poller():
    """Continuously checks connected WhatsApp sessions and triggers bot auto-responses."""
    logger.info("Starting background WhatsApp bot poller...")
    await asyncio.sleep(6)
    from services.whatsapp import openwa_service
    from api.whatsapp_bot import process_incoming_whatsapp_bot

    while True:
        try:
            db = database.db
            if db is not None:
                # 1. Fetch all instances once in a single call
                instances = await openwa_service.fetch_instances()
                connected_sessions = []
                for inst_obj in instances:
                    inst = inst_obj.get("instance", inst_obj)
                    inst_name = inst.get("instanceName", "")
                    raw_status = str(inst.get("status") or inst.get("connectionStatus") or inst.get("state") or "").lower()
                    if inst_name:
                        if raw_status in ("open", "connected"):
                            connected_sessions.append(inst_name)
                        elif raw_status in ("connecting",):
                            state = await openwa_service.get_connection_status(inst_name)
                            if state == "CONNECTED":
                                connected_sessions.append(inst_name)

                # Fallback to registered sessions in DB if fetch_instances is temporarily unreachable
                if not connected_sessions:
                    cursor = db.users.find({"integrations.whatsapp.status": "connected"})
                    async for u in cursor:
                        sess = u.get("integrations", {}).get("whatsapp", {}).get("session_id")
                        if sess and sess not in connected_sessions:
                            connected_sessions.append(sess)

                for session_id in connected_sessions:
                    user_id = session_id.replace("user_", "", 1) if session_id.startswith("user_") else session_id
                    if not user_id:
                        continue

                    # Check if user has active templates
                    has_active = await db.whatsapp_templates.find_one({"user_id": user_id, "is_active": {"$ne": False}})
                    if not has_active:
                        continue

                    # Fetch latest 20 messages from instance
                    try:
                        messages = await openwa_service._make_request(
                            "POST", 
                            f"/chat/findMessages/{session_id}", 
                            {"limit": 20, "page": 1}, 
                            timeout=8.0, 
                            silent_404=True
                        )
                        if not isinstance(messages, list):
                            continue

                        for m in messages:
                            key = m.get("key", {})
                            msg_id = key.get("id")
                            from_me = key.get("fromMe", False)
                            jid = key.get("remoteJid", "")
                            raw_phone = jid.split("@")[0] if jid else ""

                            # Skip outbound messages, groups, newsletters, or broadcasts
                            if from_me or not raw_phone or "@g.us" in jid or "@newsletter" in jid or "@broadcast" in jid:
                                continue

                            push_name = m.get("pushName") or "there"

                            # Resolve LID to real phone number if WhatsApp sent a Linked ID
                            target_phone = raw_phone
                            if "@lid" in jid or len(raw_phone) > 13:
                                # 1. Check cached mapping
                                cached = await db.whatsapp_lid_mappings.find_one({"$or": [{"lid": jid}, {"lid": raw_phone}]})
                                if cached and cached.get("phone"):
                                    target_phone = cached["phone"]
                                else:
                                    # 2. Check logs by LID or pushName
                                    log_match = await db.whatsapp_logs.find_one({
                                        "$or": [
                                            {"lid": {"$regex": raw_phone}},
                                            {"reply_push_name": push_name} if push_name != "there" else {"lid": raw_phone}
                                        ]
                                    })
                                    if log_match and log_match.get("phone_number"):
                                        target_phone = log_match["phone_number"]
                                    else:
                                        # 3. Check leads
                                        if push_name and push_name != "there":
                                            lead_match = await db.leads.find_one({
                                                "name": {"$regex": push_name.strip(), "$options": "i"},
                                                "phone": {"$exists": True, "$ne": ""}
                                            })
                                            if lead_match and lead_match.get("phone"):
                                                target_phone = lead_match["phone"]

                                # Cache the resolution for instant lookups
                                if target_phone and target_phone != raw_phone and "@lid" not in target_phone:
                                    await db.whatsapp_lid_mappings.update_one(
                                        {"lid": jid},
                                        {"$set": {"lid": jid, "phone": target_phone, "push_name": push_name, "updated_at": datetime.datetime.utcnow()}},
                                        upsert=True
                                    )
                                elif "@lid" in jid:
                                    # Skip unresolvable community / broadcast LID announcements
                                    continue

                            # Skip stale messages older than 1 hour
                            ts_raw = m.get("messageTimestamp", 0)
                            ts = ts_raw if isinstance(ts_raw, (int, float)) else ts_raw.get("low", 0) if isinstance(ts_raw, dict) else 0
                            if ts and (time.time() - ts) > 3600:
                                continue

                            # Extract incoming text (supports plain text, button clicks, list choices, and interactive taps)
                            msg_obj = m.get("message", {})
                            text = (
                                msg_obj.get("conversation") or 
                                msg_obj.get("extendedTextMessage", {}).get("text") or 
                                msg_obj.get("buttonsResponseMessage", {}).get("selectedDisplayText") or
                                msg_obj.get("buttonsResponseMessage", {}).get("selectedButtonId") or
                                msg_obj.get("listResponseMessage", {}).get("title") or
                                msg_obj.get("listResponseMessage", {}).get("singleSelectReply", {}).get("selectedRowId") or
                                msg_obj.get("interactiveResponseMessage", {}).get("body", {}).get("text") or
                                msg_obj.get("pollUpdateMessage", {}).get("vote", {}).get("selectedOptions", [{}])[0].get("name") if msg_obj.get("pollUpdateMessage", {}).get("vote", {}).get("selectedOptions") else "" or
                                ""
                            ).strip()
                            if not text:
                                continue

                            # Normalize phone number to standard E.164
                            clean_target_phone = re.sub(r"\D", "", target_phone).lstrip("0")
                            if len(clean_target_phone) == 10 and clean_target_phone[0] in "6789":
                                clean_target_phone = "91" + clean_target_phone

                            # Avoid double processing
                            already = await db.whatsapp_bot_sessions.find_one({
                                "user_id": user_id,
                                "phone_number": clean_target_phone,
                                "processed_message_ids": msg_id
                            })
                            if already:
                                continue

                            # Mark message ID as processed immediately
                            await db.whatsapp_bot_sessions.update_one(
                                {"user_id": user_id, "phone_number": clean_target_phone},
                                {"$addToSet": {"processed_message_ids": msg_id}},
                                upsert=True
                            )

                            logger.info(f"WhatsApp Bot Poller: new inbound message from {clean_target_phone} (JID: {jid}): '{text[:30]}'")
                            handled = await process_incoming_whatsapp_bot(
                                user_id=user_id,
                                phone_number=clean_target_phone,
                                message_text=text,
                                lead_name=push_name
                            )
                            if not handled:
                                # If skipped (e.g. bot was paused), do not mark as consumed so it can be handled once enabled
                                await db.whatsapp_bot_sessions.update_one(
                                    {"user_id": user_id, "phone_number": clean_target_phone},
                                    {"$pull": {"processed_message_ids": msg_id}}
                                )
                    except Exception as poll_err:
                        logger.debug(f"WhatsApp poll error for {session_id}: {poll_err}")
        except Exception as e:
            logger.error(f"Error in background WhatsApp bot poller: {e}")

        # Poll every 6 seconds for snappy auto-replies
        await asyncio.sleep(6)
