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


test('run_interaction persists an upstream-style transcript stream', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'book-agent-node-transcript-'));

  const created = runBridge(workspace, {
    operation: 'create_book',
    payload: {
      title: 'Transcript Harbor',
      genre: 'mystery',
      platform: 'qidian',
    },
  });

  const bookId = created.data.book.id;
  runBridge(workspace, {
    operation: 'run_interaction',
    payload: {
      bookId,
      prompt: 'Summarize the immediate next beat for Vale.',
    },
  });

  const transcriptPath = join(workspace, '.inkos', 'sessions', `${bookId}.jsonl`);
  assert.equal(existsSync(transcriptPath), true);

  const transcript = readFileSync(transcriptPath, 'utf8');
  assert.equal(transcript.includes('"type":"request_started"'), true);
  assert.equal(transcript.includes('"type":"message"'), true);
  assert.equal(transcript.includes('"role":"assistant"'), true);
  assert.equal(transcript.includes('"type":"request_committed"'), true);
});