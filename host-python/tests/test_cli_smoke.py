from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
HOST_ROOT = REPO_ROOT / "host-python"


class HostCliSmokeTest(unittest.TestCase):
    def _run_cli(self, workspace: str, *args: str, expected_code: int = 0) -> dict[str, object]:
        env = os.environ.copy()
        existing_pythonpath = env.get("PYTHONPATH", "")
        env["PYTHONPATH"] = os.pathsep.join(filter(None, [str(HOST_ROOT), existing_pythonpath]))
        env["BOOK_AGENT_DISABLE_MODEL"] = "1"

        completed = subprocess.run(
            [sys.executable, "-m", "book_hermes_host.cli", *args],
            text=True,
            capture_output=True,
            cwd=workspace,
            env=env,
        )

        self.assertEqual(completed.returncode, expected_code, completed.stderr or completed.stdout)
        return json.loads(completed.stdout)

    def test_list_tools_via_host_cli(self) -> None:
        with tempfile.TemporaryDirectory(prefix="book-agent-cli-") as workspace:
            result = self._run_cli(workspace, "list-tools")
            self.assertIn("plugins", result)
            self.assertIn("book", result["plugins"])
            self.assertIn("create_book", result["tools"])
            self.assertIn("run_interaction", result["tools"])

    def test_create_book_via_host_cli(self) -> None:
        with tempfile.TemporaryDirectory(prefix="book-agent-cli-create-") as workspace:
            result = self._run_cli(
                workspace,
                "create-book",
                "--title",
                "Terminal Harbor",
                "--genre",
                "mystery",
                "--platform",
                "qidian",
                "--author-intent",
                "Keep the case procedural and tense.",
                "--current-focus",
                "Open at the harbor crime scene.",
            )

            self.assertTrue(result["ok"])
            self.assertEqual(result["operation"], "create_book")
            book_id = result["data"]["book"]["id"]
            book_root = Path(workspace) / "projects" / book_id
            self.assertTrue((book_root / "book.json").exists())

    def test_write_next_via_host_cli(self) -> None:
        with tempfile.TemporaryDirectory(prefix="book-agent-cli-write-") as workspace:
            created = self._run_cli(
                workspace,
                "create-book",
                "--title",
                "Terminal Harbor",
                "--genre",
                "mystery",
                "--platform",
                "qidian",
            )
            book_id = created["data"]["book"]["id"]

            written = self._run_cli(
                workspace,
                "write-next",
                "--book-id",
                str(book_id),
                "--title",
                "Cold Wake",
            )

            self.assertTrue(written["ok"])
            self.assertEqual(written["operation"], "write_next")
            chapter_id = written["data"]["chapter"]["id"]
            chapter_path = Path(workspace) / "projects" / str(book_id) / "chapters" / f"{chapter_id}.md"
            self.assertTrue(chapter_path.exists())

    def test_cli_persists_active_book_session(self) -> None:
        with tempfile.TemporaryDirectory(prefix="book-agent-cli-session-") as workspace:
            created = self._run_cli(
                workspace,
                "create-book",
                "--title",
                "Session Harbor",
                "--genre",
                "thriller",
                "--platform",
                "tomato",
            )
            book_id = str(created["data"]["book"]["id"])

            status = self._run_cli(workspace, "session-status")
            self.assertEqual(status["activeBookId"], book_id)

            written = self._run_cli(
                workspace,
                "write-next",
                "--title",
                "Dock Heat",
            )
            self.assertTrue(written["ok"])
            self.assertEqual(written["operation"], "write_next")

            chatted = self._run_cli(
                workspace,
                "chat",
                "--prompt",
                "Summarize the immediate next beat.",
            )
            self.assertTrue(chatted["ok"])
            self.assertEqual(chatted["operation"], "run_interaction")
            self.assertEqual(chatted["data"]["book"]["id"], book_id)
