from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
BRIDGE_SCRIPT = REPO_ROOT / "host-python" / "book_hermes_host" / "bridge.py"


class BridgeSmokeTest(unittest.TestCase):
    def _run_bridge(self, workspace: str, request: dict[str, object], expected_code: int = 0) -> dict[str, object]:
        env = os.environ.copy()
        env["BOOK_AGENT_DISABLE_MODEL"] = "1"
        completed = subprocess.run(
            [sys.executable, str(BRIDGE_SCRIPT)],
            input=json.dumps(request),
            text=True,
            capture_output=True,
            cwd=workspace,
            env=env,
        )

        self.assertEqual(completed.returncode, expected_code, completed.stderr or completed.stdout)
        return json.loads(completed.stdout)

    def test_create_book_through_bridge(self) -> None:
        with tempfile.TemporaryDirectory(prefix="book-agent-bridge-") as workspace:
            result = self._run_bridge(
                workspace,
                {
                    "operation": "create_book",
                    "payload": {
                        "title": "Night Harbor",
                        "genre": "mystery",
                        "platform": "qidian",
                        "authorIntent": "Keep the harbor mystery cold and restrained.",
                        "currentFocus": "Establish the murder scene and the lead investigator.",
                    },
                },
            )
            self.assertTrue(result["ok"])
            self.assertEqual(result["operation"], "create_book")

            book_id = result["data"]["book"]["id"]
            book_root = Path(workspace) / "projects" / book_id
            self.assertTrue((book_root / "book.json").exists())
            self.assertTrue((book_root / "story" / "author_intent.md").exists())
            self.assertTrue((book_root / "story" / "current_focus.md").exists())
            self.assertTrue((book_root / "chapters" / "index.json").exists())

    def test_full_workflow_through_bridge(self) -> None:
        with tempfile.TemporaryDirectory(prefix="book-agent-bridge-flow-") as workspace:
            created = self._run_bridge(
                workspace,
                {
                    "operation": "create_book",
                    "payload": {
                        "title": "Glass Harbor",
                        "genre": "thriller",
                        "platform": "tomato",
                        "authorIntent": "Keep Mara brilliant, ruthless, and emotionally legible.",
                        "currentFocus": "Mara tracks the missing ledger to the customs archive.",
                    },
                },
            )
            book_id = created["data"]["book"]["id"]

            updated_focus = self._run_bridge(
                workspace,
                {
                    "operation": "update_current_focus",
                    "payload": {
                        "bookId": book_id,
                        "content": "Mara must reach the archive before the harbormaster destroys the proof.",
                    },
                },
            )
            self.assertIn("archive", updated_focus["data"]["currentFocus"])

            chapter = self._run_bridge(
                workspace,
                {
                    "operation": "write_next",
                    "payload": {
                        "bookId": book_id,
                        "title": "Archive Fire",
                        "content": "Mara enters the archive and realizes the fire has already been set.",
                        "summary": "Mara reaches the archive as the fire starts.",
                    },
                },
            )
            chapter_id = chapter["data"]["chapter"]["id"]
            self.assertEqual(chapter["data"]["chapter"]["status"], "draft")

            revised = self._run_bridge(
                workspace,
                {
                    "operation": "revise_chapter",
                    "payload": {
                        "bookId": book_id,
                        "chapterId": chapter_id,
                        "revisedContent": "Mara reaches the archive, smells fuel, and sees the harbormaster lock the doors from outside.",
                    },
                },
            )
            self.assertEqual(revised["data"]["chapter"]["revision"], 2)

            exported = self._run_bridge(
                workspace,
                {
                    "operation": "export_book",
                    "payload": {
                        "bookId": book_id,
                    },
                },
            )
            self.assertTrue(Path(exported["data"]["exports"]["manuscriptPath"]).exists())
            self.assertTrue(Path(exported["data"]["exports"]["bundlePath"]).exists())

            cover = self._run_bridge(
                workspace,
                {
                    "operation": "generate_cover",
                    "payload": {
                        "bookId": book_id,
                        "style": "paperback thriller concept",
                    },
                },
            )
            self.assertTrue(Path(cover["data"]["paths"]["coverBriefPath"]).exists())
            self.assertTrue(Path(cover["data"]["paths"]["coverPromptPath"]).exists())


if __name__ == "__main__":
    unittest.main()