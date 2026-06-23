from sqlalchemy import (
    Column, Integer, String, Text, Float, DateTime, ForeignKey, Enum, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class BuildStatus(str, enum.Enum):
    success = "success"
    failure = "failure"
    in_progress = "in_progress"


class TestStatus(str, enum.Enum):
    passed = "passed"
    failed = "failed"
    skipped = "skipped"


class InvestigationStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    complete = "complete"
    failed = "failed"


class Build(Base):
    __tablename__ = "builds"

    id = Column(Integer, primary_key=True, autoincrement=True)
    build_id = Column(String(100), unique=True, nullable=False, index=True)
    repo = Column(String(200), nullable=False)
    branch = Column(String(100), nullable=False)
    commit_sha = Column(String(40), nullable=False)
    commit_msg = Column(String(500))
    author = Column(String(100))
    status = Column(Enum(BuildStatus), nullable=False)
    duration_sec = Column(Integer)
    triggered_by = Column(String(100))
    created_at = Column(DateTime, server_default=func.now())

    tests = relationship("Test", back_populates="build", cascade="all, delete-orphan")
    logs = relationship("Log", back_populates="build", cascade="all, delete-orphan")
    investigation = relationship("Investigation", back_populates="build", uselist=False, cascade="all, delete-orphan")


class Test(Base):
    __tablename__ = "tests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    build_id = Column(Integer, ForeignKey("builds.id"), nullable=False, index=True)
    test_name = Column(String(300), nullable=False)
    status = Column(Enum(TestStatus), nullable=False)
    duration_ms = Column(Integer)
    error_msg = Column(Text)

    build = relationship("Build", back_populates="tests")


class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    build_id = Column(Integer, ForeignKey("builds.id"), nullable=False, index=True)
    step_name = Column(String(200), nullable=False)
    log_text = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    build = relationship("Build", back_populates="logs")


class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    build_id = Column(Integer, ForeignKey("builds.id"), nullable=False, unique=True, index=True)
    status = Column(Enum(InvestigationStatus), default=InvestigationStatus.pending)
    root_cause = Column(String(100))
    confidence = Column(Float)
    summary = Column(Text)
    proposed_fix = Column(Text)
    similar_builds = Column(JSON)
    reasoning_trace = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime)

    build = relationship("Build", back_populates="investigation")