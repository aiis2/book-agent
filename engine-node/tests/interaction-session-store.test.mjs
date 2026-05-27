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


test('run_interaction persists an upstream-aligned interaction session snapshot', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'book-agent-node-interaction-session-'));
  const created = runBridge(workspace, {
    operation: 'create_book',
    payload: {
      title: 'Session Harbor',
      genre: 'mystery',
      platform: 'qidian',
    },
  });

  const bookId = created.data.book.id;
  runBridge(workspace, {
    operation: 'run_interaction',
    payload: {
      bookId,
      prompt: 'Summarize the next narrative beat around the forged ledger.',
    },
  });

  const sessionPath = join(workspace, '.inkos', 'session.json');
  assert.equal(existsSync(sessionPath), true);

  const session = JSON.parse(readFileSync(sessionPath, 'utf8'));
  assert.equal(session.activeBookId, bookId);
  assert.equal(session.automationMode, 'semi');
  assert.equal(typeof session.sessionId, 'string');
  assert.equal(session.projectRoot, workspace);
  assert.equal(Array.isArray(session.messages), true);
  assert.equal(session.messages.length >= 2, true);
  assert.equal(session.messages.at(-2)?.role, 'user');
  assert.equal(session.messages.at(-1)?.role, 'assistant');
  assert.equal(session.currentExecution?.status, 'completed');
});


test('manual delegated interaction persists a pending decision for the next human step', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'book-agent-node-interaction-manual-'));
  const created = runBridge(workspace, {
    operation: 'create_book',
    payload: {
      title: 'Manual Harbor',
      genre: 'mystery',
      platform: 'qidian',
    },
  });

  const bookId = created.data.book.id;
  runBridge(workspace, {
    operation: 'run_interaction',
    payload: {
      bookId,
      automationMode: 'manual',
      action: 'update_current_focus',
      prompt: 'Move the next beat toward the archive fire.',
      actionPayload: {
        content: 'The detective reaches the archive as the first shelf catches fire.',
      },
    },
  });

  const session = JSON.parse(readFileSync(join(workspace, '.inkos', 'session.json'), 'utf8'));
  assert.equal(session.automationMode, 'manual');
  assert.equal(session.pendingDecision?.kind, 'review-next-step');
  assert.equal(session.pendingDecision?.bookId, bookId);
  assert.equal(session.currentExecution?.status, 'waiting_human');
});