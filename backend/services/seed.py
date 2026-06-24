# backend/services/seed.py
"""
Idempotent seed script: inserts 50 fake builds into MySQL + ChromaDB.
Safe to run multiple times — skips builds that already exist.
"""
import os
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Allow running as a script from the backend/ directory
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from database import SessionLocal, engine
from models import Base, Build, Investigation, Log, Test
from services.embeddings import embed_build_logs

random.seed(42)

# ── Templates ─────────────────────────────────────────────────────────────────

REPOS = ["org/frontend-app", "org/backend-api", "org/data-pipeline", "org/infra-terraform"]
AUTHORS = ["alice", "bob", "carol", "dave", "eve"]
BRANCHES = ["main", "develop", "feature/auth", "feature/payments", "fix/memory-leak"]

SCENARIO_TEMPLATES = {
    "FLAKY_TEST": {
        "steps": [
            ("Install", "npm ci\nadded 1423 packages in 12s"),
            ("Lint", "ESLint found 0 errors"),
            ("Test", "FAIL src/components/Button.test.tsx\nExpected: true\nReceived: false\nFlaky test detected: passed 7/10 runs"),
            ("Build", "error: Tests failed, aborting build"),
        ],
        "tests": [
            ("Button.test.tsx::renders correctly", "failed", "Expected: true Received: false"),
            ("Header.test.tsx::shows title", "passed", None),
        ],
        "root_cause": "FLAKY_TEST",
        "resolution": "Add retry logic or fix async test setup",
    },
    "DEPENDENCY_CHANGE": {
        "steps": [
            ("Install", "npm ci\nnpm ERR! code ERESOLVE\nnpm ERR! Could not resolve dependency\nnpm ERR! peer react@^17.0.0 from react-router-dom@5.3.4\nerror Exit code 1"),
            ("Test", "skipped: install failed"),
            ("Build", "skipped: install failed"),
        ],
        "tests": [],
        "root_cause": "DEPENDENCY_CHANGE",
        "resolution": "Pin react-router-dom to ^6.0.0 or add --legacy-peer-deps",
    },
    "ENV_DRIFT": {
        "steps": [
            ("Install", "npm ci\nadded 1423 packages in 12s"),
            ("Lint", "ESLint found 0 errors"),
            ("Test", "Error: DATABASE_URL is not defined\n    at getConnection (db.js:12)\nprocess exited with code 1"),
            ("Build", "skipped: tests failed"),
        ],
        "tests": [
            ("db.test.js::connects to database", "failed", "DATABASE_URL is not defined"),
        ],
        "root_cause": "ENV_DRIFT",
        "resolution": "Add DATABASE_URL to CI environment secrets",
    },
    "CODE_BUG": {
        "steps": [
            ("Install", "npm ci\nadded 1423 packages in 12s"),
            ("Lint", "ESLint found 0 errors"),
            ("Test", "FAIL src/utils/calculate.test.ts\nTypeError: Cannot read properties of undefined (reading 'total')\n    at calculateTotal (calculate.ts:23)"),
            ("Build", "error TS2345: Argument of type 'undefined' is not assignable to parameter of type 'number'"),
        ],
        "tests": [
            ("calculate.test.ts::returns correct total", "failed", "TypeError: Cannot read properties of undefined"),
            ("calculate.test.ts::handles empty input", "passed", None),
        ],
        "root_cause": "CODE_BUG",
        "resolution": "Add null check before accessing .total property",
    },
    "INFRA_FAILURE": {
        "steps": [
            ("Install", "npm ci\nnpm ERR! network request failed\nnpm ERR! network This is a problem related to network connectivity\nnpm ERR! errno ECONNREFUSED\nerror Exit code 1"),
            ("Test", "skipped"),
            ("Build", "skipped"),
        ],
        "tests": [],
        "root_cause": "INFRA_FAILURE",
        "resolution": "Runner had no network access. Re-run job or check runner health",
    },
    "success": {
        "steps": [
            ("Install", "npm ci\nadded 1423 packages in 11s"),
            ("Lint", "ESLint found 0 errors"),
            ("Test", "Test Suites: 12 passed, 12 total\nTests: 47 passed, 47 total"),
            ("Build", "webpack compiled successfully in 4231ms"),
            ("Deploy", "Deployed to production: https://app.example.com"),
        ],
        "tests": [
            ("App.test.tsx::renders", "passed", None),
            ("Header.test.tsx::shows title", "passed", None),
            ("calculate.test.ts::returns total", "passed", None),
        ],
        "root_cause": None,
        "resolution": None,
    },
}

SCENARIO_COUNTS = {
    "FLAKY_TEST": 10,
    "DEPENDENCY_CHANGE": 8,
    "ENV_DRIFT": 6,
    "CODE_BUG": 12,
    "INFRA_FAILURE": 4,
    "success": 10,
}


def _random_build_id() -> str:
    return f"seed-{random.randint(10000, 99999)}"


def _make_build(scenario: str, idx: int, base_time: datetime) -> dict:
    tmpl = SCENARIO_TEMPLATES[scenario]
    is_failure = scenario != "success"
    offset_hours = idx * 3 + random.randint(0, 2)

    return {
        "build_id": f"seed-{scenario.lower().replace('_', '-')}-{idx:03d}",
        "repo": random.choice(REPOS),
        "branch": "main" if is_failure else random.choice(BRANCHES),
        "commit_sha": f"{random.randint(0x1000000, 0xfffffff):07x}abcdef",
        "commit_msg": f"{'fix: ' if is_failure else 'feat: '}{'failing' if is_failure else 'working'} change {idx}",
        "author": random.choice(AUTHORS),
        "status": "failure" if is_failure else "success",
        "duration_sec": random.randint(45, 300),
        "triggered_by": "push",
        "created_at": base_time - timedelta(hours=offset_hours),
        "steps": tmpl["steps"],
        "tests": tmpl["tests"],
        "root_cause": tmpl["root_cause"],
        "resolution": tmpl["resolution"],
    }


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    inserted = 0
    skipped = 0
    embedded = 0

    base_time = datetime.utcnow()

    try:
        all_builds = []
        for scenario, count in SCENARIO_COUNTS.items():
            for i in range(count):
                all_builds.append(_make_build(scenario, i, base_time))

        random.shuffle(all_builds)

        for data in all_builds:
            # Idempotency check
            existing = db.query(Build).filter(Build.build_id == data["build_id"]).first()
            if existing:
                skipped += 1
                continue

            build = Build(
                build_id=data["build_id"],
                repo=data["repo"],
                branch=data["branch"],
                commit_sha=data["commit_sha"],
                commit_msg=data["commit_msg"],
                author=data["author"],
                status=data["status"],
                duration_sec=data["duration_sec"],
                triggered_by=data["triggered_by"],
                created_at=data["created_at"],
            )
            db.add(build)
            db.flush()

            # Logs
            for step_name, log_text in data["steps"]:
                db.add(Log(
                    build_id=build.id,
                    step_name=step_name,
                    log_text=log_text,
                    created_at=data["created_at"],
                ))

            # Tests
            for test_name, status, error_msg in data["tests"]:
                db.add(Test(
                    build_id=build.id,
                    test_name=test_name,
                    status=status,
                    duration_ms=random.randint(10, 2000),
                    error_msg=error_msg,
                ))

            # Investigation record for failures
            if data["status"] == "failure":
                db.add(Investigation(
                    build_id=build.id,
                    status="complete",
                    root_cause=data["root_cause"],
                    confidence=round(random.uniform(0.75, 0.98), 2),
                    summary=f"Build failed due to {data['root_cause'].replace('_', ' ').lower()}",
                    proposed_fix=data["resolution"],
                    created_at=data["created_at"],
                    completed_at=data["created_at"] + timedelta(seconds=30),
                ))

            db.commit()
            inserted += 1

            # Embed failure logs into ChromaDB
            if data["status"] == "failure":
                logs_for_embed = [
                    {"step_name": s, "log_text": t}
                    for s, t in data["steps"]
                ]
                try:
                    n = embed_build_logs(
                        build_id=data["build_id"],
                        repo=data["repo"],
                        logs=logs_for_embed,
                        root_cause=data["root_cause"],
                        resolution=data["resolution"] or "",
                    )
                    embedded += n
                except Exception as e:
                    print(f"  ChromaDB embed failed for {data['build_id']}: {e}")

        print(f"\nSeed complete:")
        print(f"  Inserted: {inserted} builds")
        print(f"  Skipped:  {skipped} (already existed)")
        print(f"  Embedded: {embedded} ChromaDB documents")

    finally:
        db.close()


if __name__ == "__main__":
    seed()