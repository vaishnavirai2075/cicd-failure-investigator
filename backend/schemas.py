from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
from models import BuildStatus, TestStatus, InvestigationStatus


class TestSchema(BaseModel):
    id: int
    test_name: str
    status: TestStatus
    duration_ms: Optional[int]
    error_msg: Optional[str]

    class Config:
        from_attributes = True


class LogSchema(BaseModel):
    id: int
    step_name: str
    log_text: str
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class InvestigationSchema(BaseModel):
    id: int
    status: InvestigationStatus
    root_cause: Optional[str]
    confidence: Optional[float]
    summary: Optional[str]
    proposed_fix: Optional[str]
    similar_builds: Optional[Any]
    reasoning_trace: Optional[Any]
    created_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class BuildSchema(BaseModel):
    id: int
    build_id: str
    repo: str
    branch: str
    commit_sha: str
    commit_msg: Optional[str]
    author: Optional[str]
    status: BuildStatus
    duration_sec: Optional[int]
    triggered_by: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class BuildDetailSchema(BuildSchema):
    tests: List[TestSchema] = []
    logs: List[LogSchema] = []
    investigation: Optional[InvestigationSchema] = None


class WebhookPayload(BaseModel):
    action: str
    workflow_run: dict


class OverviewStats(BaseModel):
    total_builds: int
    failed_builds: int
    success_rate: float
    avg_duration_sec: Optional[float]
    open_investigations: int