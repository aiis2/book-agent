from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
NODE_BRIDGE = REPO_ROOT / "engine-node" / "src" / "adapters" / "bridge-entry.mjs"


def run_raw_request(request: str, *, cwd: str | Path | None = None, extra_env: Mapping[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    if extra_env:
        env.update(dict(extra_env))

    return subprocess.run(
        ["node", str(NODE_BRIDGE)],
        input=request,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
        cwd=str(cwd) if cwd is not None else str(Path.cwd()),
        env=env,
    )


def invoke_request(
    request: Mapping[str, Any],
    *,
    cwd: str | Path | None = None,
    extra_env: Mapping[str, str] | None = None,
) -> dict[str, Any]:
    completed = run_raw_request(json.dumps(request), cwd=cwd, extra_env=extra_env)
    stdout = (completed.stdout or "").strip()
    if not stdout:
        return {
            "ok": False,
            "operation": request.get("operation", "unknown"),
            "data": None,
            "error": {
                "code": "EMPTY_BRIDGE_RESPONSE",
                "message": (completed.stderr or "").strip() or "Bridge returned no output",
                "details": {},
            },
        }

    try:
        return json.loads(stdout)
    except json.JSONDecodeError as error:
        return {
            "ok": False,
            "operation": request.get("operation", "unknown"),
            "data": None,
            "error": {
                "code": "INVALID_BRIDGE_RESPONSE",
                "message": str(error),
                "details": {
                    "stdout": stdout,
                    "stderr": (completed.stderr or "").strip(),
                },
            },
        }


def main() -> int:
    request = sys.stdin.read()
    if not request.strip():
        sys.stderr.write("Bridge request is required on stdin.\n")
        return 1

    completed = run_raw_request(request)

    if completed.stdout:
        sys.stdout.write(completed.stdout)
    if completed.returncode != 0 and completed.stderr:
        sys.stderr.write(completed.stderr)

    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())