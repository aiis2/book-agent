import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';


const repoRoot = resolve(import.meta.dirname, '..', '..');
const bridgeEntry = resolve(repoRoot, 'engine-node', 'src', 'adapters', 'bridge-entry.mjs');


function runBridge(workspace, request, expectedStatus = 0) {
  const completed = spawnSync(process.execPath, [bridgeEntry], {
    cwd: workspace,
    input: JSON.stringify(request),
    encoding: 'utf8',
    env: {
      ...process.env,
      BOOK_AGENT_DISABLE_MODEL: '1',
    },
  });

  assert.equal(completed.status, expectedStatus, completed.stderr || completed.stdout);
  return JSON.parse(completed.stdout);
}


test('create_book persists a minimal upstream-style global session file', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'book-agent-node-global-session-'));
  const created = runBridge(workspace, {
    operation: 'create_book',
    payload: {
      title: 'Session Harbor',
      genre: 'mystery',
      platform: 'qidian',
    },
  });

  const bookId = created.data.book.id;
  const sessionPath = join(workspace, '.inkos', 'session.json');
  assert.equal(existsSync(sessionPath), true);

  const globalSession = JSON.parse(readFileSync(sessionPath, 'utf8'));
  assert.equal(globalSession.activeBookId, bookId);
  assert.equal(globalSession.automationMode, 'semi');
});