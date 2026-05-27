"""Smoke tests for the BookHermesAgent agent loop."""

from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

# Ensure the host package is importable.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from book_hermes_host.agent_loop import (
    BOOK_AGENT_TOOLS,
    BookHermesAgent,
    load_model_config,
)


class AgentLoopConfigTest(unittest.TestCase):
    def test_tool_definitions_are_valid(self):
        self.assertIsInstance(BOOK_AGENT_TOOLS, list)
        self.assertGreater(len(BOOK_AGENT_TOOLS), 0)
        for tool in BOOK_AGENT_TOOLS:
            self.assertEqual(tool["type"], "function")
            fn = tool["function"]
            self.assertIn("name", fn)
            self.assertIn("description", fn)
            self.assertIn("parameters", fn)
            self.assertEqual(fn["parameters"]["type"], "object")

    def test_all_expected_operations_covered(self):
        names = {tool["function"]["name"] for tool in BOOK_AGENT_TOOLS}
        expected = {
            "create_book",
            "write_next",
            "revise_chapter",
            "run_interaction",
            "export_book",
            "update_author_intent",
            "update_current_focus",
            "develop_book",
            "short_fiction_run",
            "generate_cover",
            "rename_entity",
        }
        self.assertTrue(expected.issubset(names))

    def test_load_model_config_disabled(self):
        with patch.dict(os.environ, {"BOOK_AGENT_DISABLE_MODEL": "1"}, clear=False):
            config = load_model_config()
        self.assertTrue(config["disabled"])
        self.assertFalse(config["enabled"])

    def test_load_model_config_precedence(self):
        with patch.dict(
            os.environ,
            {
                "BOOK_AGENT_API_KEY": "priority-key",
                "DEEPSEEK_API_KEY": "fallback-key",
                "API_KEY": "last-resort-key",
                "BOOK_AGENT_DISABLE_MODEL": "0",
            },
            clear=False,
        ):
            config = load_model_config()
        self.assertEqual(config["api_key"], "priority-key")


class AgentLoopDisabledModeTest(unittest.TestCase):
    def _run_disabled(self, prompt: str, book_id: str | None = None) -> dict:
        with patch.dict(os.environ, {"BOOK_AGENT_DISABLE_MODEL": "1"}, clear=False):
            agent = BookHermesAgent()
            return agent.run_turn(prompt, book_id=book_id)

    def test_disabled_mode_returns_ok(self):
        result = self._run_disabled("What should the protagonist do next?")
        self.assertTrue(result["ok"])
        self.assertIn("response", result)
        self.assertIsInstance(result["response"], str)
        self.assertGreater(len(result["response"]), 0)

    def test_disabled_mode_with_book_id(self):
        result = self._run_disabled("Write the opening scene.", book_id="my-novel")
        self.assertTrue(result["ok"])
        self.assertEqual(result["toolCallsCount"], 0)

    def test_disabled_mode_history_preserved(self):
        history = [{"role": "user", "content": "previous turn"}]
        result = self._run_disabled("Next prompt.", book_id=None)
        # result should include the new user message appended to history
        self.assertTrue(result["ok"])
        messages = result["messages"]
        user_msgs = [m for m in messages if m.get("role") == "user"]
        self.assertGreater(len(user_msgs), 0)


class AgentLoopCliTest(unittest.TestCase):
    def test_cli_agent_command_disabled_mode(self):
        """The `agent` CLI command should succeed with BOOK_AGENT_DISABLE_MODEL=1."""
        import json
        import io
        from contextlib import redirect_stdout
        from book_hermes_host.cli import main

        buf = io.StringIO()
        with (
            patch.dict(os.environ, {"BOOK_AGENT_DISABLE_MODEL": "1"}, clear=False),
            redirect_stdout(buf),
        ):
            exit_code = main([
                "agent",
                "--prompt", "Summarise the active book",
            ])

        self.assertEqual(exit_code, 0)
        output = buf.getvalue()
        payload = json.loads(output)
        self.assertTrue(payload["ok"])


if __name__ == "__main__":
    unittest.main()
