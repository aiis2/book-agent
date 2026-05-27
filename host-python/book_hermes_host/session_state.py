from __future__ import annotations

import json
from pathlib import Path
from typing import Any


SESSION_FILE_NAME = ".book-hermes-session.json"


def session_file(cwd: str | Path | None = None) -> Path:
    root = Path(cwd) if cwd is not None else Path.cwd()
    return root / SESSION_FILE_NAME


def load_session(cwd: str | Path | None = None) -> dict[str, Any]:
    path = session_file(cwd)
    if not path.exists():
        return {
            "activeBookId": None,
            "history": [],
        }

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {
            "activeBookId": None,
            "history": [],
        }


def save_session(session: dict[str, Any], cwd: str | Path | None = None) -> None:
    path = session_file(cwd)
    path.write_text(f"{json.dumps(session, indent=2, ensure_ascii=False)}\n", encoding="utf-8")


def record_session_event(
    *,
    cwd: str | Path | None = None,
    tool_name: str,
    payload: dict[str, Any],
    result: dict[str, Any],
) -> dict[str, Any]:
    session = load_session(cwd)
    data = result.get("data") if isinstance(result, dict) else None
    book_id = None
    if isinstance(data, dict):
        book = data.get("book")
        if isinstance(book, dict) and isinstance(book.get("id"), str):
            book_id = book["id"]
    if book_id is None and isinstance(payload.get("bookId"), str):
        book_id = payload["bookId"]

    if book_id is not None:
        session["activeBookId"] = book_id

    history = session.get("history")
    if not isinstance(history, list):
        history = []
    history.append(
        {
            "tool": tool_name,
            "bookId": book_id,
            "ok": bool(result.get("ok")) if isinstance(result, dict) else False,
        }
    )
    session["history"] = history[-20:]
    save_session(session, cwd)
    return session