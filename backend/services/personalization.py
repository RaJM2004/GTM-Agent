import os
import logging
from groq import AsyncGroq
from config import settings

logger = logging.getLogger(__name__)

async def personalize_email_content(base_content: str, lead: dict, sender_name: str = "Sales Team") -> str:
    """
    Uses Groq LLM to completely personalize a generic email template using the lead's exact details.
    """
    if not settings.GROQ_API_KEY:
        # Fallback to simple string replacement if no API key
        content = base_content
        content = content.replace("[Your Name]", sender_name)
        content = content.replace("Pharma Professional", lead.get("name", "there"))
        return content

    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    
    lead_info = f"""
    Name: {lead.get('name', 'Unknown')}
    Company: {lead.get('company', 'their company')}
    Title: {lead.get('title', 'Professional')}
    Industry: {lead.get('industry', 'their industry')}
    """

    prompt = f"""You are an expert B2B sales copywriter. 
Your task is to take the following generic email template and rewrite the greeting, the personalization elements, and the sign-off to perfectly target the specific lead provided.

Lead Details:
{lead_info}

Sender Name: {sender_name}

Generic Email Template:
{base_content}

Instructions:
1. Replace generic greetings (like "Hi Pharma Professional") with a personalized greeting using the Lead's Name (e.g., "Hi {{Lead Name}}").
2. Subtly weave in the Lead's Company or Industry in the first paragraph if it makes sense, but keep the core message of the template exactly the same.
3. Replace generic sign-offs (like "[Your Name]") with the Sender Name.
4. DO NOT add any placeholders. Output the final, ready-to-send email text.
5. Do NOT add any preamble or markdown formatting. Output ONLY the raw email body text.
"""

    try:
        completion = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1024,
        )
        personalized_text = completion.choices[0].message.content.strip()
        # Remove any surrounding quotes if the model added them
        if personalized_text.startswith('"') and personalized_text.endswith('"'):
            personalized_text = personalized_text[1:-1]
            
        return personalized_text
    except Exception as e:
        logger.error(f"Failed to personalize email with Groq: {e}")
        # Fallback to basic regex/string replace
        content = base_content.replace("[Your Name]", sender_name)
        return content
