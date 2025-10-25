import os, time, httpx
from typing import AsyncGenerator

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

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

    backoff = 1.0
    for attempt in range(4):
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", url, headers=HEADERS, json=payload) as r:
                    r.raise_for_status()
                    async for line in r.aiter_lines():
                        if not line or not line.startswith("data:"): 
                            continue
                        if line.strip() == "data: [DONE]":
                            break
                        chunk = line.removeprefix("data: ").strip()
                        yield chunk
            return
        except httpx.HTTPError:
            time.sleep(backoff)
            backoff *= 2
    yield '{"error":"Upstream model unavailable. Try again."}'