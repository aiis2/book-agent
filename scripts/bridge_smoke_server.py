from __future__ import annotations

import atexit
import json
import os
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
BRIDGE_SCRIPT = REPO_ROOT / 'host-python' / 'book_hermes_host' / 'bridge.py'
HTML_PAGE = REPO_ROOT / 'scripts' / 'bridge_smoke.html'


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class BrowserSmokeState:
    workspace_dir: tempfile.TemporaryDirectory[str] = field(
        default_factory=lambda: tempfile.TemporaryDirectory(prefix='book-agent-browser-')
    )
    current_book_id: str | None = None
    current_chapter_id: str | None = None
    operations: list[dict[str, Any]] = field(default_factory=list)

    @property
    def workspace(self) -> Path:
        return Path(self.workspace_dir.name)

    def reset(self) -> None:
        self.workspace_dir.cleanup()
        self.workspace_dir = tempfile.TemporaryDirectory(prefix='book-agent-browser-')
        self.current_book_id = None
        self.current_chapter_id = None
        self.operations.clear()

    def snapshot(self, last_event: dict[str, Any] | None = None) -> dict[str, Any]:
        return {
            'workspace': str(self.workspace),
            'currentBookId': self.current_book_id,
            'currentChapterId': self.current_chapter_id,
            'files': self.list_files(),
            'operations': self.operations[-20:],
            'lastEvent': last_event,
        }

    def list_files(self) -> list[str]:
        if not self.workspace.exists():
            return []

        files = []
        for path in sorted(self.workspace.rglob('*')):
            if path.is_file():
                files.append(path.relative_to(self.workspace).as_posix())
        return files

    def update_from_response(self, response: Any) -> None:
        if not isinstance(response, dict):
            return

        data = response.get('data')
        if not isinstance(data, dict):
            return

        book = data.get('book')
        if isinstance(book, dict) and isinstance(book.get('id'), str):
            self.current_book_id = book['id']

        chapter = data.get('chapter')
        if isinstance(chapter, dict) and isinstance(chapter.get('id'), str):
            self.current_chapter_id = chapter['id']

        delegated = data.get('result')
        if isinstance(delegated, dict):
            delegated_chapter = delegated.get('chapter')
            if isinstance(delegated_chapter, dict) and isinstance(delegated_chapter.get('id'), str):
                self.current_chapter_id = delegated_chapter['id']

    def record_operation(self, event: dict[str, Any]) -> None:
        summary = {
            'timestamp': event['timestamp'],
            'operation': event['request'].get('operation'),
            'exitCode': event['exitCode'],
            'ok': event['exitCode'] == 0,
        }
        self.operations.append(summary)
        self.operations[:] = self.operations[-20:]

    def close(self) -> None:
        self.workspace_dir.cleanup()


STATE = BrowserSmokeState()
atexit.register(STATE.close)


def run_bridge_request(request: dict[str, Any]) -> dict[str, Any]:
    completed = subprocess.run(
        [sys.executable, str(BRIDGE_SCRIPT)],
        input=json.dumps(request),
        text=True,
        capture_output=True,
        cwd=STATE.workspace,
        env={
            **os.environ,
            'BOOK_AGENT_DISABLE_MODEL': '1',
        },
    )

    stdout = completed.stdout.strip()
    response: Any = None
    if stdout:
        try:
            response = json.loads(stdout)
        except json.JSONDecodeError:
            response = {'rawStdout': stdout}

    if response is not None:
        STATE.update_from_response(response)

    event = {
        'timestamp': utc_now(),
        'request': request,
        'exitCode': completed.returncode,
        'stderr': completed.stderr.strip(),
        'response': response,
    }
    STATE.record_operation(event)

    snapshot = STATE.snapshot(last_event=event)
    snapshot['ok'] = completed.returncode == 0
    return snapshot


class BrowserSmokeHandler(BaseHTTPRequestHandler):
    server_version = 'BookHermesBrowserSmoke/0.1'

    def do_GET(self) -> None:
        if self.path in {'/', '/index.html'}:
            self._send_html(HTML_PAGE.read_text(encoding='utf-8'))
            return

        if self.path == '/api/state':
            self._send_json(HTTPStatus.OK, STATE.snapshot())
            return

        self._send_json(HTTPStatus.NOT_FOUND, {'error': 'Not found'})

    def do_POST(self) -> None:
        if self.path == '/api/reset':
            STATE.reset()
            self._send_json(HTTPStatus.OK, STATE.snapshot())
            return

        if self.path == '/api/bridge':
            body = self._read_json_body()
            if not isinstance(body, dict):
                self._send_json(HTTPStatus.BAD_REQUEST, {'error': 'JSON object body is required'})
                return

            if not isinstance(body.get('operation'), str):
                self._send_json(HTTPStatus.BAD_REQUEST, {'error': 'operation is required'})
                return

            payload = body.get('payload')
            if payload is None:
                body['payload'] = {}

            self._send_json(HTTPStatus.OK, run_bridge_request(body))
            return

        self._send_json(HTTPStatus.NOT_FOUND, {'error': 'Not found'})

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _read_json_body(self) -> Any:
        length = int(self.headers.get('Content-Length', '0'))
        if length <= 0:
            return {}

        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode('utf-8'))
        except json.JSONDecodeError:
            return None

    def _send_html(self, content: str) -> None:
        encoded = content.encode('utf-8')
        self.send_response(HTTPStatus.OK)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _send_json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        encoded = json.dumps(payload, ensure_ascii=False, indent=2).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


def main(argv: list[str]) -> int:
    host = '127.0.0.1'
    port = 8765
    if len(argv) > 1:
        port = int(argv[1])

    server = ThreadingHTTPServer((host, port), BrowserSmokeHandler)
    print(f'Book Hermes browser smoke server listening at http://{host}:{port}')
    print(f'Workspace: {STATE.workspace}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv))