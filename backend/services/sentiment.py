import logging
import json
from groq import AsyncGroq
from config import settings

logger = logging.getLogger(__name__)

async def classify_email_sentiment(email_body: str) -> str:
    """
    Classify an email reply as Positive, Negative, or Neutral using Llama 3 via Groq.
    """
    if not settings.GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not configured. Skipping sentiment classification.")
        return "Neutral"
        
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    model = "llama-3.3-70b-versatile"
    
    prompt = f"""You are an expert sales assistant. Analyze the following email reply from a lead and classify their sentiment.
    
Email Reply:
"{email_body[:2000]}"

Classification Guidelines:
- Positive: The lead is interested, wants to schedule a call, asked for more information, or said yes.
- Negative: The lead is explicitly not interested, asked to unsubscribe, told you to stop emailing, or was angry.
- Neutral: The lead is out of office, asking you to reach out later, forwarded the email to someone else, or the intent is completely unclear.

Respond ONLY with a valid JSON object containing a single key "status" with the value "Positive", "Negative", or "Neutral".
Example: {{"status": "Positive"}}
"""

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        
        raw_content = response.choices[0].message.content.strip()
        parsed_json = json.loads(raw_content)
        status = parsed_json.get("status", "Neutral")
        
        if status not in ["Positive", "Negative", "Neutral"]:
            return "Neutral"
            
        return status
    except Exception as e:
        logger.error(f"Failed to classify email sentiment: {e}", exc_info=True)
        return "Neutral"
