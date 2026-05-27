"""BookHermesAgent — Hermes-derived multi-turn agent loop for the Python host.

Adapts the Hermes run_conversation / AIAgent pattern:
  - Loads model config from .env with the same key-precedence as engine-node.
  - Defines OpenAI-compatible tool schemas for all bridge operations.
  - Drives one agent turn: user message → model call → tool dispatch loop → final response.
  - Executes tools by routing to the Node bridge via bridge.invoke_request.
  - When BOOK_AGENT_DISABLE_MODEL=1 returns a deterministic canned response for tests.
  - No external runtime dependencies beyond the Python stdlib.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_BASE_URL = "https://api.deepseek.com/v1"
_DEFAULT_MODEL = "deepseek-chat"
_MAX_TOOL_ITERATIONS = 12

# ---------------------------------------------------------------------------
# Environment + config helpers (mirrors engine-node model-client.mjs)
# ---------------------------------------------------------------------------

def _load_dot_env() -> dict[str, str]:
    """Load the repo-root .env file; os.environ keys override."""
    env: dict[str, str] = {}
    env_path = REPO_ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            if "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            env[key.strip()] = value.strip().strip("\"'")
    return {**env, **os.environ}


def _first_non_empty(*values: str | None) -> str:
    for v in values:
        if isinstance(v, str) and v.strip():
            return v.strip()
    return ""


def load_model_config() -> dict[str, Any]:
    """Return the model configuration dict with the same precedence as engine-node."""
    env = _load_dot_env()
    disabled_str = env.get("BOOK_AGENT_DISABLE_MODEL", "")
    disabled = disabled_str.strip().lower() in ("1", "true", "yes", "on")
    api_key = _first_non_empty(
        env.get("BOOK_AGENT_API_KEY"),
        env.get("DEEPSEEK_API_KEY"),
        env.get("API_KEY"),
    )
    base_url = _first_non_empty(
        env.get("BOOK_AGENT_MODEL_BASE_URL"),
        env.get("DEEPSEEK_BASE_URL"),
        _DEFAULT_BASE_URL,
    ).rstrip("/")
    model = _first_non_empty(
        env.get("BOOK_AGENT_MODEL"),
        env.get("DEEPSEEK_MODEL"),
        _DEFAULT_MODEL,
    )
    return {
        "enabled": not disabled and bool(api_key),
        "disabled": disabled,
        "api_key": api_key,
        "base_url": base_url,
        "model": model,
    }


# ---------------------------------------------------------------------------
# OpenAI-compatible tool definitions (all supported bridge operations)
# ---------------------------------------------------------------------------

BOOK_AGENT_TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "create_book",
            "description": "Create a new novel workspace. Returns the book ID and initial metadata.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Novel title"},
                    "genre": {"type": "string", "description": "Genre e.g. mystery, romance, fantasy"},
                    "platform": {"type": "string", "description": "Publishing platform e.g. qidian, tomato, feilu, other"},
                    "authorIntent": {"type": "string", "description": "Author creative intent and goals"},
                    "currentFocus": {"type": "string", "description": "Current scene or chapter focus"},
                },
                "required": ["title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "write_next",
            "description": "Write the next chapter using the AI model. Returns the new chapter with generated content.",
            "parameters": {
                "type": "object",
                "properties": {
                    "bookId": {"type": "string"},
                    "title": {"type": "string"},
                    "prompt": {"type": "string", "description": "Creative direction for this chapter"},
                },
                "required": ["bookId", "title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "revise_chapter",
            "description": "Revise an existing chapter using the AI model based on an instruction.",
            "parameters": {
                "type": "object",
                "properties": {
                    "bookId": {"type": "string"},
                    "chapterId": {"type": "string"},
                    "instruction": {"type": "string"},
                },
                "required": ["bookId", "chapterId", "instruction"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_interaction",
            "description": "Chat with the AI about the book — get suggestions, creative guidance, or analysis.",
            "parameters": {
                "type": "object",
                "properties": {
                    "bookId": {"type": "string"},
                    "prompt": {"type": "string"},
                },
                "required": ["bookId", "prompt"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "export_book",
            "description": "Export the book to manuscript.md and book-export.json under the exports folder.",
            "parameters": {
                "type": "object",
                "properties": {"bookId": {"type": "string"}},
                "required": ["bookId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_author_intent",
            "description": "Update the author creative intent statement for the book.",
            "parameters": {
                "type": "object",
                "properties": {
                    "bookId": {"type": "string"},
                    "authorIntent": {"type": "string"},
                },
                "required": ["bookId", "authorIntent"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_current_focus",
            "description": "Update the current story focus — what the writer is working on next.",
            "parameters": {
                "type": "object",
                "properties": {
                    "bookId": {"type": "string"},
                    "currentFocus": {"type": "string"},
                },
                "required": ["bookId", "currentFocus"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "develop_book",
            "description": "Run a book development step — logs story progression notes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "bookId": {"type": "string"},
                    "prompt": {"type": "string"},
                },
                "required": ["bookId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "short_fiction_run",
            "description": "Generate a short side-story or spin-off piece for the book.",
            "parameters": {
                "type": "object",
                "properties": {
                    "bookId": {"type": "string"},
                    "title": {"type": "string"},
                    "prompt": {"type": "string"},
                },
                "required": ["bookId", "title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_cover",
            "description": "Generate a cover brief and AI-ready image prompt for the book.",
            "parameters": {
                "type": "object",
                "properties": {
                    "bookId": {"type": "string"},
                    "style": {"type": "string"},
                    "mood": {"type": "string"},
                },
                "required": ["bookId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "rename_entity",
            "description": "Rename a character, location, or entity across all story files.",
            "parameters": {
                "type": "object",
                "properties": {
                    "bookId": {"type": "string"},
                    "oldName": {"type": "string"},
                    "newName": {"type": "string"},
                },
                "required": ["bookId", "oldName", "newName"],
            },
        },
    },
]

_SYSTEM_PROMPT = """\
You are Book Hermes Agent, an AI writing assistant that manages novel workspaces for authors.

You have access to a complete set of tools for book management:
- create_book: Start a new novel workspace
- write_next: Generate the next chapter with AI
- revise_chapter: Revise an existing chapter
- run_interaction: Chat about the book for suggestions and guidance
- export_book: Export the full manuscript
- update_author_intent / update_current_focus: Update editorial direction
- develop_book: Advance the story development log
- short_fiction_run: Write a side story or spin-off
- generate_cover: Create a cover brief and image prompt
- rename_entity: Rename a character or location across all story files

When the user asks you to perform a book operation, use the appropriate tool.
When a book ID is needed but not given, ask the user which book to use.
Always confirm when a writing or generation task completes by summarising what was produced.
"""


# ---------------------------------------------------------------------------
# API and tool execution
# ---------------------------------------------------------------------------

def _call_api(
    config: dict[str, Any],
    messages: list[dict[str, Any]],
    *,
    use_tools: bool = True,
) -> dict[str, Any]:
    """Make a single OpenAI-compatible chat completion request via urllib."""
    body: dict[str, Any] = {
        "model": config["model"],
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 4096,
    }
    if use_tools:
        body["tools"] = BOOK_AGENT_TOOLS
        body["tool_choice"] = "auto"

    data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url=f"{config['base_url']}/chat/completions",
        data=data,
        headers={
            "Authorization": f"Bearer {config['api_key']}",
            "Content-Type": "application/json",
            "User-Agent": "Book-Hermes-Agent/0.1",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        try:
            msg = json.loads(raw).get("error", {}).get("message", raw)
        except json.JSONDecodeError:
            msg = raw
        raise RuntimeError(f"Model API error {exc.code}: {msg}") from exc


def _execute_tool(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    """Route a tool call to the appropriate bridge operation."""
    from .bridge import invoke_request  # local import to avoid circular issues

    _direct_ops = {
        "create_book",
        "write_next",
        "revise_chapter",
        "export_book",
        "update_author_intent",
        "update_current_focus",
        "develop_book",
        "short_fiction_run",
        "generate_cover",
        "rename_entity",
    }
    if name in _direct_ops:
        return invoke_request({"operation": name, "payload": arguments})

    if name == "run_interaction":
        return invoke_request({
            "operation": "run_interaction",
            "payload": {
                "bookId": arguments.get("bookId"),
                "prompt": arguments.get("prompt"),
            },
        })

    return {
        "ok": False,
        "error": {"code": "UNKNOWN_TOOL", "message": f"No bridge route for tool: {name}"},
    }


# ---------------------------------------------------------------------------
# BookHermesAgent
# ---------------------------------------------------------------------------

class BookHermesAgent:
    """Minimal Hermes-derived agent with multi-turn tool-calling loop.

    Adapts the Hermes run_conversation / AIAgent pattern to the Book Hermes
    domain: builds a book-specific system prompt, calls the DeepSeek-compatible
    model, dispatches tool calls to the Node bridge, and returns the final
    assistant response.
    """

    def __init__(self) -> None:
        self.config = load_model_config()

    def run_turn(
        self,
        user_message: str,
        *,
        book_id: str | None = None,
        history: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Drive one agent turn from a user message to the final response.

        Returns a dict with:
          ok: bool
          response: str          (final assistant text, when ok=True)
          messages: list         (updated conversation history)
          usage: dict | None     (token usage from the last model call)
          model: str             (model that was used)
          toolCallsCount: int    (number of tool-call iterations performed)
          error: dict | None     (when ok=False)
        """
        if self.config["disabled"]:
            return {
                "ok": True,
                "response": "[Model disabled — Book Hermes Agent running in smoke-test mode]",
                "messages": list(history or []) + [
                    {"role": "user", "content": user_message},
                    {"role": "assistant", "content": "[Model disabled — Book Hermes Agent running in smoke-test mode]"},
                ],
                "usage": None,
                "model": self.config["model"],
                "toolCallsCount": 0,
            }

        if not self.config["enabled"]:
            return {
                "ok": False,
                "error": {
                    "code": "NO_MODEL",
                    "message": "No API key configured. Set API_KEY or DEEPSEEK_API_KEY in .env.",
                },
                "messages": list(history or []),
                "toolCallsCount": 0,
            }

        system = _SYSTEM_PROMPT
        if book_id:
            system += f"\n\nActive book ID: {book_id}"

        messages: list[dict[str, Any]] = list(history or [])
        messages.append({"role": "user", "content": user_message})

        for iteration in range(_MAX_TOOL_ITERATIONS):
            response = _call_api(
                self.config,
                [{"role": "system", "content": system}, *messages],
            )
            choice = response["choices"][0]
            message = choice["message"]
            finish_reason = choice.get("finish_reason", "")

            if finish_reason == "stop" or not message.get("tool_calls"):
                messages.append(message)
                return {
                    "ok": True,
                    "response": message.get("content") or "",
                    "messages": messages,
                    "usage": response.get("usage"),
                    "model": self.config["model"],
                    "toolCallsCount": iteration,
                }

            # Process all tool calls in this response batch.
            messages.append(message)
            for tool_call in message.get("tool_calls", []):
                fn = tool_call.get("function", {})
                tool_name = fn.get("name", "")
                try:
                    arguments = json.loads(fn.get("arguments") or "{}")
                except json.JSONDecodeError:
                    arguments = {}

                result = _execute_tool(tool_name, arguments)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call["id"],
                    "content": json.dumps(result, ensure_ascii=False),
                })

        return {
            "ok": False,
            "error": {
                "code": "MAX_ITERATIONS",
                "message": f"Reached {_MAX_TOOL_ITERATIONS} tool-call iterations without a final response.",
            },
            "messages": messages,
            "toolCallsCount": _MAX_TOOL_ITERATIONS,
        }
