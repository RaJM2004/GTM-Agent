import os
import re
import logging
from openai import AsyncOpenAI
from config import settings

logger = logging.getLogger(__name__)

async def personalize_email_content(
    base_content: str, 
    lead: dict, 
    sender_name: str = "",
    sender_company: str = "",
    sender_title: str = "",
    sender_contact: str = ""
) -> str:
    """
    Personalizes an email template using OpenAI/Groq with lead specifics and dynamic sender profile.
    Guarantees no raw HTML tags (<br>) or unresolved placeholders ({their industry}, [Your Position], etc.) leak into the final output.
    """
    lead_name = lead.get('name') or "there"
    lead_company = lead.get('company') or "your company"
    lead_industry = lead.get('industry') or ""

    if not settings.OPENAI_API_KEY:
        # Fallback to string replacement
        content = base_content
        if sender_name:
            content = content.replace("[Your Name]", sender_name).replace("{Your Name}", sender_name)
        content = content.replace("[Name]", lead_name).replace("{Name}", lead_name)
        content = content.replace("{their industry}", lead_industry or "your industry")
        content = content.replace("[Your Position]", sender_title)
        content = content.replace("[Your Contact Information]", sender_contact)
        content = re.sub(r'<br\s*/?>', '\n', content, flags=re.IGNORECASE)
        # Strip remaining bracketed placeholders
        content = re.sub(r'\[[a-zA-Z\s_-]+\]', '', content)
        content = re.sub(r'\{[a-zA-Z\s_-]+\}', '', content)
        return content.strip()

    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    lead_info = f"""
    Name: {lead_name}
    Company: {lead_company}
    Title: {lead.get('title') or 'Professional'}
    Industry: {lead_industry if lead_industry else 'Unspecified (use natural phrasing like "your industry" or "your space")'}
    """

    sender_lines = []
    if sender_name:
        sender_lines.append(f"Sender Name: {sender_name}")
    if sender_title:
        sender_lines.append(f"Sender Title: {sender_title}")
    if sender_company:
        sender_lines.append(f"Sender Company: {sender_company}")
    if sender_contact:
        sender_lines.append(f"Sender Contact: {sender_contact}")

    sender_info = "\n    ".join(sender_lines) if sender_lines else "Sender Details: Use the sender name from the template if present."

    signoff_elements = [item for item in [sender_name, sender_title, sender_company, sender_contact] if item]
    signoff_guide = "\n   ".join(["Best,"] + signoff_elements) if signoff_elements else "Best,\n   [Sender Name]"

    prompt = f"""You are an expert B2B sales copywriter. 
Your task is to take the following email template and personalize it for the specific lead provided.

Lead Details:
{lead_info}

Sender Profile:
    {sender_info}

Email Template:
{base_content}

Strict Instructions:
1. Greet the recipient personally by their First Name (e.g., "Hi {lead_name.split()[0]},").
2. DO NOT use raw HTML tags such as <br>, <br/>, or <p>. Use standard line breaks (\\n\\n) for paragraphs.
3. NEVER leave placeholders with curly braces or brackets like {{their industry}}, [Your Position], [Your Contact Information], or [Name] in the text.
4. If the lead's industry is not specified, refer to it naturally (e.g., "in your sector" or "in your industry") without any brackets.
5. Format the sign-off cleanly on separate lines:
   {signoff_guide}
6. Output ONLY the clean, final email text ready to send. No intro, no markdown code fences, no quotes.
"""

    try:
        completion = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1024,
        )
        personalized_text = completion.choices[0].message.content.strip()

        # Remove surrounding quotes if added
        if personalized_text.startswith('"') and personalized_text.endswith('"'):
            personalized_text = personalized_text[1:-1]

    except Exception as e:
        logger.error(f"Failed to personalize email with OpenAI: {e}")
        personalized_text = base_content
        if sender_name:
            personalized_text = personalized_text.replace("[Your Name]", sender_name).replace("{Your Name}", sender_name)

    # Post-processing cleanup: sanitize any leaked placeholders or raw <br> tags
    personalized_text = re.sub(r'<br\s*/?>', '\n', personalized_text, flags=re.IGNORECASE)
    personalized_text = re.sub(r'\{their industry\}|\[their industry\]|\{industry\}|\[industry\]', lead_industry or 'your industry', personalized_text, flags=re.IGNORECASE)
    personalized_text = re.sub(r'\{their company\}|\[their company\]|\{company\}|\[company\]', lead_company, personalized_text, flags=re.IGNORECASE)
    personalized_text = re.sub(r'\{name\}|\[name\]|\{lead name\}|\[lead name\]', lead_name, personalized_text, flags=re.IGNORECASE)
    
    # Replace or strip signature placeholders dynamically
    if sender_title:
        personalized_text = re.sub(r'\[your position\]|\[position\]|\[your title\]|\[title\]|\{your position\}|\{position\}', sender_title, personalized_text, flags=re.IGNORECASE)
    else:
        personalized_text = re.sub(r'\[your position\]|\[position\]|\[your title\]|\[title\]|\{your position\}|\{position\}', '', personalized_text, flags=re.IGNORECASE)

    if sender_contact:
        personalized_text = re.sub(r'\[your contact information\]|\[contact information\]|\[your phone\]|\[phone\]|\{contact information\}', sender_contact, personalized_text, flags=re.IGNORECASE)
    else:
        personalized_text = re.sub(r'\[your contact information\]|\[contact information\]|\[your phone\]|\[phone\]|\{contact information\}', '', personalized_text, flags=re.IGNORECASE)

    if sender_company:
        personalized_text = re.sub(r'\[your company\]|\[company name\]|\{your company\}', sender_company, personalized_text, flags=re.IGNORECASE)
    else:
        personalized_text = re.sub(r'\[your company\]|\[company name\]|\{your company\}', '', personalized_text, flags=re.IGNORECASE)

    # Strip any remaining bracketed placeholders like [anything] or {anything}
    personalized_text = re.sub(r'\[[a-zA-Z\s_-]+\]', '', personalized_text)
    personalized_text = re.sub(r'\{[a-zA-Z\s_-]+\}', '', personalized_text)

    # Collapse multiple consecutive blank lines
    personalized_text = re.sub(r'\n{3,}', '\n\n', personalized_text)

    return personalized_text.strip()

