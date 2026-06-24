from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from database import get_db
from models import Build, Investigation, BuildStatus, InvestigationStatus
from schemas import BuildSchema, BuildDetailSchema
from typing import List, Optional
from datetime import datetime, timedelta

router = APIRouter(prefix="/builds", tags=["builds"])


@router.get("", response_model=List[BuildSchema])
def list_builds(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    repo: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Build).order_by(Build.created_at.desc())
    if status:
        query = query.filter(Build.status == status)
    if repo:
        query = query.filter(Build.repo == repo)
    return query.offset(skip).limit(limit).all()


@router.get("/stats/overview")
def get_overview_stats(db: Session = Depends(get_db)):
    total = db.query(Build).count()
    failed = db.query(Build).filter(Build.status == BuildStatus.failure).count()
    success = db.query(Build).filter(Build.status == BuildStatus.success).count()
    avg_duration = db.query(func.avg(Build.duration_sec)).scalar()
    open_investigations = db.query(Investigation).filter(
        Investigation.status.in_([InvestigationStatus.pending, InvestigationStatus.running])
    ).count()

    return {
        "total_builds": total,
        "failed_builds": failed,
        "success_builds": success,
        "success_rate": round((success / total * 100) if total > 0 else 0, 1),
        "avg_duration_sec": round(avg_duration, 1) if avg_duration else 0,
        "open_investigations": open_investigations,
    }


@router.get("/stats/daily")
def get_daily_stats(days: int = 14, db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=days)
    builds = db.query(Build).filter(Build.created_at >= since).all()

    daily = {}
    for build in builds:
        day = build.created_at.strftime("%Y-%m-%d")
        if day not in daily:
            daily[day] = {"date": day, "success": 0, "failure": 0, "total": 0}
        daily[day][build.status.value] += 1
        daily[day]["total"] += 1

    return sorted(daily.values(), key=lambda x: x["date"])


@router.get("/{build_id}", response_model=BuildDetailSchema)
def get_build(build_id: str, db: Session = Depends(get_db)):
    build = (
        db.query(Build)
        .options(
            joinedload(Build.logs),
            joinedload(Build.tests),
            joinedload(Build.investigation),
        )
        .filter(Build.build_id == build_id)
        .first()
    )
    if not build:
        raise HTTPException(status_code=404, detail="Build not found")
    return build