import base64
import html
import logging
import re
import smtplib
import httpx
from email.message import EmailMessage
from email.utils import make_msgid

logger = logging.getLogger(__name__)


def _prepare_email_content(message: EmailMessage, body: str):
    """
    Sets both clean plain text and rich HTML alternatives on EmailMessage.
    - If body contains HTML tags (<br>, <p>, etc.), plain_text converts them to clean newlines.
    - If body is plain text with \n, html_content converts \n to <br>.
    - Ensures no raw HTML tags (<br>, etc.) are ever shown as literal text to the recipient.
    """
    # 1. Plain text version: convert <br>, <p> to newlines and strip remaining tags
    plain_text = re.sub(r'<br\s*/?>', '\n', body, flags=re.IGNORECASE)
    plain_text = re.sub(r'</p>', '\n\n', plain_text, flags=re.IGNORECASE)
    plain_text = re.sub(r'<[^>]+>', '', plain_text)
    plain_text = html.unescape(plain_text).strip()

    # 2. HTML version: format nicely for modern email clients
    if '<br' in body.lower() or '<p' in body.lower() or '<div' in body.lower():
        clean_html_body = body
    else:
        clean_html_body = body.replace('\r\n', '\n').replace('\n', '<br>')

    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1f2937;">
{clean_html_body}
</body>
</html>"""

    message.set_content(plain_text)
    message.add_alternative(html_content, subtype='html')


async def send_email_via_gmail_api(access_token: str, to: str, subject: str, body: str) -> dict:
    """Send an email using the Gmail REST API with an OAuth access token.
    Sends as multipart/alternative (HTML + Plain Text).
    Returns dict with keys: success (bool), message_id (str or None).
    """
    try:
        message = EmailMessage()
        _prepare_email_content(message, body)
        message['To'] = to
        message['Subject'] = subject

        # Generate a unique Message-ID so we can track replies via In-Reply-To
        msg_id = make_msgid(domain="gtm.app")
        message['Message-ID'] = msg_id

        # Base64url encode the message
        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

        payload = {
            'raw': encoded_message
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
                headers={'Authorization': f'Bearer {access_token}', 'Content-Type': 'application/json'},
                json=payload
            )

            if response.status_code in [200, 201]:
                logger.info(f"Successfully sent email to {to} via Gmail API (Message-ID: {msg_id})")
                return {"success": True, "message_id": msg_id}
            else:
                logger.error(f"Failed to send email via Gmail API: {response.text}")
                return {"success": False, "message_id": None}
    except Exception as e:
        logger.error(f"Exception sending via Gmail API: {e}")
        return {"success": False, "message_id": None}


async def send_email_via_smtp(email: str, password: str, host: str, port: int, to: str, subject: str, body: str) -> dict:
    """Send an email using standard SMTP credentials.
    Sends as multipart/alternative (HTML + Plain Text).
    Returns dict with keys: success (bool), message_id (str or None).
    """
    try:
        message = EmailMessage()
        _prepare_email_content(message, body)
        message['From'] = email
        message['To'] = to
        message['Subject'] = subject

        # Generate a unique Message-ID so we can track replies via In-Reply-To
        msg_id = make_msgid(domain="gtm.app")
        message['Message-ID'] = msg_id

        with smtplib.SMTP(host, port) as server:
            server.starttls()
            server.login(email, password)
            server.send_message(message)

        logger.info(f"Successfully sent email to {to} via SMTP (Message-ID: {msg_id})")
        return {"success": True, "message_id": msg_id}
    except Exception as e:
        logger.error(f"Exception sending via SMTP: {e}")
        return {"success": False, "message_id": None}

