import httpx
import uuid
import sys
import json

API_URL = "http://localhost:8001"

SAMPLE_PAYLOADS = [
    {
        "build_id": f"build-{uuid.uuid4().hex[:8]}",
        "repo": "org/backend-api",
        "branch": "main",
        "commit_sha": uuid.uuid4().hex[:40],
        "commit_msg": "feat: add user authentication",
        "author": "alice",
        "status": "failure",
        "duration_sec": 145,
        "triggered_by": "push",
        "steps": [
            {"step_name": "Checkout", "log_text": "Cloning repository...done"},
            {"step_name": "Install dependencies", "log_text": "pip install -r requirements.txt\nERROR: Could not find a version that satisfies the requirement pandas==2.2.0"},
            {"step_name": "Run tests", "log_text": "FAILED tests/test_auth.py::test_login - ImportError: cannot import name 'create_jwt' from 'auth'"},
        ],
        "failed_tests": [
            {"test_name": "tests/test_auth.py::test_login", "error_msg": "ImportError: cannot import name 'create_jwt'"},
            {"test_name": "tests/test_auth.py::test_refresh_token", "error_msg": "ImportError: cannot import name 'create_jwt'"},
        ],
    },
    {
        "build_id": f"build-{uuid.uuid4().hex[:8]}",
        "repo": "org/frontend-app",
        "branch": "develop",
        "commit_sha": uuid.uuid4().hex[:40],
        "commit_msg": "fix: resolve hydration mismatch",
        "author": "bob",
        "status": "failure",
        "duration_sec": 87,
        "triggered_by": "pull_request",
        "steps": [
            {"step_name": "Install", "log_text": "npm ci\nadded 1423 packages"},
            {"step_name": "Lint", "log_text": "ESLint found 0 errors"},
            {"step_name": "Test", "log_text": "FAIL src/components/Header.test.tsx\nExpected: 'Dashboard'\nReceived: undefined"},
        ],
        "failed_tests": [
            {"test_name": "src/components/Header.test.tsx > renders title", "error_msg": "Expected 'Dashboard' but received undefined"},
        ],
    },
    {
        "build_id": f"build-{uuid.uuid4().hex[:8]}",
        "repo": "org/backend-api",
        "branch": "main",
        "commit_sha": uuid.uuid4().hex[:40],
        "commit_msg": "chore: update CI pipeline",
        "author": "charlie",
        "status": "success",
        "duration_sec": 203,
        "triggered_by": "push",
    },
]


def simulate(index: int = 0):
    payload = SAMPLE_PAYLOADS[index % len(SAMPLE_PAYLOADS)]
    print(f"\nSending webhook for build: {payload['build_id']}")
    print(f"Repo: {payload['repo']} | Branch: {payload['branch']} | Status: {payload['status']}")

    response = httpx.post(f"{API_URL}/webhooks/github", json=payload)
    print(f"\nResponse ({response.status_code}):")
    print(json.dumps(response.json(), indent=2))
    return payload["build_id"]


def verify(build_id: str):
    print(f"\nVerifying build {build_id}...")
    response = httpx.get(f"{API_URL}/builds/{build_id}")
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Build found: {data['build_id']} | Status: {data['status']}")
        print(f"  Logs: {len(data['logs'])} steps | Tests: {len(data['tests'])} results")
        print(f"  Investigation: {data['investigation']['status'] if data['investigation'] else 'none'}")
    else:
        print(f"✗ Build not found: {response.status_code}")


if __name__ == "__main__":
    index = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    build_id = simulate(index)
    verify(build_id)