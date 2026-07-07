import time
from huggingface_hub import InferenceClient
from config import settings

def generate_campaign_image(prompt: str, output_path: str = "poster.png"):
    """
    Generates a REAL, high-quality AI image using Hugging Face's FLUX.1-schnell model.
    Uses the official huggingface_hub InferenceClient for reliable connectivity.
    """
    if not settings.HF_TOKEN:
        raise Exception("HF_TOKEN is not configured in the environment variables.")

    client = InferenceClient(token=settings.HF_TOKEN)

    max_retries = 5
    for attempt in range(max_retries):
        try:
            # Generate image using FLUX.1-schnell via the official HF client
            image = client.text_to_image(
                prompt=prompt,
                model="black-forest-labs/FLUX.1-schnell",
            )

            # The client returns a PIL Image object — save it directly
            image.save(output_path)
            print(f"Image saved successfully to {output_path}")
            return output_path

        except Exception as e:
            error_msg = str(e)
            # Handle model loading / rate limits with automatic retry
            if "loading" in error_msg.lower() or "503" in error_msg:
                wait_time = 20 * (attempt + 1)
                print(f"Model is loading. Waiting {wait_time}s before retry {attempt + 1}/{max_retries}...")
                time.sleep(wait_time)
                continue

            if attempt == max_retries - 1:
                raise Exception(f"Failed to generate image from Hugging Face: {error_msg}")
            time.sleep(3)

    return output_path
