from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
GOAL_DRIVER = REPO_ROOT / "scripts" / "goal_driver.py"


class GoalDriverSmokeTest(unittest.TestCase):
    def _run_goal_driver(self, root: Path, *args: str, expected_code: int = 0) -> dict[str, object]:
        completed = subprocess.run(
            [sys.executable, str(GOAL_DRIVER), "--root", str(root), *args],
            text=True,
            capture_output=True,
        )

        self.assertEqual(completed.returncode, expected_code, completed.stderr or completed.stdout)
        return json.loads(completed.stdout)

    def test_goal_driver_initializes_status_and_next_step(self) -> None:
        with tempfile.TemporaryDirectory(prefix="book-agent-goal-") as temp_root:
            root = Path(temp_root)
            (root / "docs" / "plans").mkdir(parents=True)

            opened = self._run_goal_driver(
                root,
                "open",
                "--objective",
                "Complete the full Book Hermes migration.",
                "--requirement",
                "Persist an active goal locally when Copilot goal tools are unavailable.",
                "--requirement",
                "Pick a real upstream migration slice and implement it.",
                "--remaining",
                "Create local goal persistence driver",
                "--remaining",
                "Implement next upstream migration slice",
            )

            self.assertEqual(opened["objective"], "Complete the full Book Hermes migration.")
            self.assertEqual(opened["completionStatus"], "open")
            self.assertEqual(opened["remaining"][0], "Create local goal persistence driver")

            status = self._run_goal_driver(root, "status")
            self.assertEqual(status["requirements"][0], "Persist an active goal locally when Copilot goal tools are unavailable.")
            self.assertEqual(status["remaining"][1], "Implement next upstream migration slice")

            next_step = self._run_goal_driver(root, "next")
            self.assertEqual(next_step["nextStep"], "Create local goal persistence driver")
            self.assertEqual(next_step["hasBlockers"], False)