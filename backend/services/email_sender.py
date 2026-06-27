import base64
import logging
import httpx
from email.message import EmailMessage
import smtplib

logger = logging.getLogger(__name__)

async def send_email_via_gmail_api(access_token: str, to: str, subject: str, body: str) -> bool:
    """Send an email using the Gmail REST API with an OAuth access token."""
    try:
        message = EmailMessage()
        message.set_content(body)
        message['To'] = to
        message['Subject'] = subject
        
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
                logger.info(f"Successfully sent email to {to} via Gmail API")
                return True
            else:
                logger.error(f"Failed to send email via Gmail API: {response.text}")
                return False
    except Exception as e:
        logger.error(f"Exception sending via Gmail API: {e}")
        return False

async def send_email_via_smtp(email: str, password: str, host: str, port: int, to: str, subject: str, body: str) -> bool:
    """Send an email using standard SMTP credentials."""
    try:
        message = EmailMessage()
        message.set_content(body)
        message['From'] = email
        message['To'] = to
        message['Subject'] = subject

        # Use smtplib (blocking call, but usually fast enough for single sends, or could use aiosmtplib)
        with smtplib.SMTP(host, port) as server:
            server.starttls()
            server.login(email, password)
            server.send_message(message)
            
        logger.info(f"Successfully sent email to {to} via SMTP")
        return True
    except Exception as e:
        logger.error(f"Exception sending via SMTP: {e}")
        return False
