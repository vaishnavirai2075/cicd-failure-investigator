# backend/agent/tools.py
import json
import logging
import os
from typing import Optional

from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from sqlalchemy import text

from database import SessionLocal
from models import Build, Log, Test, Investigation
from services.embeddings import search_similar_failures as _chroma_search
from agent.prompts import (
    FETCH_LOGS_DESC,
    COMPARE_BUILDS_DESC,
    SEARCH_SIMILAR_DESC,
    GET_TEST_HISTORY_DESC,
    PROPOSE_FIX_DESC,
)

logger = logging.getLogger(__name__)


def _get_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model=os.getenv("OPENAI_MODEL", "llama-3.3-70b-versatile"),
        base_url=os.getenv("OPENAI_BASE_URL", "https://api.groq.com/openai/v1"),
        api_key=os.getenv("OPENAI_API_KEY"),
        temperature=0.1,
    )


@tool(description=FETCH_LOGS_DESC)
def fetch_logs(build_id: str) -> dict:
    """Fetch all log steps for a build from MySQL."""
    db = SessionLocal()
    try:
        build = db.query(Build).filter(Build.build_id == build_id).first()
        if not build:
            return {"error": f"Build {build_id} not found"}

        logs = db.query(Log).filter(Log.build_id == build.id).all()
        tests = db.query(Test).filter(Test.build_id == build.id).all()

        failed_steps = [
            {"step_name": l.step_name, "log_text": l.log_text}
            for l in logs
            if any(
                kw in (l.log_text or "").lower()
                for kw in ["error", "failed", "exit code", "exception", "traceback", "fatal"]
            )
        ]

        return {
            "build_id": build_id,
            "repo": build.repo,
            "branch": build.branch,
            "commit_sha": build.commit_sha,
            "commit_msg": build.commit_msg,
            "author": build.author,
            "status": build.status.value if hasattr(build.status, "value") else build.status,
            "steps": [
                {"step_name": l.step_name, "log_text": l.log_text[:1000]}
                for l in logs
            ],
            "failed_steps": failed_steps,
            "tests": [
                {
                    "test_name": t.test_name,
                    "status": t.status.value if hasattr(t.status, "value") else t.status,
                    "error_msg": t.error_msg,
                }
                for t in tests
            ],
            "failed_tests": [
                t.test_name
                for t in tests
                if (t.status.value if hasattr(t.status, "value") else t.status) == "failed"
            ],
        }
    finally:
        db.close()


@tool(description=COMPARE_BUILDS_DESC)
def compare_builds(failing_id: str, passing_id: Optional[str] = None) -> dict:
    """Compare a failing build against the last passing build on the same branch."""
    db = SessionLocal()
    try:
        failing = db.query(Build).filter(Build.build_id == failing_id).first()
        if not failing:
            return {"error": f"Failing build {failing_id} not found"}

        if passing_id:
            passing = db.query(Build).filter(Build.build_id == passing_id).first()
        else:
            passing = (
                db.query(Build)
                .filter(
                    Build.branch == failing.branch,
                    Build.repo == failing.repo,
                    Build.status == "success",
                    Build.created_at < failing.created_at,
                )
                .order_by(Build.created_at.desc())
                .first()
            )

        if not passing:
            return {
                "error": "No passing build found on the same branch",
                "failing_build": failing_id,
                "branch": failing.branch,
            }

        failing_logs = {
            l.step_name: l.log_text
            for l in db.query(Log).filter(Log.build_id == failing.id).all()
        }
        passing_logs = {
            l.step_name: l.log_text
            for l in db.query(Log).filter(Log.build_id == passing.id).all()
        }

        new_steps = [s for s in failing_logs if s not in passing_logs]
        removed_steps = [s for s in passing_logs if s not in failing_logs]
        changed_steps = [
            s for s in failing_logs
            if s in passing_logs and failing_logs[s] != passing_logs[s]
        ]

        return {
            "failing_build": {
                "build_id": failing_id,
                "commit_sha": failing.commit_sha,
                "commit_msg": failing.commit_msg,
                "author": failing.author,
                "created_at": str(failing.created_at),
            },
            "passing_build": {
                "build_id": passing.build_id,
                "commit_sha": passing.commit_sha,
                "commit_msg": passing.commit_msg,
                "author": passing.author,
                "created_at": str(passing.created_at),
            },
            "diff": {
                "new_steps": new_steps,
                "removed_steps": removed_steps,
                "changed_steps": changed_steps,
                "commits_between": f"{passing.commit_sha[:7]}..{failing.commit_sha[:7]}",
            },
        }
    finally:
        db.close()


@tool(description=SEARCH_SIMILAR_DESC)
def search_similar_failures(error_text: str, n: int = 5) -> list[dict]:
    """Search ChromaDB for past builds with similar errors."""
    try:
        hits = _chroma_search(error_text, n=n)
        return [
            {
                "build_id": h["metadata"].get("build_id"),
                "repo": h["metadata"].get("repo"),
                "root_cause": h["metadata"].get("root_cause"),
                "resolution": h["metadata"].get("resolution"),
                "similarity": h["score"],
                "text_snippet": h["text"][:300],
            }
            for h in hits
        ]
    except Exception as e:
        logger.error(f"similarity search failed: {e}")
        return [{"error": str(e)}]


@tool(description=GET_TEST_HISTORY_DESC)
def get_test_history(test_name: str) -> dict:
    """Get the last 20 runs of a named test and compute flakiness."""
    db = SessionLocal()
    try:
        rows = (
            db.query(Test, Build)
            .join(Build, Test.build_id == Build.id)
            .filter(Test.test_name == test_name)
            .order_by(Build.created_at.desc())
            .limit(20)
            .all()
        )

        if not rows:
            return {"error": f"No history found for test '{test_name}'"}

        history = []
        for test, build in rows:
            status = test.status.value if hasattr(test.status, "value") else test.status
            history.append(
                {
                    "build_id": build.build_id,
                    "status": status,
                    "error_msg": test.error_msg,
                    "created_at": str(build.created_at),
                }
            )

        total = len(history)
        failed = sum(1 for h in history if h["status"] == "failed")
        pass_rate = round((total - failed) / total, 3) if total else 0
        flaky = 0.2 <= pass_rate <= 0.8

        return {
            "test_name": test_name,
            "total_runs": total,
            "failed_runs": failed,
            "pass_rate": pass_rate,
            "is_flaky": flaky,
            "history": history,
        }
    finally:
        db.close()


@tool(description=PROPOSE_FIX_DESC)
def propose_fix(root_cause: str, context: str) -> str:
    """Call the LLM to generate a concrete markdown fix."""
    llm = _get_llm()
    prompt = f"""You are a senior DevOps engineer. A CI/CD build failed.

Root cause classification: {root_cause}

Evidence and context:
{context}

Write a concrete, actionable fix in Markdown. Include:
1. What exactly went wrong (1-2 sentences)
2. Step-by-step fix with code snippets where relevant
3. How to prevent this in future

Be specific — no generic advice."""

    response = llm.invoke(prompt)
    return response.content


ALL_TOOLS = [fetch_logs, compare_builds, search_similar_failures, get_test_history, propose_fix]