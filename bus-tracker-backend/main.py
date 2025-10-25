import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from typing import Dict, Any

from utils import stream_chat
from prompts import build_messages

load_dotenv()

app = FastAPI(title="OSU Bus Route AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"ok": True}

@app.post("/chat")
async def chat(payload: Dict[str, Any]):
    message = (payload.get("message") or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    temperature = float(payload.get("temperature", 0.7))
    context = payload.get("context") or []

    msgs = build_messages(message, context)

    async def sse():
        async for chunk in stream_chat(msgs, temperature=temperature):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(sse(), media_type="text/event-stream")