from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models import Build, Log, Test, Investigation, BuildStatus, TestStatus, InvestigationStatus
import uuid
import random
from datetime import datetime

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def parse_github_webhook(payload: dict) -> dict:
    """Parse a real GitHub Actions webhook payload."""
    workflow_run = payload.get("workflow_run", {})
    return {
        "build_id": str(workflow_run.get("id", uuid.uuid4())),
        "repo": workflow_run.get("repository", {}).get("full_name", "unknown/repo"),
        "branch": workflow_run.get("head_branch", "main"),
        "commit_sha": workflow_run.get("head_sha", "")[:40],
        "commit_msg": workflow_run.get("head_commit", {}).get("message", ""),
        "author": workflow_run.get("head_commit", {}).get("author", {}).get("name", "unknown"),
        "status": workflow_run.get("conclusion", "failure"),
        "duration_sec": random.randint(30, 300),
        "triggered_by": workflow_run.get("event", "push"),
    }


def parse_simulated_webhook(payload: dict) -> dict:
    """Parse our simulated webhook payload."""
    return {
        "build_id": payload.get("build_id", str(uuid.uuid4())),
        "repo": payload.get("repo", "org/repo"),
        "branch": payload.get("branch", "main"),
        "commit_sha": payload.get("commit_sha", "abc123"),
        "commit_msg": payload.get("commit_msg", "feat: some change"),
        "author": payload.get("author", "dev"),
        "status": payload.get("status", "failure"),
        "duration_sec": payload.get("duration_sec", 120),
        "triggered_by": payload.get("triggered_by", "push"),
    }


@router.post("/github")
async def receive_github_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.json()

    # Detect simulated vs real webhook
    if "workflow_run" in payload:
        data = parse_github_webhook(payload)
    else:
        data = parse_simulated_webhook(payload)

    # Check for duplicate
    existing = db.query(Build).filter(Build.build_id == data["build_id"]).first()
    if existing:
        return {"message": "build already exists", "build_id": data["build_id"]}

    # Map status string to enum
    status_map = {
        "success": BuildStatus.success,
        "failure": BuildStatus.failure,
        "in_progress": BuildStatus.in_progress,
    }
    build_status = status_map.get(data["status"], BuildStatus.failure)

    # Save build
    build = Build(
        build_id=data["build_id"],
        repo=data["repo"],
        branch=data["branch"],
        commit_sha=data["commit_sha"],
        commit_msg=data["commit_msg"],
        author=data["author"],
        status=build_status,
        duration_sec=data["duration_sec"],
        triggered_by=data["triggered_by"],
        created_at=datetime.utcnow(),
    )
    db.add(build)
    db.flush()  # get build.id without committing

    # Add fake logs for failed builds
    if build_status == BuildStatus.failure:
        steps = payload.get("steps", [
            {"step_name": "Install dependencies", "log_text": "npm install\nnpm warn deprecated package"},
            {"step_name": "Run tests", "log_text": "FAIL src/app.test.js\n● Test suite failed to run\nError: Cannot find module './utils'"},
            {"step_name": "Build", "log_text": "Error: Build failed with exit code 1"},
        ])
        for step in steps:
            log = Log(
                build_id=build.id,
                step_name=step["step_name"],
                log_text=step["log_text"],
                created_at=datetime.utcnow(),
            )
            db.add(log)

        # Add fake failed tests
        failed_tests = payload.get("failed_tests", [
            {"test_name": "src/app.test.js > renders correctly", "error_msg": "Cannot find module './utils'"},
        ])
        for t in failed_tests:
            test = Test(
                build_id=build.id,
                test_name=t["test_name"],
                status=TestStatus.failed,
                duration_ms=random.randint(100, 5000),
                error_msg=t.get("error_msg", ""),
            )
            db.add(test)

    # Create pending investigation for failed builds
    if build_status == BuildStatus.failure:
        investigation = Investigation(
            build_id=build.id,
            status=InvestigationStatus.pending,
            created_at=datetime.utcnow(),
        )
        db.add(investigation)

    db.commit()
    db.refresh(build)

    return {
        "message": "webhook received",
        "build_id": data["build_id"],
        "status": data["status"],
        "investigation_queued": build_status == BuildStatus.failure,
    }