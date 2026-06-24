# backend/routers/webhooks.py
import hashlib
import hmac
import json
import logging
import os
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from models import Build, Investigation, Log, Test
from services.embeddings import embed_build_logs   # ← NEW

logger = logging.getLogger(__name__)
router = APIRouter()

WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "your-webhook-secret-here")


def _verify_signature(payload: bytes, sig_header: str | None) -> bool:
    if not sig_header:
        return False
    try:
        sha_name, signature = sig_header.split("=", 1)
    except ValueError:
        return False
    if sha_name != "sha256":
        return False
    mac = hmac.new(WEBHOOK_SECRET.encode(), payload, hashlib.sha256)
    return hmac.compare_digest(mac.hexdigest(), signature)


def _parse_payload(payload: dict) -> dict | None:
    """
    Accept both real GitHub Actions payloads and our simulated ones.
    Returns a normalised dict or None if we should ignore this event.
    """
    # Simulated payload (has top-level "build_id")
    if "build_id" in payload:
        return payload

    # Real GitHub Actions workflow_run event
    wr = payload.get("workflow_run")
    if not wr:
        return None

    status_map = {"success": "success", "failure": "failure", "in_progress": "in_progress"}
    raw_status = wr.get("conclusion") or wr.get("status", "in_progress")
    status = status_map.get(raw_status, "in_progress")

    repo = payload.get("repository", {}).get("full_name", "unknown/unknown")
    head_commit = wr.get("head_commit") or {}

    return {
        "build_id": f"gh_{wr['id']}",
        "repo": repo,
        "branch": wr.get("head_branch", "main"),
        "commit_sha": wr.get("head_sha", ""),
        "commit_msg": head_commit.get("message", ""),
        "author": (head_commit.get("author") or {}).get("name", "unknown"),
        "status": status,
        "duration_sec": None,
        "triggered_by": "github_actions",
        "logs": [],
        "tests": [],
    }


@router.post("/webhooks/github")
async def github_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_hub_signature_256: str | None = Header(default=None),
):
    body = await request.body()

    # Only verify signature when a real secret is configured
    if WEBHOOK_SECRET and WEBHOOK_SECRET != "your-webhook-secret-here":
        if not _verify_signature(body, x_hub_signature_256):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    data = _parse_payload(payload)
    if data is None:
        return {"status": "ignored", "reason": "not a trackable event"}

    # ── Upsert build ──────────────────────────────────────────────────────────
    build = db.query(Build).filter(Build.build_id == data["build_id"]).first()
    if build is None:
        build = Build(
            build_id=data["build_id"],
            repo=data.get("repo", ""),
            branch=data.get("branch", "main"),
            commit_sha=data.get("commit_sha", ""),
            commit_msg=data.get("commit_msg", ""),
            author=data.get("author", ""),
            status=data.get("status", "in_progress"),
            duration_sec=data.get("duration_sec"),
            triggered_by=data.get("triggered_by", "push"),
        )
        db.add(build)
    else:
        build.status = data.get("status", build.status)
        build.duration_sec = data.get("duration_sec", build.duration_sec)

    db.flush()  # get build.id

    # ── Upsert logs ───────────────────────────────────────────────────────────
    incoming_logs: list[dict] = data.get("logs", [])
    for log_data in incoming_logs:
        existing = (
            db.query(Log)
            .filter(Log.build_id == build.id, Log.step_name == log_data["step_name"])
            .first()
        )
        if existing is None:
            db.add(
                Log(
                    build_id=build.id,
                    step_name=log_data["step_name"],
                    log_text=log_data.get("log_text", ""),
                )
            )

    # ── Upsert tests ──────────────────────────────────────────────────────────
    incoming_tests: list[dict] = data.get("tests", [])
    for test_data in incoming_tests:
        existing = (
            db.query(Test)
            .filter(Build.build_id == build.build_id, Test.test_name == test_data["test_name"])
            .first()
        )
        if existing is None:
            db.add(
                Test(
                    build_id=build.id,
                    test_name=test_data["test_name"],
                    status=test_data.get("status", "passed"),
                    duration_ms=test_data.get("duration_ms"),
                    error_msg=test_data.get("error_msg"),
                )
            )

    db.commit()
    db.refresh(build)

    # ── Queue investigation for failures ─────────────────────────────────────
    if build.status == "failure":
        inv = (
            db.query(Investigation)
            .filter(Investigation.build_id == build.id)
            .first()
        )
        if inv is None:
            db.add(Investigation(build_id=build.id, status="pending"))
            db.commit()

    # ── Embed logs into ChromaDB ──────────────────────────────────────────────
    if incoming_logs and build.status == "failure":
        try:
            # incoming_logs are already raw dicts from the payload — safe to embed
            embed_logs = [
                {"step_name": l.get("step_name", ""), "log_text": l.get("log_text", "")}
                for l in incoming_logs
                if l.get("log_text")  # skip empty
            ]
            if embed_logs:
                n = embed_build_logs(
                    build_id=build.build_id,
                    repo=build.repo,
                    logs=embed_logs,
                    root_cause="UNKNOWN",
                    resolution="",
                )
                logger.info(f"Embedded {n} log chunks for build {build.build_id}")
            else:
                logger.warning(f"No non-empty logs to embed for {build.build_id}")
        except Exception as exc:
            # Log full traceback so it's never silently swallowed again
            logger.exception(f"ChromaDB embed failed for {build.build_id}: {exc}")

    return {
        "status": "ok",
        "build_id": build.build_id,
        "build_status": build.status,
        "logs_saved": len(incoming_logs),
        "tests_saved": len(incoming_tests),
    }