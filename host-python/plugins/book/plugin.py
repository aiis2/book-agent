from __future__ import annotations

from typing import Any, Callable

from book_hermes_host.bridge import invoke_request


TOOL_DESCRIPTIONS = {
    "develop_book": "Develop a book plan and record planning notes.",
    "create_book": "Create a new book workspace.",
    "run_interaction": "Run a freeform book interaction through the Node engine.",
    "write_next": "Write the next chapter draft.",
    "revise_chapter": "Revise an existing chapter.",
    "rename_entity": "Rename an entity across the book workspace.",
    "update_author_intent": "Update the book's author intent.",
    "update_current_focus": "Update the active writing focus.",
    "edit_truth_file": "Edit a truth file inside the book workspace.",
    "export_book": "Export the current book artifacts.",
    "short_fiction_run": "Generate a short-fiction side artifact.",
    "generate_cover": "Generate cover brief artifacts.",
}


def _build_handler(operation: str) -> Callable[..., dict[str, Any]]:
    def handler(payload: dict[str, Any], *, cwd: str | None = None) -> dict[str, Any]:
        return invoke_request(
            {
                "operation": operation,
                "payload": payload,
            },
            cwd=cwd,
        )

    return handler


def register(ctx) -> None:
    for name, description in TOOL_DESCRIPTIONS.items():
        ctx.register_tool(
            name=name,
            description=description,
            handler=_build_handler(name),
        )