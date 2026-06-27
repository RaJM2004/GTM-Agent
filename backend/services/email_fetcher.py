import imaplib
import email
from email.header import decode_header
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

async def fetch_real_emails(email_address: str, password: str, host: str = "", folder: str = "inbox") -> List[Dict]:
    """
    Fetch the latest 10 emails from the IMAP inbox for the user.
    """
    # Detect standard IMAP hosts
    imap_host = host
    if not imap_host:
        if "gmail.com" in email_address.lower():
            imap_host = "imap.gmail.com"
        elif "outlook.com" in email_address.lower() or "hotmail.com" in email_address.lower():
            imap_host = "outlook.office365.com"
        else:
            # Fallback to standard imap subdomain
            imap_host = f"imap.{email_address.split('@')[-1]}"

    # Use standard ports (993 for SSL)
    try:
        logger.info(f"Connecting to IMAP server {imap_host}:993 for user {email_address}...")
        
        # Connect and login
        mail = imaplib.IMAP4_SSL(imap_host, 993)
        mail.login(email_address, password)
        
        # Select inbox or sent in read-only mode
        mailbox = "INBOX"
        if folder == "sent":
            mailbox = '"[Gmail]/Sent Mail"' if "gmail" in imap_host else "Sent"
            
        try:
            mail.select(mailbox, readonly=True)
        except Exception as e:
            logger.warning(f"Could not select {mailbox}, falling back to INBOX. Error: {e}")
            mail.select("INBOX", readonly=True)
        
        # Search for all emails
        status, messages = mail.search(None, "ALL")
        if status != "OK":
            logger.warning("Could not execute IMAP search")
            return []
            
        mail_ids = messages[0].split()
        if not mail_ids:
            return []
            
        # Get latest 10 messages
        latest_ids = mail_ids[-10:]
        latest_ids.reverse() # Show most recent first
        
        email_list = []
        for idx, mail_id in enumerate(latest_ids):
            try:
                status, data = mail.fetch(mail_id, "(RFC822)")
                if status != "OK":
                    continue
                    
                raw_email = data[0][1]
                msg = email.message_from_bytes(raw_email)
                
                # Decode Subject
                subject = "No Subject"
                if msg["Subject"]:
                    decoded_parts = decode_header(msg["Subject"])
                    subject_parts = []
                    for part, encoding in decoded_parts:
                        if isinstance(part, bytes):
                            try:
                                subject_parts.append(part.decode(encoding or "utf-8", errors="ignore"))
                            except Exception:
                                subject_parts.append(part.decode("utf-8", errors="ignore"))
                        else:
                            subject_parts.append(str(part))
                    subject = "".join(subject_parts)
                    
                # Decode From
                from_sender = "Unknown Sender"
                sender_email = ""
                if msg["From"]:
                    decoded_parts = decode_header(msg["From"])
                    from_parts = []
                    for part, encoding in decoded_parts:
                        if isinstance(part, bytes):
                            try:
                                from_parts.append(part.decode(encoding or "utf-8", errors="ignore"))
                            except Exception:
                                from_parts.append(part.decode("utf-8", errors="ignore"))
                        else:
                            from_parts.append(str(part))
                    from_sender = "".join(from_parts)
                    
                sender_name = from_sender
                if "<" in from_sender:
                    parts = from_sender.split("<")
                    sender_name = parts[0].strip().replace('"', '')
                    sender_email = parts[1].replace(">", "").strip()
                    
                # Parse date
                date_str = msg["Date"] or "Unknown Time"
                
                # Retrieve email body text
                body = ""
                html_body = ""
                text_body = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        content_type = part.get_content_type()
                        content_disposition = str(part.get("Content-Disposition"))
                        
                        if "attachment" not in content_disposition:
                            if content_type == "text/html":
                                payload = part.get_payload(decode=True)
                                if payload:
                                    html_body = payload.decode(errors="ignore")
                            elif content_type == "text/plain":
                                payload = part.get_payload(decode=True)
                                if payload:
                                    text_body = payload.decode(errors="ignore")
                else:
                    payload = msg.get_payload(decode=True)
                    if payload:
                        content_type = msg.get_content_type()
                        if content_type == "text/html":
                            html_body = payload.decode(errors="ignore")
                        else:
                            text_body = payload.decode(errors="ignore")
                            
                if html_body:
                    body = html_body
                else:
                    body = text_body.replace('\n', '<br>')
                
                import re
                body_clean = body.strip()
                text_only = re.sub(r'<[^>]+>', ' ', body_clean).replace('&nbsp;', ' ').strip()
                text_only = re.sub(r'\s+', ' ', text_only)
                preview = text_only[:120] + "..." if len(text_only) > 120 else text_only
                
                email_list.append({
                    "id": idx + 1,
                    "name": sender_name or sender_email or "External Sender",
                    "company": sender_email.split("@")[-1].split(".")[0].title() if sender_email else "External",
                    "subject": subject,
                    "preview": preview or "(Empty body)",
                    "body": body_clean or "(No text content)",
                    "time": date_str,
                    "unread": False,
                    "channel": "email"
                })
            except Exception as e:
                logger.error(f"Error parsing email message {mail_id}: {e}")
                continue
                
        mail.close()
        mail.logout()
        return email_list
    except Exception as e:
        logger.error(f"IMAP connection or authentication failed: {e}")
        raise e


async def refresh_gmail_token(refresh_token: str) -> dict:
    """Refresh the Google OAuth access token using a refresh token."""
    from config import settings
    import httpx
    
    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token"
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        if res.status_code != 200:
            raise Exception(f"Failed to refresh Google OAuth token: {res.text}")
            
        data = res.json()
        return {
            "access_token": data["access_token"],
            "expires_in": data.get("expires_in", 3600)
        }


async def fetch_emails_via_gmail_api(access_token: str, folder: str = "inbox") -> List[Dict]:
    """Fetch the latest 10 messages from the Gmail API."""
    import httpx
    import base64
    
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {access_token}"}
        q_param = "in:inbox" if folder == "inbox" else "in:sent"
        res = await client.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages",
            headers=headers,
            params={"maxResults": 10, "q": q_param}
        )
        
        if res.status_code != 200:
            logger.error(f"Gmail API list messages failed: {res.text}")
            raise Exception(f"Gmail API failed: {res.text}")
            
        messages_data = res.json()
        messages = messages_data.get("messages", [])
        
        email_list = []
        for idx, m in enumerate(messages):
            msg_id = m["id"]
            try:
                msg_res = await client.get(
                    f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_id}",
                    headers=headers
                )
                if msg_res.status_code != 200:
                    continue
                    
                msg_data = msg_res.json()
                payload = msg_data.get("payload", {})
                headers_list = payload.get("headers", [])
                
                # Parse headers
                subject = "No Subject"
                from_sender = "Unknown Sender"
                date_str = ""
                for h in headers_list:
                    name = h.get("name", "").lower()
                    if name == "subject":
                        subject = h.get("value", "")
                    elif name == "from":
                        from_sender = h.get("value", "")
                    elif name == "date":
                        date_str = h.get("value", "")
                        
                sender_name = from_sender
                sender_email = ""
                if "<" in from_sender:
                    parts = from_sender.split("<")
                    sender_name = parts[0].strip().replace('"', '')
                    sender_email = parts[1].replace(">", "").strip()
                    
                # Extract body text
                body = ""
                parts = payload.get("parts", [])
                
                def get_text_part(parts_list):
                    html_content = ""
                    text_content = ""
                    for p in parts_list:
                        mime = p.get("mimeType", "")
                        data_b64 = p.get("body", {}).get("data", "")
                        if data_b64:
                            data_b64 += "=" * ((4 - len(data_b64) % 4) % 4)
                            try:
                                decoded = base64.urlsafe_b64decode(data_b64).decode('utf-8', errors='ignore')
                            except Exception:
                                decoded = ""
                                
                            if mime == "text/html":
                                html_content = decoded
                            elif mime == "text/plain":
                                text_content = decoded
                        elif "parts" in p:
                            sub_res = get_text_part(p["parts"])
                            if sub_res:
                                if "<html" in sub_res.lower() or "<body" in sub_res.lower() or "<div" in sub_res.lower() or "<br" in sub_res.lower():
                                    return sub_res
                                text_content = sub_res
                    if html_content:
                        return html_content
                    return text_content.replace('\n', '<br>')
                    
                if parts:
                    body = get_text_part(parts)
                else:
                    data_b64 = payload.get("body", {}).get("data", "")
                    if data_b64:
                        data_b64 += "=" * ((4 - len(data_b64) % 4) % 4)
                        try:
                            body = base64.urlsafe_b64decode(data_b64).decode('utf-8', errors='ignore')
                            if payload.get("mimeType") == "text/plain":
                                body = body.replace('\n', '<br>')
                        except Exception:
                            body = ""
                        
                import re
                body_clean = body.strip()
                text_only = re.sub(r'<[^>]+>', ' ', body_clean).replace('&nbsp;', ' ').strip()
                text_only = re.sub(r'\s+', ' ', text_only)
                preview = text_only[:120] + "..." if len(text_only) > 120 else text_only
                
                email_list.append({
                    "id": idx + 1,
                    "name": sender_name or sender_email or "External Sender",
                    "company": sender_email.split("@")[-1].split(".")[0].title() if sender_email else "External",
                    "subject": subject,
                    "preview": preview or msg_data.get("snippet", "") or "(Empty body)",
                    "body": body_clean or msg_data.get("snippet", "") or "(No text content)",
                    "time": date_str,
                    "unread": "UNREAD" in msg_data.get("labelIds", []),
                    "channel": "email"
                })
            except Exception as parse_err:
                logger.error(f"Error parsing Gmail API message {msg_id}: {parse_err}")
                continue
                
        return email_list
