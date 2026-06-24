# backend/routers/investigations.py
import logging
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Build, Investigation
from agent.graph import run_investigation as _run_investigation

logger = logging.getLogger(__name__)
router = APIRouter()


async def _investigate_background(build_id: str, investigation_id: int):
    """Run agent investigation and persist results."""
    from database import SessionLocal
    db = SessionLocal()
    try:
        inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
        if not inv:
            return

        inv.status = "running"
        db.commit()

        result = await _run_investigation(build_id)

        inv.status = "complete"
        inv.root_cause = result.get("root_cause", "UNKNOWN")
        inv.confidence = result.get("confidence", 0.0)
        inv.summary = result.get("summary", "")
        inv.proposed_fix = result.get("proposed_fix", "")
        inv.reasoning_trace = result.get("messages", [])

        # Update ChromaDB metadata with resolved root cause
        try:
            from services.embeddings import embed_build_logs
            from models import Log
            logs = db.query(Log).filter(Log.build_id == inv.build_id).all()
            if logs:
                embed_build_logs(
                    build_id=build_id,
                    repo=db.query(Build).filter(Build.build_id == build_id).first().repo,
                    logs=[{"step_name": l.step_name, "log_text": l.log_text} for l in logs],
                    root_cause=inv.root_cause,
                    resolution=inv.proposed_fix[:200] if inv.proposed_fix else "",
                )
        except Exception as e:
            logger.warning(f"Failed to update ChromaDB after investigation: {e}")

        from datetime import datetime
        inv.completed_at = datetime.utcnow()
        db.commit()
        logger.info(f"Investigation complete for {build_id}: {inv.root_cause} ({inv.confidence})")

    except Exception as e:
        logger.exception(f"Investigation failed for {build_id}: {e}")
        db = SessionLocal()
        inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
        if inv:
            inv.status = "failed"
            db.commit()
    finally:
        db.close()


@router.post("/investigations/{build_id}/trigger")
async def trigger_investigation(
    build_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Manually trigger an investigation for a build."""
    build = db.query(Build).filter(Build.build_id == build_id).first()
    if not build:
        raise HTTPException(status_code=404, detail=f"Build {build_id} not found")

    inv = db.query(Investigation).filter(Investigation.build_id == build.id).first()
    if inv and inv.status in ("running",):
        return {"status": "already_running", "investigation_id": inv.id}

    if not inv:
        inv = Investigation(build_id=build.id, status="pending")
        db.add(inv)
        db.commit()
        db.refresh(inv)
    else:
        inv.status = "pending"
        db.commit()

    background_tasks.add_task(_investigate_background, build_id, inv.id)
    return {"status": "triggered", "investigation_id": inv.id, "build_id": build_id}


@router.get("/investigations/{build_id}")
def get_investigation(build_id: str, db: Session = Depends(get_db)):
    """Get the investigation result for a build."""
    build = db.query(Build).filter(Build.build_id == build_id).first()
    if not build:
        raise HTTPException(status_code=404, detail=f"Build {build_id} not found")

    inv = db.query(Investigation).filter(Investigation.build_id == build.id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="No investigation found for this build")

    return {
        "id": inv.id,
        "build_id": build_id,
        "status": inv.status.value if hasattr(inv.status, "value") else inv.status,
        "root_cause": inv.root_cause,
        "confidence": inv.confidence,
        "summary": inv.summary,
        "proposed_fix": inv.proposed_fix,
        "similar_builds": inv.similar_builds,
        "reasoning_trace": inv.reasoning_trace,
        "created_at": str(inv.created_at),
        "completed_at": str(inv.completed_at) if inv.completed_at else None,
    }


@router.get("/investigations")
def list_investigations(
    status: str | None = None,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """List all investigations, optionally filtered by status."""
    q = db.query(Investigation)
    if status:
        q = q.filter(Investigation.status == status)
    investigations = q.order_by(Investigation.created_at.desc()).limit(limit).all()

    results = []
    for inv in investigations:
        build = db.query(Build).filter(Build.id == inv.build_id).first()
        results.append({
            "id": inv.id,
            "build_id": build.build_id if build else None,
            "status": inv.status.value if hasattr(inv.status, "value") else inv.status,
            "root_cause": inv.root_cause,
            "confidence": inv.confidence,
            "summary": inv.summary,
            "created_at": str(inv.created_at),
            "completed_at": str(inv.completed_at) if inv.completed_at else None,
        })
    return results