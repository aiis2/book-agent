from __future__ import annotations

import argparse
import json
import sys
from typing import Any

from .plugin_loader import load_plugins
from .session_state import load_session, record_session_event


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="book-hermes")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("list-tools")

    run_tool = subparsers.add_parser("run-tool")
    run_tool.add_argument("tool")
    run_tool.add_argument("--payload-json", default="{}")

    subparsers.add_parser("session-status")

    create_book = subparsers.add_parser("create-book")
    create_book.add_argument("--title", required=True)
    create_book.add_argument("--genre", default="other")
    create_book.add_argument("--platform", default="other")
    create_book.add_argument("--author-intent", dest="author_intent", default="")
    create_book.add_argument("--current-focus", dest="current_focus", default="")

    write_next = subparsers.add_parser("write-next")
    write_next.add_argument("--book-id")
    write_next.add_argument("--title", required=True)
    write_next.add_argument("--prompt", default="")
    write_next.add_argument("--content", default="")

    chat = subparsers.add_parser("chat")
    chat.add_argument("--book-id")
    chat.add_argument("--prompt", required=True)

    agent = subparsers.add_parser("agent")
    agent.add_argument("--prompt", required=True)
    agent.add_argument("--book-id", dest="book_id")

    return parser


def _print_json(payload: dict[str, Any]) -> None:
    sys.stdout.write(f"{json.dumps(payload, indent=2, ensure_ascii=False)}\n")


def _handle_list_tools() -> int:
    registry, plugins = load_plugins()
    _print_json(
        {
            "plugins": [plugin.name for plugin in plugins],
            "tools": registry.tool_names(),
            "toolDetails": [
                {
                    "name": entry.name,
                    "plugin": entry.plugin,
                    "description": entry.description,
                }
                for entry in registry.list_tools()
            ],
        }
    )
    return 0


def _invoke_tool(tool_name: str, payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    registry, _plugins = load_plugins()
    try:
        result = registry.invoke(tool_name, payload, cwd=None)
    except KeyError:
        result = {
            "ok": False,
            "error": {
                "code": "UNKNOWN_TOOL",
                "message": f"Unknown tool: {tool_name}",
                "details": {},
            },
        }
        _print_json(result)
        return 1, result

    _print_json(result)
    if result.get("ok", False):
        record_session_event(cwd=None, tool_name=tool_name, payload=payload, result=result)
    return (0 if result.get("ok", False) else 1), result


def _resolve_book_id(explicit_book_id: str | None) -> str | None:
    if explicit_book_id:
        return explicit_book_id
    session = load_session()
    active_book_id = session.get("activeBookId")
    return active_book_id if isinstance(active_book_id, str) and active_book_id else None


def _missing_active_book_result() -> tuple[int, dict[str, Any]]:
    result = {
        "ok": False,
        "error": {
            "code": "NO_ACTIVE_BOOK",
            "message": "No active book in session. Create a book first or pass --book-id.",
            "details": {},
        },
    }
    _print_json(result)
    return 1, result


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "list-tools":
        return _handle_list_tools()

    if args.command == "session-status":
        _print_json(load_session())
        return 0

    if args.command == "run-tool":
        return _invoke_tool(args.tool, json.loads(args.payload_json))[0]

    if args.command == "create-book":
        return _invoke_tool(
            "create_book",
            {
                "title": args.title,
                "genre": args.genre,
                "platform": args.platform,
                "authorIntent": args.author_intent,
                "currentFocus": args.current_focus,
            },
        )[0]

    if args.command == "write-next":
        book_id = _resolve_book_id(args.book_id)
        if not book_id:
            return _missing_active_book_result()[0]
        payload = {
            "bookId": book_id,
            "title": args.title,
        }
        if args.prompt:
            payload["prompt"] = args.prompt
        if args.content:
            payload["content"] = args.content
        return _invoke_tool("write_next", payload)[0]

    if args.command == "chat":
        book_id = _resolve_book_id(args.book_id)
        if not book_id:
            return _missing_active_book_result()[0]
        return _invoke_tool(
            "run_interaction",
            {
                "bookId": book_id,
                "prompt": args.prompt,
            },
        )[0]

    if args.command == "agent":
        from .agent_loop import BookHermesAgent
        agent_instance = BookHermesAgent()
        book_id = _resolve_book_id(args.book_id)
        result = agent_instance.run_turn(args.prompt, book_id=book_id)
        _print_json(result)
        return 0 if result.get("ok") else 1

    parser.error(f"Unknown command: {args.command}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())