"""
VAPI Voice AI Service — Handles all VAPI API interactions.

This service is an internal implementation detail. Users never see "VAPI" —
they only see "AI Voice Call" campaigns. Behind the scenes we use VAPI to:
  1. Create per-user assistants (so prompts don't collide between users)
  2. Make outbound calls using the user's own Twilio credentials
  3. Monitor call status and retrieve transcripts
  4. Refine raw user prompts into professional voice agent scripts via Groq
"""

import logging
import asyncio
import json
import httpx
from groq import AsyncGroq
from config import settings

logger = logging.getLogger(__name__)

VAPI_BASE_URL = "https://api.vapi.ai"


def _vapi_headers() -> dict:
    """Build VAPI authorization headers."""
    return {
        "Authorization": f"Bearer {settings.VAPI_API_KEY}",
        "Content-Type": "application/json",
    }


# ──────────────────────────────────────────────────────────────
# 1. PROMPT REFINEMENT  (raw user prompt → polished voice script)
# ──────────────────────────────────────────────────────────────

VOICE_PROMPT_REFINER_SYSTEM = """You are an expert AI voice agent prompt engineer.
Your task is to take a user's rough description of what they want their AI calling agent 
to say and convert it into a polished, professional system prompt for a voice AI assistant.

## Rules
1. The output must be a well-structured system prompt that tells the AI voice agent:
   - Who it is (role, company name if mentioned)
   - What its goal is for the call
   - How to greet the person (use their name naturally)
   - Key talking points and value propositions
   - How to handle objections gracefully
   - What the call-to-action is (book a meeting, confirm interest, etc.)
   - When and how to end the call politely
2. The tone must be conversational, warm, and professional — NOT robotic or salesy.
3. Include natural pause points and filler acknowledgments (e.g., "That makes sense", "I understand").
4. Add instructions for the AI to listen and respond to the prospect's questions naturally.
5. Keep the prompt under 800 words.
6. Do NOT include any meta-commentary. Output ONLY the final system prompt text.
"""


async def refine_voice_prompt(
    raw_prompt: str,
    product_name: str = "",
    target_customer: str = "",
    call_to_action: str = "",
) -> str:
    """
    Takes a user's rough prompt and refines it into a professional
    voice agent system prompt via Groq LLM.
    """
    if not settings.GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not configured. Returning raw prompt.")
        return raw_prompt

    client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    user_message = f"""Here is the user's raw description of what they want their AI voice agent to do:

---
{raw_prompt}
---

Additional context:
- Product/Service: {product_name or 'Not specified'}
- Target Customer: {target_customer or 'Not specified'}  
- Desired Call-to-Action: {call_to_action or 'Not specified'}

Please convert this into a polished, professional system prompt for a voice AI assistant."""

    try:
        completion = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": VOICE_PROMPT_REFINER_SYSTEM},
                {"role": "user", "content": user_message},
            ],
            temperature=0.4,
            max_tokens=2048,
        )
        refined = completion.choices[0].message.content.strip()
        logger.info("Successfully refined voice prompt via Groq.")
        return refined
    except Exception as e:
        logger.error(f"Failed to refine voice prompt: {e}")
        return raw_prompt


# ──────────────────────────────────────────────────────────────
# 2. PER-USER ASSISTANT MANAGEMENT
# ──────────────────────────────────────────────────────────────

async def create_or_update_assistant(
    user_id: str,
    system_prompt: str,
    assistant_name: str = "GTM Voice Agent",
    first_message: str = "Hello! Thanks for taking my call.",
    voice_id: str = "jennifer-playht",
) -> str:
    """
    Creates a new VAPI Assistant for this user (or updates existing).
    Returns the assistant_id.
    
    Each user gets their own assistant so that prompts and call state
    never collide between different GTM users.
    """
    from database import db

    existing_assistant_id = None

    # Check if user already has an assistant stored in MongoDB
    if db is not None:
        user_doc = await db.users.find_one({"user_id": user_id})
        if user_doc:
            vapi_data = user_doc.get("integrations", {}).get("vapi_assistant", {})
            existing_assistant_id = vapi_data.get("assistant_id")

    payload = {
        "name": f"{assistant_name} ({user_id[:12]})",
        "model": {
            "provider": "groq",
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt,
                }
            ],
            "temperature": 0.5,
        },
        "voice": {
            "provider": "playht",
            "voiceId": voice_id,
        },
        "firstMessage": first_message,
        "serverUrl": settings.VAPI_WEBHOOK_URL or None,
        "endCallFunctionEnabled": True,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        if existing_assistant_id:
            # Update existing assistant
            logger.info(f"Updating existing VAPI assistant {existing_assistant_id} for user {user_id}")
            response = await client.patch(
                f"{VAPI_BASE_URL}/assistant/{existing_assistant_id}",
                headers=_vapi_headers(),
                json=payload,
            )
            if response.status_code == 200:
                logger.info(f"Successfully updated assistant {existing_assistant_id}")
                return existing_assistant_id
            else:
                logger.warning(
                    f"Failed to update assistant ({response.status_code}): {response.text}. "
                    "Creating a new one."
                )

        # Create new assistant
        logger.info(f"Creating new VAPI assistant for user {user_id}")
        response = await client.post(
            f"{VAPI_BASE_URL}/assistant",
            headers=_vapi_headers(),
            json=payload,
        )
        response.raise_for_status()
        data = response.json()
        assistant_id = data.get("id")
        logger.info(f"Created VAPI assistant {assistant_id} for user {user_id}")

        # Save assistant_id to MongoDB
        if db is not None:
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"integrations.vapi_assistant": {
                    "assistant_id": assistant_id,
                    "name": assistant_name,
                }}},
                upsert=True,
            )

        return assistant_id


# ──────────────────────────────────────────────────────────────
# 3. OUTBOUND CALLING
# ──────────────────────────────────────────────────────────────

async def make_outbound_call(
    assistant_id: str,
    phone: str,
    name: str,
    twilio_account_sid: str,
    twilio_auth_token: str,
    twilio_from_number: str,
) -> tuple[str | None, str]:
    """
    Makes an outbound call via VAPI using the user's own Twilio credentials.
    Returns (call_id, status) or (None, error_message).
    """
    # Ensure E.164 format
    phone = phone.strip()
    if not phone.startswith("+"):
        # Default to India country code
        digits = "".join(c for c in phone if c.isdigit())
        phone = f"+91{digits[-10:]}"

    payload = {
        "assistantId": assistant_id,
        "customer": {
            "number": phone,
            "name": name,
        },
        "type": "outboundPhoneCall",
        "phoneNumber": {
            "twilioPhoneNumber": twilio_from_number,
            "twilioAccountSid": twilio_account_sid,
            "twilioAuthToken": twilio_auth_token,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{VAPI_BASE_URL}/call",
                headers=_vapi_headers(),
                json=payload,
            )
            response.raise_for_status()
            call_data = response.json()
            call_id = call_data.get("id")
            logger.info(f"Call initiated. ID={call_id}, to={phone}")
            return call_id, "queued"
    except httpx.HTTPStatusError as e:
        error_msg = f"VAPI API error: {e.response.status_code} — {e.response.text}"
        logger.error(error_msg)
        return None, error_msg
    except Exception as e:
        error_msg = f"Unexpected error making call: {e}"
        logger.error(error_msg)
        return None, error_msg


# ──────────────────────────────────────────────────────────────
# 4. CALL MONITORING (polling fallback if webhook isn't hit)
# ──────────────────────────────────────────────────────────────

async def poll_call_status(call_id: str, timeout: int = 300, interval: int = 5) -> dict:
    """
    Polls VAPI for the call status until it ends or times out.
    Returns a dict with: status, transcript, recording_url, duration, ended_reason.
    """
    import time

    start = time.time()
    last_status = ""

    async with httpx.AsyncClient(timeout=30) as client:
        while time.time() - start < timeout:
            try:
                response = await client.get(
                    f"{VAPI_BASE_URL}/call/{call_id}",
                    headers=_vapi_headers(),
                )
                response.raise_for_status()
                data = response.json()
                current_status = data.get("status", "")

                if current_status != last_status:
                    logger.info(f"Call {call_id}: status → {current_status}")
                    last_status = current_status

                if current_status in ("ended", "fulfilled"):
                    return {
                        "status": current_status,
                        "transcript": data.get("transcript", ""),
                        "recording_url": data.get("recordingUrl", ""),
                        "duration": data.get("duration"),
                        "ended_reason": data.get("endedReason", ""),
                        "summary": data.get("summary", ""),
                    }
                elif current_status == "failed":
                    return {
                        "status": "failed",
                        "transcript": "",
                        "recording_url": "",
                        "duration": 0,
                        "ended_reason": data.get("endedReason", "unknown"),
                        "summary": "",
                    }
            except Exception as e:
                logger.error(f"Error polling call {call_id}: {e}")

            await asyncio.sleep(interval)

    logger.warning(f"Call {call_id}: polling timeout after {timeout}s")
    return {
        "status": "timeout",
        "transcript": "",
        "recording_url": "",
        "duration": 0,
        "ended_reason": "polling_timeout",
        "summary": "",
    }


# ──────────────────────────────────────────────────────────────
# 5. TRANSCRIPT PROCESSING  (via Groq)
# ──────────────────────────────────────────────────────────────

async def process_call_transcript(transcript: str) -> dict:
    """
    Processes a call transcript via Groq to extract:
      - summary
      - checklist (3-item action list)
      - sms_message (follow-up SMS to send)
      - sentiment (Positive / Negative / Neutral)
    """
    if not transcript or not settings.GROQ_API_KEY:
        return {
            "summary": "",
            "checklist": [],
            "sms_message": "",
            "sentiment": "Neutral",
        }

    client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    prompt = f"""Analyze the following sales/consultation call transcript and provide:

1. **Summary**: A concise summary of the call including key discussion points, 
   prospect's concerns, and outcomes.

2. **Checklist**: A 3-item action checklist based on the call:
   - Immediate follow-up action
   - Short-term next step
   - Long-term opportunity

3. **SMS Message**: A brief, professional follow-up SMS to send to the prospect.
   Keep it under 160 characters if possible. Include a thank-you and next step.

4. **Sentiment**: Classify the prospect's overall sentiment as "Positive", "Negative", or "Neutral".

Transcript:
---
{transcript[:4000]}
---

Respond ONLY with a valid JSON object:
{{
  "summary": "...",
  "checklist": ["item1", "item2", "item3"],
  "sms_message": "...",
  "sentiment": "Positive|Negative|Neutral"
}}"""

    try:
        completion = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert sales analyst. Extract structured insights from call transcripts. Output valid JSON only.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=1024,
            response_format={"type": "json_object"},
        )
        raw = completion.choices[0].message.content.strip()
        data = json.loads(raw)

        # Normalize checklist
        checklist = data.get("checklist", [])
        if isinstance(checklist, str):
            checklist = [item.strip() for item in checklist.split("\n") if item.strip()]
        while len(checklist) < 3:
            checklist.append(f"{len(checklist)+1}. Follow up as needed")

        return {
            "summary": data.get("summary", ""),
            "checklist": checklist[:3],
            "sms_message": data.get("sms_message", ""),
            "sentiment": data.get("sentiment", "Neutral"),
        }
    except Exception as e:
        logger.error(f"Failed to process transcript with Groq: {e}")
        return {
            "summary": f"Transcript analysis failed: {str(e)[:100]}",
            "checklist": [
                "1. Review call recording manually",
                "2. Follow up with prospect",
                "3. Update CRM records",
            ],
            "sms_message": "Thank you for your time on the call. We'll follow up shortly with next steps.",
            "sentiment": "Neutral",
        }
