import logging
from twilio.rest import Client

logger = logging.getLogger(__name__)

async def send_sms_via_twilio(account_sid: str, auth_token: str, from_number: str, to: str, body: str) -> bool:
    """
    Sends an SMS message using Twilio's API.
    
    :param account_sid: Twilio Account SID
    :param auth_token: Twilio Auth Token
    :param from_number: Twilio From Phone Number
    :param to: Recipient's Phone Number (E.164 format)
    :param body: SMS content
    :return: True if successful, False otherwise
    """
    try:
        # Initialize Twilio Client
        client = Client(account_sid, auth_token)
        
        # Send Message
        message = client.messages.create(
            body=body,
            from_=from_number,
            to=to
        )
        
        logger.info(f"Successfully sent SMS to {to}. Message SID: {message.sid}")
        return True
    except Exception as e:
        logger.error(f"Failed to send SMS to {to}: {e}", exc_info=True)
        return False
