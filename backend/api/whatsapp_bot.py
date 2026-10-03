import asyncio
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

from services.auth import get_current_user
from services.whatsapp import openwa_service
import database
from database import save_whatsapp_record

class DatabaseProxy:
    def __getattr__(self, item):
        live_db = database.db
        if live_db is None:
            raise RuntimeError("MongoDB is not connected yet.")
        return getattr(live_db, item)

db = DatabaseProxy()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/whatsapp-bot", tags=["whatsapp-bot"])

# ── Pydantic Models ──────────────────────────────────────────────────────────

class WelcomeStepModel(BaseModel):
    message: str = Field(
        default="👋 Hello! Thanks for connecting with us.\n\nWe specialize in high-impact AI growth and lead generation tools to accelerate your pipeline.\n\nWould you like to see a quick 2-minute walkthrough? Reply *YES* or *NO*.",
        description="Initial greeting message sent when user triggers the bot"
    )
    image_url: Optional[str] = Field(
        default="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1000&q=80",
        description="Optional image attachment sent with greeting"
    )
    audio_url: Optional[str] = Field(
        default="",
        description="Optional audio / voice note URL sent with greeting"
    )

class YesBranchModel(BaseModel):
    keywords: List[str] = Field(
        default=["yes", "y", "sure", "interested", "1", "yeah", "ok", "okay", "yup", "demo", "send"],
        description="Keywords indicating affirmative response"
    )
    message: str = Field(
        default="🚀 Fantastic! Here is our quick overview breakdown.\n\nOur platform automates cold email outreach, WhatsApp workflows, and autonomous voice agents in one place.",
        description="Follow-up pitch message when customer replies Yes"
    )
    image_url: Optional[str] = Field(
        default="",
        description="Optional follow-up presentation / diagram"
    )
    audio_url: Optional[str] = Field(
        default="",
        description="Optional follow-up voice note / walkthrough"
    )

class NoBranchModel(BaseModel):
    keywords: List[str] = Field(
        default=["no", "n", "not interested", "stop", "2", "nah", "cancel", "later"],
        description="Keywords indicating negative response"
    )
    message: str = Field(
        default="Understood, no worries at all! If your priorities change in the future, feel free to drop a message here anytime. Wishing you great success! ✨",
        description="Polite exit message"
    )

class ThankYouStepModel(BaseModel):
    enabled: bool = Field(default=True, description="Whether to send thank you message after Yes")
    message: str = Field(
        default="🙏 Thank you for your interest! A specialist will also follow up, or you can book an instant priority demo here: https://calendly.com",
        description="Closing thank you message"
    )

class WhatsAppBotConfigModel(BaseModel):
    is_enabled: bool = Field(default=True, description="Whether the WhatsApp Bot is active")
    bot_name: str = Field(default="GTM Inbound Auto-Responder", description="Friendly name for the bot")
    trigger_keywords: List[str] = Field(
        default=["hi", "hello", "hey", "start", "info", "help", "hlo", "helo", "good morning", "good evening"],
        description="Keywords that trigger the initial greeting"
    )
    catch_all_initial: bool = Field(
        default=True,
        description="If True, any initial incoming message from an unknown or reset contact triggers the bot"
    )
    welcome_step: WelcomeStepModel = Field(default_factory=WelcomeStepModel)
    yes_branch: YesBranchModel = Field(default_factory=YesBranchModel)
    no_branch: NoBranchModel = Field(default_factory=NoBranchModel)
    thank_you_step: ThankYouStepModel = Field(default_factory=ThankYouStepModel)
    fallback_message: str = Field(
        default="Sorry, I didn't quite catch that! Please reply with *YES* to see the overview or *NO* to decline.",
        description="Sent when contact replies with something other than Yes/No during awaiting step"
    )

class ToggleBotRequest(BaseModel):
    is_enabled: bool

class ResetSessionRequest(BaseModel):
    phone_number: str

class SimulateMessageRequest(BaseModel):
    message: str
    current_step: Optional[str] = "NEW"  # NEW, WAITING_YES_NO, COMPLETED_YES, COMPLETED_NO

class TemplateButtonModel(BaseModel):
    type: str = Field(default="QUICK_REPLY", description="QUICK_REPLY, URL, or PHONE_NUMBER")
    text: str = Field(default="", description="Button label text")
    url: Optional[str] = Field(default="", description="URL for Call to Action")
    phone_number: Optional[str] = Field(default="", description="Phone number for Call to Action")

class TemplateHeaderModel(BaseModel):
    type: str = Field(default="NONE", description="NONE, TEXT, IMAGE, VIDEO, or DOCUMENT")
    text: Optional[str] = Field(default="", description="Header text if type is TEXT")
    media_url: Optional[str] = Field(default="", description="URL of media preview if type is IMAGE/VIDEO/DOCUMENT")

class WhatsAppTemplateModel(BaseModel):
    name: str = Field(..., description="Template name (snake_case/lowercase alphanumeric)")
    language: str = Field(default="English", description="Template language")
    language_code: str = Field(default="en_US", description="Language code")
    category: str = Field(default="MARKETING", description="MARKETING, UTILITY, or AUTHENTICATION")
    header: TemplateHeaderModel = Field(default_factory=TemplateHeaderModel)
    body: str = Field(..., description="Message body with optional {{1}}, {{2}} variables")
    variables: Dict[str, str] = Field(default_factory=dict, description="Example variable values: {'1': 'John', '2': 'Acme'}")
    footer: Optional[str] = Field(default="", description="Short footer text")
    buttons: List[TemplateButtonModel] = Field(default_factory=list, description="Interactive action buttons")
    trigger_keywords: List[str] = Field(default_factory=list, description="Keywords that trigger this specific bot/template on the WhatsApp number")
    is_active: bool = Field(default=True, description="Whether this template bot is active")
    follow_up_yes: Optional[str] = Field(default="", description="Optional response if customer replies affirmatively")
    follow_up_no: Optional[str] = Field(default="", description="Optional response if customer replies negatively")
    status: str = Field(default="APPROVED", description="APPROVED, PENDING, or DRAFT")

async def get_or_default_bot_config(user_id: str) -> dict:
    """Fetch user's bot config from DB, deep-merged with complete defaults so no keys are ever missing."""
    default_config = WhatsAppBotConfigModel().model_dump()
    default_config["user_id"] = user_id
    if database.db is None:
        return default_config
    existing = await db.whatsapp_bot_configs.find_one({"user_id": user_id}, {"_id": 0})
    if not existing:
        return default_config
    # Deep merge existing config into default_config so no nested fields or lists are ever missing
    for k, v in existing.items():
        if isinstance(v, dict) and isinstance(default_config.get(k), dict):
            default_config[k].update(v)
        elif v is not None:
            default_config[k] = v
    return default_config

# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/config")
async def get_bot_config(current_user: dict = Depends(get_current_user)):
    """Fetch current WhatsApp bot configuration for the authenticated user."""
    user_id = current_user.get("user_id", "unknown")
    config = await get_or_default_bot_config(user_id)
    
    # Check current WhatsApp connection status
    session_id = f"user_{user_id}"
    wa_status = "DISCONNECTED"
    try:
        wa_status = await openwa_service.get_connection_status(session_id)
    except Exception:
        pass
        
    return {
        "status": "success",
        "config": config,
        "whatsapp_connected": (wa_status == "CONNECTED"),
        "whatsapp_status": wa_status,
        "session_id": session_id
    }

@router.post("/config")
async def save_bot_config(
    config_data: WhatsAppBotConfigModel,
    current_user: dict = Depends(get_current_user)
):
    """Save or update WhatsApp bot configuration."""
    user_id = current_user.get("user_id", "unknown")
    doc = config_data.model_dump()
    doc["user_id"] = user_id
    doc["updated_at"] = datetime.utcnow()

    if database.db is not None:
        await db.whatsapp_bot_configs.update_one(
            {"user_id": user_id},
            {"$set": doc},
            upsert=True
        )

    return {"status": "success", "message": "WhatsApp Bot settings saved successfully!", "config": doc}

@router.post("/toggle")
async def toggle_bot(
    payload: ToggleBotRequest,
    current_user: dict = Depends(get_current_user)
):
    """Toggle WhatsApp bot enabled/disabled."""
    user_id = current_user.get("user_id", "unknown")
    
    if database.db is not None:
        full_config = await get_or_default_bot_config(user_id)
        full_config["is_enabled"] = payload.is_enabled
        full_config["updated_at"] = datetime.utcnow()
        await db.whatsapp_bot_configs.update_one(
            {"user_id": user_id},
            {"$set": full_config},
            upsert=True
        )
        
    status_label = "active" if payload.is_enabled else "paused"
    return {"status": "success", "is_enabled": payload.is_enabled, "message": f"WhatsApp Bot is now {status_label}."}

@router.get("/sessions")
async def get_bot_sessions(current_user: dict = Depends(get_current_user)):
    """Retrieve all conversations handled by the WhatsApp bot for this user."""
    user_id = current_user.get("user_id", "unknown")
    sessions = []
    
    if database.db is not None:
        cursor = db.whatsapp_bot_sessions.find({"user_id": user_id}).sort("updated_at", -1).limit(100)
        async for s in cursor:
            s["id"] = str(s.pop("_id", ""))
            if "updated_at" in s and isinstance(s["updated_at"], datetime):
                s["updated_at"] = s["updated_at"].isoformat()
            if "created_at" in s and isinstance(s["created_at"], datetime):
                s["created_at"] = s["created_at"].isoformat()
            sessions.append(s)
            
    return {"status": "success", "sessions": sessions}

@router.post("/reset-session")
async def reset_bot_session(
    payload: ResetSessionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Reset a contact's bot session so testing can start again from 'Hi'."""
    user_id = current_user.get("user_id", "unknown")
    phone = payload.phone_number.strip().replace("+", "")
    
    if database.db is not None:
        await db.whatsapp_bot_sessions.delete_one({"user_id": user_id, "phone_number": phone})
        
    return {"status": "success", "message": f"Session for {phone} has been reset. You can send 'Hi' to start over!"}

# ── Message Template Endpoints ───────────────────────────────────────────────

@router.get("/templates")
async def get_whatsapp_templates(current_user: dict = Depends(get_current_user)):
    """Fetch all saved WhatsApp message templates for the authenticated user."""
    user_id = current_user.get("user_id", "unknown")
    templates = []
    if database.db is not None:
        cursor = db.whatsapp_templates.find({"user_id": user_id}).sort("updated_at", -1)
        async for t in cursor:
            t["id"] = str(t.pop("_id", ""))
            if "updated_at" in t and isinstance(t["updated_at"], datetime):
                t["updated_at"] = t["updated_at"].isoformat()
            if "created_at" in t and isinstance(t["created_at"], datetime):
                t["created_at"] = t["created_at"].isoformat()
            templates.append(t)
    return {"status": "success", "templates": templates}

@router.post("/templates")
async def save_whatsapp_template(
    template_data: WhatsAppTemplateModel,
    current_user: dict = Depends(get_current_user)
):
    """Create or update a WhatsApp message template."""
    user_id = current_user.get("user_id", "unknown")
    doc = template_data.model_dump()
    doc["user_id"] = user_id
    doc["updated_at"] = datetime.utcnow()
    
    if database.db is not None:
        # Check if template with this name already exists for user
        existing = await db.whatsapp_templates.find_one({"user_id": user_id, "name": doc["name"]})
        if existing:
            await db.whatsapp_templates.update_one(
                {"_id": existing["_id"]},
                {"$set": doc}
            )
            doc["id"] = str(existing["_id"])
        else:
            doc["created_at"] = datetime.utcnow()
            res = await db.whatsapp_templates.insert_one(doc)
            doc["id"] = str(res.inserted_id)
            if "_id" in doc:
                del doc["_id"]
                
    return {"status": "success", "message": "Template saved successfully!", "template": doc}

@router.delete("/templates/{template_id}")
async def delete_whatsapp_template(
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a WhatsApp message template."""
    user_id = current_user.get("user_id", "unknown")
    from bson import ObjectId
    if database.db is not None:
        try:
            await db.whatsapp_templates.delete_one({"_id": ObjectId(template_id), "user_id": user_id})
        except Exception:
            await db.whatsapp_templates.delete_one({"name": template_id, "user_id": user_id})
    return {"status": "success", "message": "Template deleted successfully"}

class SendTemplateByIdRequest(BaseModel):
    template_id: str
    phone_number: str
    custom_variables: Optional[Dict[str, str]] = None

@router.post("/templates/{template_id}/toggle")
async def toggle_whatsapp_template(
    template_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    """Toggle a specific template bot active or paused independently."""
    user_id = current_user.get("user_id", "unknown")
    is_active = payload.get("is_active", True)
    from bson import ObjectId
    if database.db is not None:
        try:
            await db.whatsapp_templates.update_one(
                {"_id": ObjectId(template_id), "user_id": user_id},
                {"$set": {"is_active": is_active, "updated_at": datetime.utcnow()}}
            )
        except Exception:
            await db.whatsapp_templates.update_one(
                {"name": template_id, "user_id": user_id},
                {"$set": {"is_active": is_active, "updated_at": datetime.utcnow()}}
            )
    return {"status": "success", "is_active": is_active, "message": f"Template {'activated' if is_active else 'paused'}."}

async def render_and_send_template_card(
    tmpl: dict,
    clean_phone: str,
    session_id: str,
    lead_name: str = "",
    custom_vars: dict = None
) -> tuple[dict, str]:
    """
    Renders a WhatsApp template into a single cohesive message card:
    - If media (IMAGE, VIDEO, DOCUMENT) is attached, sends ONE media message with the complete
      formatted body + buttons in the caption so the image and text are in the SAME bubble.
    - Formats Quick Reply / CTA buttons cleanly at the base of the card.
    """
    # 1. Variables substitution
    body = tmpl.get("body", "")
    vars_dict = {**(tmpl.get("variables") or {})}
    if custom_vars:
        vars_dict.update(custom_vars)
    if "1" in vars_dict and lead_name and lead_name != "there":
        vars_dict["1"] = lead_name

    for k, v in vars_dict.items():
        body = body.replace(f"{{{{{k}}}}}", str(v))
    if lead_name:
        body = body.replace("{name}", lead_name)

    header = tmpl.get("header") or {}
    header_type = header.get("type", "NONE")
    header_text = (header.get("text") or "").strip()
    media_url = (header.get("media_url") or "").strip()

    card_sections = []

    # If TEXT header, put bold title at the top
    if header_type == "TEXT" and header_text:
        card_sections.append(f"*{header_text}*")

    card_sections.append(body.strip())

    footer = (tmpl.get("footer") or "").strip()
    if footer:
        card_sections.append(f"_{footer}_")

    # Format buttons neatly into the card
    buttons = tmpl.get("buttons") or []
    if buttons:
        btn_lines = []
        for b in buttons:
            b_type = b.get("type", "QUICK_REPLY")
            b_text = (b.get("text") or "").strip()
            if not b_text:
                continue
            if b_type == "QUICK_REPLY":
                btn_lines.append(f"👉 Reply *{b_text}*")
            elif b_type == "URL":
                btn_lines.append(f"🔗 {b_text}: {b.get('url', '')}")
            elif b_type == "PHONE_NUMBER":
                btn_lines.append(f"📞 {b_text}: {b.get('phone_number', '')}")

        if btn_lines:
            card_sections.append("────────────────────\n" + "\n".join(btn_lines))

    full_content = "\n\n".join(card_sections)

    # Dispatch: If media is attached, send ONE single message where caption = full card content
    if header_type in ("IMAGE", "VIDEO", "DOCUMENT") and media_url:
        media_type = header_type.lower()
        send_res = await openwa_service.send_media_message(
            phone_number=clean_phone,
            media_url=media_url,
            caption=full_content,
            session_id=session_id,
            media_type=media_type
        )
    else:
        send_res = await openwa_service.send_text_message(
            phone_number=clean_phone,
            message=full_content,
            session_id=session_id
        )

    return send_res, full_content

@router.post("/templates/send-by-id")
async def send_template_by_id(
    payload: SendTemplateByIdRequest,
    current_user: dict = Depends(get_current_user)
):
    """Dispatch a specific WhatsApp template by its ID or Name directly to any phone number as a single card."""
    user_id = current_user.get("user_id", "unknown")
    session_id = f"user_{user_id}"
    from bson import ObjectId
    import re
    clean_phone = re.sub(r"\D", "", payload.phone_number).lstrip("0")
    if len(clean_phone) == 10 and clean_phone[0] in "6789":
        clean_phone = "91" + clean_phone

    tmpl = None
    if database.db is not None:
        try:
            tmpl = await db.whatsapp_templates.find_one({"_id": ObjectId(payload.template_id), "user_id": user_id})
        except Exception:
            pass
        if not tmpl:
            tmpl = await db.whatsapp_templates.find_one({"name": payload.template_id, "user_id": user_id})

    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")

    send_res, full_content = await render_and_send_template_card(
        tmpl=tmpl,
        clean_phone=clean_phone,
        session_id=session_id,
        lead_name="there",
        custom_vars=payload.custom_variables
    )

    # Save to logs
    await save_whatsapp_record({
        "user_id": user_id,
        "phone_number": clean_phone,
        "message": full_content,
        "status": "Sent",
        "type": f"template_call_{tmpl.get('name')}",
        "template_id": str(tmpl.get("_id", payload.template_id)),
        "created_at": datetime.utcnow()
    })

    # Update session so replies route to this template
    if database.db is not None:
        await db.whatsapp_bot_sessions.update_one(
            {"user_id": user_id, "phone_number": clean_phone},
            {
                "$set": {
                    "active_template_id": str(tmpl.get("_id", payload.template_id)),
                    "active_template_name": tmpl.get("name"),
                    "step": "WAITING_TEMPLATE_REPLY",
                    "last_interaction": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            },
            upsert=True
        )

    return {"status": "success", "message": f"Template '{tmpl.get('name')}' sent successfully!", "result": send_res}

@router.post("/test-simulate")
async def simulate_bot_message(
    payload: SimulateMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Test and simulate the bot logic without sending real WhatsApp messages.
    Returns the bot's response elements (text, image, audio) and next step.
    """
    user_id = current_user.get("user_id", "unknown")
    config = None
    if database.db is not None:
        config = await db.whatsapp_bot_configs.find_one({"user_id": user_id}, {"_id": 0})
    if not config:
        config = WhatsAppBotConfigModel().model_dump()

    user_msg = payload.message.strip().lower()
    curr_step = payload.current_step or "NEW"
    
    trigger_words = [w.lower() for w in config.get("trigger_keywords", [])]
    yes_words = [w.lower() for w in config.get("yes_branch", {}).get("keywords", [])]
    no_words = [w.lower() for w in config.get("no_branch", {}).get("keywords", [])]

    responses = []
    next_step = curr_step

    # 1. New or Trigger Step
    is_trigger = any(w in user_msg for w in trigger_words) or config.get("catch_all_initial", True)
    if curr_step in ("NEW", "COMPLETED_YES", "COMPLETED_NO"):
        if is_trigger or curr_step == "NEW":
            welcome = config.get("welcome_step", {})
            responses.append({"type": "text", "content": welcome.get("message", "")})
            if welcome.get("image_url"):
                responses.append({"type": "image", "content": welcome.get("image_url")})
            if welcome.get("audio_url"):
                responses.append({"type": "audio", "content": welcome.get("audio_url")})
            next_step = "WAITING_YES_NO"
        else:
            responses.append({"type": "text", "content": config.get("fallback_message")})

    # 2. Waiting for Yes / No
    elif curr_step == "WAITING_YES_NO":
        # Check Yes
        if any(w == user_msg or w in user_msg.split() for w in yes_words):
            yes_b = config.get("yes_branch", {})
            responses.append({"type": "text", "content": yes_b.get("message", "")})
            if yes_b.get("image_url"):
                responses.append({"type": "image", "content": yes_b.get("image_url")})
            if yes_b.get("audio_url"):
                responses.append({"type": "audio", "content": yes_b.get("audio_url")})
            
            # Send thank you if enabled
            thank_you = config.get("thank_you_step", {})
            if thank_you.get("enabled", True) and thank_you.get("message"):
                responses.append({"type": "text", "content": thank_you.get("message")})
            next_step = "COMPLETED_YES"

        # Check No
        elif any(w == user_msg or w in user_msg.split() for w in no_words):
            no_b = config.get("no_branch", {})
            responses.append({"type": "text", "content": no_b.get("message", "")})
            next_step = "COMPLETED_NO"

        # Fallback
        else:
            responses.append({"type": "text", "content": config.get("fallback_message")})
            next_step = "WAITING_YES_NO"

    return {
        "status": "success",
        "responses": responses,
        "next_step": next_step
    }

# ── Core Bot Engine for Inbound Processing ────────────────────────────────────

async def process_incoming_whatsapp_bot(
    user_id: str,
    phone_number: str,
    message_text: str,
    lead_name: str = "there"
) -> bool:
    """
    Automated decision tree engine that handles incoming replies on WhatsApp.
    Sends configured text, image, audio, and branch replies.
    """
    if database.db is None:
        return False

    # Check if user has active templates
    has_active_tmpl = await db.whatsapp_templates.find_one({"user_id": user_id, "is_active": {"$ne": False}})
    config = await get_or_default_bot_config(user_id)

    if not config.get("is_enabled", True) and not has_active_tmpl:
        logger.info(f"WhatsApp Bot for user {user_id} is disabled and has no active templates.")
        return False

    import re
    clean_phone = re.sub(r"\D", "", str(phone_number or "")).lstrip("0")
    if len(clean_phone) == 10 and clean_phone[0] in "6789":
        clean_phone = "91" + clean_phone
    elif len(clean_phone) > 13:
        # 1. Check cached LID mapping
        cached = await db.whatsapp_lid_mappings.find_one({"$or": [{"lid": {"$regex": clean_phone}}, {"phone": clean_phone}]})
        if cached and cached.get("phone") and len(cached["phone"]) <= 13:
            clean_phone = re.sub(r"\D", "", cached["phone"]).lstrip("0")
            if len(clean_phone) == 10 and clean_phone[0] in "6789":
                clean_phone = "91" + clean_phone
        else:
            # 2. Try resolving LID from logs or leads
            log_match = await db.whatsapp_logs.find_one({
                "$or": [
                    {"lid": {"$regex": clean_phone}},
                    {"reply_push_name": lead_name} if lead_name != "there" else {"lid": clean_phone}
                ]
            })
            if log_match and log_match.get("phone_number"):
                clean_phone = re.sub(r"\D", "", log_match["phone_number"]).lstrip("0")
                if len(clean_phone) == 10 and clean_phone[0] in "6789":
                    clean_phone = "91" + clean_phone
            else:
                logger.warning(f"Could not resolve LID {clean_phone} ({lead_name}) to a valid mobile number.")
                return False

    session_id = f"user_{user_id}"
    user_msg = (message_text or "").strip().lower()

    # Look up existing conversation session
    session = await db.whatsapp_bot_sessions.find_one({
        "user_id": user_id,
        "phone_number": clean_phone
    })

    curr_step = session.get("step", "NEW") if session else "NEW"
    active_tmpl_id = session.get("active_template_id") if session else None

    history_entry = {
        "sender": "lead",
        "message": message_text,
        "timestamp": datetime.utcnow()
    }

    # ── Multi-Bot: Check for Active Template Trigger Match ──
    # Allows multiple bots/templates to run on the SAME WhatsApp number simultaneously!
    matched_template = None
    if database.db is not None:
        templates_cursor = db.whatsapp_templates.find({"user_id": user_id, "is_active": {"$ne": False}})
        async for tmpl in templates_cursor:
            triggers = [k.lower().strip() for k in tmpl.get("trigger_keywords", [])]
            t_name = tmpl.get("name", "").lower().strip()
            # Match if trigger keyword in user_msg, or if lead typed template name or #name
            if any(k and (k in user_msg or k in user_msg.split()) for k in triggers) or \
               user_msg.startswith(f"#{t_name}") or user_msg == t_name:
                matched_template = tmpl
                break

        # If no specific keyword matched, check if greeting or new conversation -> trigger primary active template
        if not matched_template:
            greetings = ["hi", "hello", "hey", "start", "info", "help", "hola", "namaste", "morning", "evening"]
            is_greeting = any(w in user_msg.split() or user_msg == w for w in greetings)
            if is_greeting or curr_step in ("NEW", "COMPLETED_TEMPLATE"):
                matched_template = await db.whatsapp_templates.find_one({
                    "user_id": user_id,
                    "is_active": {"$ne": False}
                })

    if matched_template:
        logger.info(f"Multi-Bot: Dispatched template '{matched_template.get('name')}' for {clean_phone}!")
        send_res, full_message = await render_and_send_template_card(
            tmpl=matched_template,
            clean_phone=clean_phone,
            session_id=session_id,
            lead_name=lead_name or "there"
        )

        await save_whatsapp_record({
            "user_id": user_id,
            "phone_number": clean_phone,
            "lead_name": lead_name,
            "message": full_message,
            "status": "Sent",
            "type": f"template_bot_{matched_template.get('name')}",
            "template_id": str(matched_template.get("_id", "")),
            "created_at": datetime.utcnow()
        })

        await db.whatsapp_bot_sessions.update_one(
            {"user_id": user_id, "phone_number": clean_phone},
            {
                "$set": {
                    "step": "WAITING_TEMPLATE_REPLY",
                    "active_template_id": str(matched_template.get("_id", "")),
                    "active_template_name": matched_template.get("name"),
                    "lead_name": lead_name,
                    "last_interaction": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                },
                "$push": {"history": history_entry}
            },
            upsert=True
        )
        return True

    # ── Multi-Bot: Evaluating Response while WAITING_TEMPLATE_REPLY ──
    if curr_step == "WAITING_TEMPLATE_REPLY" and active_tmpl_id:
        tmpl = None
        from bson import ObjectId
        try:
            tmpl = await db.whatsapp_templates.find_one({"_id": ObjectId(active_tmpl_id)})
        except Exception:
            pass
        if not tmpl:
            tmpl = await db.whatsapp_templates.find_one({"name": active_tmpl_id})

        if tmpl:
            is_yes = any(w == user_msg or w in user_msg.split() for w in ["yes", "y", "sure", "interested", "1", "ok", "okay", "yeah", "demo"])
            is_no = any(w == user_msg or w in user_msg.split() for w in ["no", "n", "stop", "not interested", "2", "nah", "cancel"])

            btn_match = None
            for b in tmpl.get("buttons", []):
                if b.get("text", "").lower().strip() == user_msg:
                    btn_match = b
                    break

            follow_up = None
            outcome = "Responded"
            if is_yes or (btn_match and "yes" in btn_match.get("text", "").lower()):
                follow_up = tmpl.get("follow_up_yes") or "🚀 Fantastic! We have noted your interest and our specialist will connect with you shortly."
                outcome = "Interested"
            elif is_no or (btn_match and "no" in btn_match.get("text", "").lower()):
                follow_up = tmpl.get("follow_up_no") or "Understood, no problem at all! Feel free to message here anytime. Wishing you great success! ✨"
                outcome = "Not Interested"
            elif btn_match:
                follow_up = f"Thank you for choosing *{btn_match.get('text')}*! We are processing your request."
                outcome = btn_match.get("text")

            if follow_up:
                await openwa_service.send_text_message(
                    phone_number=clean_phone,
                    message=follow_up,
                    session_id=session_id
                )
                await save_whatsapp_record({
                    "user_id": user_id,
                    "phone_number": clean_phone,
                    "lead_name": lead_name,
                    "message": follow_up,
                    "status": "Sent",
                    "type": f"template_followup_{tmpl.get('name')}",
                    "created_at": datetime.utcnow()
                })
                await db.whatsapp_bot_sessions.update_one(
                    {"user_id": user_id, "phone_number": clean_phone},
                    {
                        "$set": {
                            "step": "COMPLETED_TEMPLATE",
                            "outcome": outcome,
                            "updated_at": datetime.utcnow()
                        },
                        "$push": {"history": history_entry}
                    }
                )
                # Update lead collection if matched
                await db.leads.update_many(
                    {"user_id": user_id, "phone": {"$regex": clean_phone[-10:]}},
                    {"$set": {"status": outcome, "whatsapp_bot_stage": f"Completed - {outcome}"}}
                )
                return True
            else:
                # Prompt user to choose one of the options
                buttons_hint = [b.get("text") for b in tmpl.get("buttons", []) if b.get("text")]
                hint_str = " or ".join([f"*{h}*" for h in buttons_hint]) if buttons_hint else "*YES* or *NO*"
                prompt_msg = f"Please reply with one of the options: {hint_str}"
                await openwa_service.send_text_message(
                    phone_number=clean_phone,
                    message=prompt_msg,
                    session_id=session_id
                )
                await db.whatsapp_bot_sessions.update_one(
                    {"user_id": user_id, "phone_number": clean_phone},
                    {
                        "$set": {"updated_at": datetime.utcnow()},
                        "$push": {"history": history_entry}
                    }
                )
                return True

    return False
