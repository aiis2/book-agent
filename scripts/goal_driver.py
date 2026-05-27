from __future__ import annotations

import argparse
import json
import platform
import sys
from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


STATE_RELATIVE_PATH = Path("docs") / "plans" / "active-goal.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_default_state(root: Path) -> dict[str, Any]:
    timestamp = now_iso()
    return {
        "objective": "",
        "requirements": [],
        "scope": [],
        "mustNotRegress": [],
        "constraints": [],
        "currentEnvironment": {
            "repoRoot": str(root),
            "platform": platform.platform(),
            "python": sys.version.split()[0],
        },
        "requiredTools": [],
        "validationProofPlan": [],
        "inspectionEvidence": [],
        "discoveredIssues": [],
        "issueResolutions": [],
        "resolvedIssues": [],
        "verificationResults": [],
        "requirementCoverage": [],
        "doneSoFar": [],
        "remaining": [],
        "blockers": [],
        "completionAudit": [],
        "completionStatus": "open",
        "openedAt": timestamp,
        "updatedAt": timestamp,
        "closedAt": None,
    }


@dataclass
class GoalStore:
    root: Path

    @property
    def path(self) -> Path:
        return self.root / STATE_RELATIVE_PATH

    def exists(self) -> bool:
        return self.path.exists()

    def load(self) -> dict[str, Any]:
        if not self.exists():
            raise FileNotFoundError(f"Active goal file not found: {self.path}")
        return json.loads(self.path.read_text(encoding="utf-8"))

    def save(self, state: dict[str, Any]) -> dict[str, Any]:
        state["updatedAt"] = now_iso()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return state


def extend_unique(target: list[Any], items: list[Any]) -> None:
    for item in items:
        if item not in target:
            target.append(item)


def print_json(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="goal-driver")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    subparsers = parser.add_subparsers(dest="command", required=True)

    open_parser = subparsers.add_parser("open")
    open_parser.add_argument("--objective", required=True)
    open_parser.add_argument("--requirement", action="append", default=[])
    open_parser.add_argument("--scope", action="append", default=[])
    open_parser.add_argument("--must-not-regress", dest="must_not_regress", action="append", default=[])
    open_parser.add_argument("--constraint", action="append", default=[])
    open_parser.add_argument("--tool", action="append", default=[])
    open_parser.add_argument("--validation", action="append", default=[])
    open_parser.add_argument("--remaining", action="append", default=[])

    subparsers.add_parser("status")
    subparsers.add_parser("next")

    update_parser = subparsers.add_parser("update")
    update_parser.add_argument("--inspection-evidence", dest="inspection_evidence", action="append", default=[])
    update_parser.add_argument("--discovered-issue", dest="discovered_issue", action="append", default=[])
    update_parser.add_argument("--issue-resolution", dest="issue_resolution", action="append", default=[])
    update_parser.add_argument("--resolved-issue", dest="resolved_issue", action="append", default=[])
    update_parser.add_argument("--verification", action="append", default=[])
    update_parser.add_argument("--requirement-coverage", dest="requirement_coverage", action="append", default=[])
    update_parser.add_argument("--done", action="append", default=[])
    update_parser.add_argument("--remaining", action="append", default=[])
    update_parser.add_argument("--blocker", action="append", default=[])
    update_parser.add_argument("--clear-blockers", action="store_true")
    update_parser.add_argument("--completion-status", choices=["open", "blocked", "complete", "cancelled"])

    close_parser = subparsers.add_parser("close")
    close_parser.add_argument("--completion-status", required=True, choices=["complete", "blocked", "cancelled"])
    close_parser.add_argument("--audit", action="append", default=[])

    return parser


def handle_open(store: GoalStore, args: argparse.Namespace) -> dict[str, Any]:
    state = build_default_state(store.root)
    state["objective"] = args.objective
    state["requirements"] = deepcopy(args.requirement)
    state["scope"] = deepcopy(args.scope)
    state["mustNotRegress"] = deepcopy(args.must_not_regress)
    state["constraints"] = deepcopy(args.constraint)
    state["requiredTools"] = deepcopy(args.tool)
    state["validationProofPlan"] = deepcopy(args.validation)
    state["remaining"] = deepcopy(args.remaining)
    return store.save(state)


def handle_status(store: GoalStore, _args: argparse.Namespace) -> dict[str, Any]:
    return store.load()


def handle_next(store: GoalStore, _args: argparse.Namespace) -> dict[str, Any]:
    state = store.load()
    blockers = state.get("blockers", [])
    remaining = state.get("remaining", [])
    return {
        "objective": state.get("objective"),
        "completionStatus": state.get("completionStatus"),
        "hasBlockers": bool(blockers),
        "blockers": blockers,
        "nextStep": None if blockers else (remaining[0] if remaining else None),
        "remainingCount": len(remaining),
    }


def handle_update(store: GoalStore, args: argparse.Namespace) -> dict[str, Any]:
    state = store.load()
    extend_unique(state["inspectionEvidence"], args.inspection_evidence)
    extend_unique(state["discoveredIssues"], args.discovered_issue)
    extend_unique(state["issueResolutions"], args.issue_resolution)
    extend_unique(state["resolvedIssues"], args.resolved_issue)
    extend_unique(state["verificationResults"], args.verification)
    extend_unique(state["requirementCoverage"], args.requirement_coverage)
    extend_unique(state["doneSoFar"], args.done)

    if args.remaining:
        state["remaining"] = deepcopy(args.remaining)

    if args.clear_blockers:
        state["blockers"] = []
    extend_unique(state["blockers"], args.blocker)

    if args.completion_status:
        state["completionStatus"] = args.completion_status

    return store.save(state)


def handle_close(store: GoalStore, args: argparse.Namespace) -> dict[str, Any]:
    state = store.load()
    if args.completion_status == "complete" and (state.get("remaining") or state.get("blockers")):
        raise ValueError("Cannot close goal as complete while remaining work or blockers still exist.")

    extend_unique(state["completionAudit"], args.audit)
    state["completionStatus"] = args.completion_status
    state["closedAt"] = now_iso()
    return store.save(state)


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    store = GoalStore(root=args.root.resolve())

    try:
        if args.command == "open":
            result = handle_open(store, args)
        elif args.command == "status":
            result = handle_status(store, args)
        elif args.command == "next":
            result = handle_next(store, args)
        elif args.command == "update":
            result = handle_update(store, args)
        elif args.command == "close":
            result = handle_close(store, args)
        else:
            parser.error(f"Unknown command: {args.command}")
            return 2
    except (FileNotFoundError, ValueError) as error:
        print_json({
            "ok": False,
            "error": str(error),
        })
        return 1

    print_json(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())