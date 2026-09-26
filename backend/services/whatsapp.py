import httpx
import logging
from config import settings

logger = logging.getLogger(__name__)

class EvolutionAPIService:
    """Service to interact with the Evolution API."""
    
    @property
    def api_url(self) -> str:
        return settings.EVOLUTION_API_URL.rstrip('/')

    @property
    def api_key(self) -> str:
        return settings.EVOLUTION_API_KEY

    @property
    def headers(self) -> dict:
        return {
            "Content-Type": "application/json",
            "apikey": self.api_key
        }

    async def _make_request(self, method: str, endpoint: str, data: dict = None, timeout: float = 30.0) -> dict:
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=self.headers,
                    json=data,
                    timeout=timeout
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error occurred while calling Evolution API: {e.response.text}")
            raise Exception(f"Evolution API HTTP Error {e.response.status_code}: {e.response.text}")
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
            create_err = None
            # First try to create the instance
            try:
                res = await self._make_request("POST", "/instance/create", data)
                if "qrcode" in res and "base64" in res["qrcode"]:
                    return {"qr": res["qrcode"]["base64"]}
            except Exception as e:
                create_err = str(e)
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
                
            if create_err and "reading 'db'" in create_err:
                raise Exception("Evolution API Database Error: The hosted Evolution API container has DATABASE_ENABLED=true but the PostgreSQL database is unreachable or undefined. In Azure Container Apps environment variables, set DATABASE_ENABLED=false (or provide a valid DATABASE_CONNECTION_URI).")

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
            "text": message,
            "textMessage": {
                "text": message
            },
            "options": {
                "delay": 1200,
                "presence": "composing"
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
        try:
            res = await self._make_request("GET", f"/instance/connectionState/{session_id}")
            state = res.get("instance", {}).get("state", "unknown")
            
            # Map state to expected frontend values
            if state == "open":
                return "CONNECTED"
            elif state == "connecting":
                return "CONNECTING"
            else:
                return "DISCONNECTED"
        except Exception as e:
            logger.warning(f"Could not get connection state for {session_id}: {e}")
            return "DISCONNECTED"

    async def sync_logs_status(self, user_id: str, session_id: str) -> None:
        """
        Polls Evolution API's messages for this session and updates whatsapp_logs
        with real-time WhatsApp delivery ticks (Delivered, Read/Blue Tick, Replied, Seen but Not Replied).
        """
        from database import db
        import datetime
        if db is None:
            return
            
        try:
            # 1. Fetch recent messages for this instance
            messages_res = await self._make_request("POST", f"/chat/findMessages/{session_id}", {}, timeout=10.0)
            if not isinstance(messages_res, list):
                return
                
            msg_status_by_id = {}
            latest_inbound_by_phone = {}
            latest_outbound_by_phone = {}
            
            inbound_list = []

            for m in messages_res:
                key = m.get("key", {})
                msg_id = key.get("id")
                from_me = key.get("fromMe", False)
                jid = key.get("remoteJid", "")
                phone = jid.split("@")[0] if jid else ""
                raw_status = m.get("status")
                
                # Extract timestamp
                ts_raw = m.get("messageTimestamp", 0)
                if isinstance(ts_raw, dict):
                    ts = ts_raw.get("low", 0)
                elif isinstance(ts_raw, (int, float)):
                    ts = int(ts_raw)
                else:
                    ts = 0
                    
                if msg_id:
                    msg_status_by_id[msg_id] = {
                        "status": raw_status,
                        "timestamp": ts,
                        "phone": phone
                    }
                    
                if from_me:
                    if phone:
                        if phone not in latest_outbound_by_phone or ts > latest_outbound_by_phone[phone]["timestamp"]:
                            latest_outbound_by_phone[phone] = {
                                "status": raw_status,
                                "timestamp": ts,
                                "id": msg_id
                            }
                else:
                    msg_obj = m.get("message", {})
                    text = msg_obj.get("conversation") or msg_obj.get("extendedTextMessage", {}).get("text") or ""
                    inbound_list.append({
                        "phone": phone,
                        "jid": jid,
                        "pushName": m.get("pushName", ""),
                        "text": text,
                        "timestamp": ts
                    })

            # 2. Update logs in database
            logs_cursor = db.whatsapp_logs.find({"user_id": user_id})
            logs = await logs_cursor.to_list(length=200)
            
            for log in logs:
                curr_status = log.get("status")
                msg_id = log.get("message_id")
                phone = log.get("phone_number", "")
                lead_name = (log.get("lead_name") or "").strip().lower()
                stored_lid = log.get("lid")
                
                matched_msg = msg_status_by_id.get(msg_id) if msg_id else None
                if not matched_msg and phone in latest_outbound_by_phone:
                    matched_msg = latest_outbound_by_phone[phone]
                    
                raw_status = matched_msg.get("status") if matched_msg else None
                out_ts = matched_msg.get("timestamp", 0) if matched_msg else 0
                
                # Find matching inbound reply by Phone, LID, or PushName
                matched_reply = None
                for in_msg in inbound_list:
                    in_phone = in_msg["phone"]
                    in_push = in_msg["pushName"].lower()
                    in_jid = in_msg["jid"]
                    in_ts = in_msg["timestamp"]

                    is_match = False
                    if in_phone and in_phone == phone:
                        is_match = True
                    elif stored_lid and in_jid == stored_lid:
                        is_match = True
                    elif lead_name and len(lead_name) >= 3 and (lead_name in in_push or in_push in lead_name):
                        is_match = True

                    if is_match and (out_ts == 0 or in_ts >= (out_ts - 60)):
                        if not matched_reply or in_ts > matched_reply["timestamp"]:
                            matched_reply = in_msg

                new_status = curr_status
                update_fields = {}
                read_at = log.get("read_at")
                delivered_at = log.get("delivered_at")

                if matched_reply:
                    new_status = "Replied"
                    update_fields["reply_message"] = matched_reply.get("text", "")
                    update_fields["reply_push_name"] = matched_reply.get("pushName", "")
                    update_fields["lid"] = matched_reply.get("jid")
                    if matched_reply.get("timestamp"):
                        update_fields["replied_at"] = datetime.datetime.utcfromtimestamp(matched_reply["timestamp"])
                elif curr_status != "Replied":
                    if raw_status in ("READ", "PLAYED", 4, 5):
                        new_status = "Read"  # Blue tick
                    elif raw_status in ("DELIVERY_ACK", 3):
                        new_status = "Delivered"  # Double grey tick
                    elif raw_status in ("SERVER_ACK", 2, "PENDING", 1):
                        new_status = "Sent"  # Single grey tick
                        
                if new_status and (new_status != curr_status or update_fields):
                    update_fields["status"] = new_status
                    if raw_status:
                        update_fields["raw_status"] = str(raw_status)
                    update_fields["updated_at"] = datetime.datetime.utcnow()
                    
                    if new_status in ("Read", "Replied") and not read_at:
                        update_fields["read_at"] = datetime.datetime.utcnow()
                    if new_status in ("Delivered", "Read", "Replied") and not delivered_at:
                        update_fields["delivered_at"] = datetime.datetime.utcnow()
                    if matched_msg and matched_msg.get("id") and not msg_id:
                        update_fields["message_id"] = matched_msg.get("id")
                        
                    await db.whatsapp_logs.update_one(
                        {"_id": log["_id"]},
                        {"$set": update_fields}
                    )
        except Exception as e:
            logger.warning(f"Failed to sync whatsapp logs status for {session_id}: {e}")

# Export a singleton instance
openwa_service = EvolutionAPIService()
