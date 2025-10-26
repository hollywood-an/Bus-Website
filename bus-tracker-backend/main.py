import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from typing import Dict, Any

from utils import stream_chat
from prompts import build_messages

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="OSU Bus Route AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Starting OSU Bus Route AI backend")
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "your-key-here":
        logger.error("❌ OPENAI_API_KEY not set or invalid!")
    else:
        logger.info(f"✅ API key loaded: {api_key[:10]}...{api_key[-4:]}")
    logger.info(f"✅ Model: {os.getenv('OPENAI_MODEL', 'gpt-4o-mini')}")

@app.get("/health")
async def health():
    logger.info("Health check called")
    return {"ok": True}

@app.post("/chat")
async def chat(payload: Dict[str, Any]):
    message = (payload.get("message") or "").strip()
    logger.info(f"📨 Received message: {message[:50]}...")
    
    if not message:
        logger.warning("❌ Empty message received")
        raise HTTPException(status_code=400, detail="message is required")

    temperature = float(payload.get("temperature", 0.7))
    context = payload.get("context") or []
    
    logger.info(f"🔧 Temperature: {temperature}, Context items: {len(context)}")

    try:
        msgs = build_messages(message, context)
        logger.info(f"📝 Built {len(msgs)} messages for OpenAI")
    except Exception as e:
        logger.error(f"❌ Error building messages: {e}")
        raise HTTPException(status_code=500, detail=f"Error building messages: {str(e)}")

    async def sse():
        chunk_count = 0
        try:
            logger.info("🌊 Starting stream...")
            async for chunk in stream_chat(msgs, temperature=temperature):
                chunk_count += 1
                if chunk_count == 1:
                    logger.info(f"✅ First chunk received: {chunk[:50]}...")
                yield f"data: {chunk}\n\n"
            logger.info(f"✅ Stream complete! Sent {chunk_count} chunks")
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"❌ Stream error: {e}")
            yield f"data: {{'error': 'Stream failed: {str(e)}'}}\n\n"
    
    return StreamingResponse(sse(), media_type="text/event-stream")