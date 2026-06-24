# backend/routers/chat.py
import json
import logging
import os
from typing import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Build, Investigation, Log, Test

logger = logging.getLogger(__name__)
router = APIRouter()


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    build_id: str
    messages: list[ChatMessage]


def _get_llm_streaming() -> ChatOpenAI:
    return ChatOpenAI(
        model=os.getenv("OPENAI_MODEL", "llama-3.3-70b-versatile"),
        base_url=os.getenv("OPENAI_BASE_URL", "https://api.groq.com/openai/v1"),
        api_key=os.getenv("OPENAI_API_KEY"),
        temperature=0.2,
        streaming=True,
    )


def _build_context(build_id: str, db: Session) -> str:
    """Build a context string summarising the build for the chat system prompt."""
    build = db.query(Build).filter(Build.build_id == build_id).first()
    if not build:
        return f"Build {build_id} not found."

    logs = db.query(Log).filter(Log.build_id == build.id).all()
    tests = db.query(Test).filter(Test.build_id == build.id).all()
    inv = db.query(Investigation).filter(Investigation.build_id == build.id).first()

    failed_tests = [
        t for t in tests
        if (t.status.value if hasattr(t.status, "value") else t.status) == "failed"
    ]

    ctx = f"""## Build Context
- Build ID: {build.build_id}
- Repo: {build.repo}
- Branch: {build.branch}
- Commit: {build.commit_sha[:7]} — {build.commit_msg}
- Author: {build.author}
- Status: {build.status.value if hasattr(build.status, "value") else build.status}
- Duration: {build.duration_sec}s

## Log Steps
"""
    for log in logs:
        ctx += f"### {log.step_name}\n{log.log_text[:500]}\n\n"

    if failed_tests:
        ctx += "## Failed Tests\n"
        for t in failed_tests:
            ctx += f"- {t.test_name}: {t.error_msg or 'no error message'}\n"

    if inv and inv.status in ("complete",):
        ctx += f"""
## Prior Investigation Result
- Root Cause: {inv.root_cause}
- Confidence: {inv.confidence}
- Summary: {inv.summary}
- Proposed Fix: {(inv.proposed_fix or '')[:500]}
"""
    return ctx


CHAT_SYSTEM_PROMPT = """You are an expert CI/CD engineer helping a developer debug a failing build.
You have full context about the build including logs, test results, and any prior investigation.
Be concise, specific, and actionable. Use markdown formatting.
When suggesting fixes, provide actual commands or code snippets.
If you don't know something, say so — don't guess."""


async def _stream_chat(messages: list, llm: ChatOpenAI) -> AsyncIterator[str]:
    async for chunk in llm.astream(messages):
        if chunk.content:
            yield f"data: {json.dumps({'content': chunk.content})}\n\n"
    yield "data: [DONE]\n\n"


@router.post("/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """Streaming chat endpoint with build context pre-seeded."""
    build = db.query(Build).filter(Build.build_id == request.build_id).first()
    if not build:
        raise HTTPException(status_code=404, detail=f"Build {request.build_id} not found")

    context = _build_context(request.build_id, db)

    system_content = f"{CHAT_SYSTEM_PROMPT}\n\n{context}"

    lc_messages = [SystemMessage(content=system_content)]
    for msg in request.messages:
        if msg.role == "user":
            lc_messages.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            lc_messages.append(AIMessage(content=msg.content))

    llm = _get_llm_streaming()

    return StreamingResponse(
        _stream_chat(lc_messages, llm),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/chat/builds")
def list_builds_for_chat(db: Session = Depends(get_db)):
    """Return recent builds for the chat sidebar."""
    builds = (
        db.query(Build)
        .order_by(Build.created_at.desc())
        .limit(30)
        .all()
    )
    return [
        {
            "build_id": b.build_id,
            "repo": b.repo,
            "branch": b.branch,
            "status": b.status.value if hasattr(b.status, "value") else b.status,
            "created_at": str(b.created_at),
        }
        for b in builds
    ]