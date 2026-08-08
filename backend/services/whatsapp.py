import httpx
import logging
from config import settings

logger = logging.getLogger(__name__)

class EvolutionAPIService:
    """Service to interact with the Evolution API."""
    
    def __init__(self):
        self.api_url = settings.EVOLUTION_API_URL
        self.api_key = settings.EVOLUTION_API_KEY
        self.headers = {
            "Content-Type": "application/json",
            "apikey": self.api_key
        }

    async def _make_request(self, method: str, endpoint: str, data: dict = None) -> dict:
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=self.headers,
                    json=data,
                    timeout=settings.REQUEST_TIMEOUT
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error occurred while calling Evolution API: {e.response.text}")
            raise Exception(f"Evolution API HTTP Error: {e.response.status_code}")
        except Exception as e:
            logger.error(f"Error calling Evolution API: {str(e)}")
            raise Exception(f"Evolution API Error: {str(e)}")

    async def start_session(self, session_id: str) -> dict:
        """
        Start a new Evolution API instance and return the QR code.
        """
        try:
            data = {
                "instanceName": session_id,
                "qrcode": True,
                "integration": "WHATSAPP-BAILEYS"
            }
            # First try to create the instance
            try:
                res = await self._make_request("POST", "/instance/create", data)
                if "qrcode" in res and "base64" in res["qrcode"]:
                    return {"qr": res["qrcode"]["base64"]}
            except Exception as e:
                # If instance already exists, it might fail. Fetch connection state instead.
                logger.info(f"Instance creation failed or already exists: {str(e)}. Attempting to fetch connection state.")
            
            # Fallback to connection state
            state = await self.get_connection_status(session_id)
            if state == "CONNECTED":
                return {"qr": None, "state": state}
                
            # Try to delete the old disconnected instance so we can generate a fresh QR
            try:
                await self._make_request("DELETE", f"/instance/logout/{session_id}")
                await self._make_request("DELETE", f"/instance/delete/{session_id}")
            except Exception:
                pass
                
            # Recreate instance for fresh QR
            try:
                res = await self._make_request("POST", "/instance/create", data)
                if "qrcode" in res and "base64" in res["qrcode"]:
                    return {"qr": res["qrcode"]["base64"]}
            except Exception:
                pass
                
            # Fallback to connect if recreate fails
            try:
                res = await self._make_request("GET", f"/instance/connect/{session_id}")
                if isinstance(res, dict):
                    if "base64" in res:
                        return {"qr": res["base64"]}
                    elif "qrcode" in res and "base64" in res["qrcode"]:
                        return {"qr": res["qrcode"]["base64"]}
            except Exception as e:
                logger.error(f"Fallback connect failed: {e}")
                
            return {"qr": None}
        except Exception as e:
            logger.exception("start_session completely crashed!")
            raise e

    async def send_text_message(self, phone_number: str, message: str, session_id: str) -> dict:
        """
        Send a text message via Evolution API.
        Phone number should include country code without '+'.
        """
        data = {
            "number": phone_number,
            "options": {
                "delay": 1200,
                "presence": "composing"
            },
            "textMessage": {
                "text": message
            }
        }
        return await self._make_request("POST", f"/message/sendText/{session_id}", data)

    async def send_image_message(self, phone_number: str, image_url: str, caption: str, session_id: str) -> dict:
        """
        Send an image message via Evolution API.
        """
        data = {
            "number": phone_number,
            "options": {
                "delay": 1200,
                "presence": "composing"
            },
            "mediaMessage": {
                "mediatype": "image",
                "caption": caption,
                "media": image_url
            }
        }
        return await self._make_request("POST", f"/message/sendMedia/{session_id}", data)

    async def get_connection_status(self, session_id: str) -> str:
        """
        Check the connection status of the Evolution API server.
        """
        res = await self._make_request("GET", f"/instance/connectionState/{session_id}")
        state = res.get("instance", {}).get("state", "unknown")
        
        # Map state to expected frontend values
        if state == "open":
            return "CONNECTED"
        elif state == "connecting":
            return "CONNECTING"
        else:
            return "DISCONNECTED"

# Export a singleton instance
openwa_service = EvolutionAPIService()
