import os, time, httpx, logging
from typing import AsyncGenerator

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

logger.info(f"🔑 API Key set: {bool(OPENAI_API_KEY)}")
logger.info(f"🌐 Base URL: {OPENAI_BASE_URL}")
logger.info(f"🤖 Model: {MODEL}")

HEADERS = {
    "Authorization": f"Bearer {OPENAI_API_KEY}",
    "Content-Type": "application/json",
}

async def stream_chat(messages, temperature=0.3) -> AsyncGenerator[str, None]:
    url = f"{OPENAI_BASE_URL}/chat/completions"
    payload = {
        "model": MODEL,
        "temperature": temperature,
        "stream": True,
        "messages": messages,
    }

    logger.info(f"🚀 Calling OpenAI API: {url}")
    logger.info(f"📦 Payload: model={MODEL}, temp={temperature}, messages={len(messages)}")

    backoff = 1.0
    for attempt in range(4):
        try:
            logger.info(f"🔄 Attempt {attempt + 1}/4")
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", url, headers=HEADERS, json=payload) as r:
                    logger.info(f"📡 Response status: {r.status_code}")
                    r.raise_for_status()
                    async for line in r.aiter_lines():
                        if not line or not line.startswith("data:"): 
                            continue
                        if line.strip() == "data: [DONE]":
                            logger.info("✅ Stream complete from OpenAI")
                            break
                        chunk = line.removeprefix("data: ").strip()
                        yield chunk
            return
        except httpx.HTTPStatusError as e:
            logger.error(f"❌ HTTP Error {e.response.status_code}: {e.response.text}")
            time.sleep(backoff)
            backoff *= 2
        except httpx.HTTPError as e:
            logger.error(f"❌ HTTP Error: {e}")
            time.sleep(backoff)
            backoff *= 2
    
    logger.error("❌ All retry attempts failed")
    yield '{"error":"Upstream model unavailable. Try again."}'