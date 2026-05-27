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


function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}


test('write and revise persist InkOS-style runtime state and chapter snapshots', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'book-agent-runtime-state-'));
  const created = runBridge(workspace, {
    operation: 'create_book',
    payload: {
      title: 'Glass Meridian',
      genre: 'fantasy',
      platform: 'qidian',
      authorIntent: 'Keep the artifact mystery emotionally grounded.',
      currentFocus: 'Lian finds the glass compass in the flooded observatory.',
    },
  });
  const bookId = created.data.book.id;
  const bookRoot = join(workspace, 'projects', bookId);
  const stateRoot = join(bookRoot, 'story', 'state');

  assert.equal(existsSync(join(stateRoot, 'manifest.json')), true);
  assert.equal(existsSync(join(stateRoot, 'current_state.json')), true);
  assert.equal(existsSync(join(stateRoot, 'hooks.json')), true);
  assert.equal(existsSync(join(stateRoot, 'chapter_summaries.json')), true);
  assert.equal(readJson(join(stateRoot, 'manifest.json')).schemaVersion, 2);
  assert.equal(readJson(join(stateRoot, 'manifest.json')).lastAppliedChapter, 0);

  const written = runBridge(workspace, {
    operation: 'write_next',
    payload: {
      bookId,
      title: 'Flooded Observatory',
      content: 'Lian finds the glass compass and hears her missing brother through the brass needle.',
      summary: 'Lian discovers the compass and the first signal from her brother.',
      nextFocus: 'Lian must decide whether to follow the compass below the city.',
      characters: ['Lian'],
      runtimeState: {
        currentStatePatch: {
          currentLocation: 'Flooded observatory',
          protagonistState: 'Lian is shaken but decisive.',
        },
        hookOps: {
          upsert: [{
            hookId: 'glass-compass',
            type: 'artifact mystery',
            expectedPayoff: 'Reveal why the compass carries her brother voice.',
            payoffTiming: 'mid-arc',
            promoted: true,
          }],
          mention: ['glass-compass'],
        },
        chapterSummary: {
          mood: 'wonder under pressure',
          chapterType: 'discovery',
        },
      },
    },
  });

  assert.equal(written.ok, true);
  assert.equal(written.data.runtimeState.manifest.lastAppliedChapter, 1);
  assert.equal(written.data.runtimeState.currentState.chapter, 1);
  assert.equal(written.data.runtimeState.hooks.hooks[0].hookId, 'glass-compass');
  assert.equal(written.data.runtimeState.hooks.hooks[0].status, 'progressing');

  const manifest = readJson(join(stateRoot, 'manifest.json'));
  const currentState = readJson(join(stateRoot, 'current_state.json'));
  const hooks = readJson(join(stateRoot, 'hooks.json'));
  const summaries = readJson(join(stateRoot, 'chapter_summaries.json'));
  assert.equal(manifest.lastAppliedChapter, 1);
  assert.equal(currentState.facts.some((fact) => fact.predicate === 'Current Location' && fact.object === 'Flooded observatory'), true);
  assert.equal(hooks.hooks.some((hook) => hook.hookId === 'glass-compass' && hook.promoted === true), true);
  assert.equal(summaries.rows.length, 1);
  assert.equal(summaries.rows[0].characters, 'Lian');
  assert.equal(summaries.rows[0].mood, 'wonder under pressure');
  assert.equal(existsSync(join(bookRoot, 'story', 'current_state.md')), true);
  assert.equal(existsSync(join(bookRoot, 'story', 'pending_hooks.md')), true);
  assert.equal(existsSync(join(bookRoot, 'story', 'chapter_summaries.md')), true);
  assert.equal(existsSync(join(bookRoot, 'story', 'snapshots', '1', 'state', 'manifest.json')), true);
  assert.equal(existsSync(join(bookRoot, 'story', 'snapshots', '1', 'current_state.md')), true);

  const revised = runBridge(workspace, {
    operation: 'revise_chapter',
    payload: {
      bookId,
      chapterId: written.data.chapter.id,
      revisedContent: 'Lian studies the glass compass, follows the drowned needle, and hears her brother name.',
      summary: 'Lian accepts the compass call after hearing her brother.',
      runtimeState: {
        currentStatePatch: {
          currentGoal: 'Follow the compass below the city.',
        },
        hookOps: {
          resolve: ['glass-compass'],
        },
        chapterSummary: {
          events: 'Lian accepts the compass call after hearing her brother.',
          hookActivity: 'resolved glass-compass setup beat',
          mood: 'haunted resolve',
          chapterType: 'revision',
        },
      },
    },
  });

  assert.equal(revised.ok, true);
  assert.equal(revised.data.runtimeState.manifest.lastAppliedChapter, 1);
  const revisedHooks = readJson(join(stateRoot, 'hooks.json'));
  const revisedSummaries = readJson(join(stateRoot, 'chapter_summaries.json'));
  assert.equal(revisedHooks.hooks.find((hook) => hook.hookId === 'glass-compass').status, 'resolved');
  assert.equal(revisedSummaries.rows.length, 1);
  assert.equal(revisedSummaries.rows[0].mood, 'haunted resolve');

  const exported = runBridge(workspace, {
    operation: 'export_book',
    payload: { bookId },
  });
  const exportBundle = readJson(exported.data.exports.bundlePath);
  assert.equal(exportBundle.runtimeState.manifest.schemaVersion, 2);
  assert.equal(exportBundle.runtimeState.hooks.hooks[0].status, 'resolved');
});


test('historical chapter revision refreshes summaries without rewinding runtime state', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'book-agent-runtime-history-'));
  const created = runBridge(workspace, {
    operation: 'create_book',
    payload: {
      title: 'Two Chapter State',
      genre: 'fantasy',
      platform: 'qidian',
      currentFocus: 'Open with a sealed gate.',
    },
  });
  const bookId = created.data.book.id;
  const bookRoot = join(workspace, 'projects', bookId);

  const first = runBridge(workspace, {
    operation: 'write_next',
    payload: {
      bookId,
      title: 'Sealed Gate',
      content: 'Nia opens the sealed gate and hears the old bell.',
      summary: 'Nia opens the sealed gate.',
      runtimeState: {
        chapterSummary: {
          mood: 'ominous',
        },
      },
    },
  });

  runBridge(workspace, {
    operation: 'write_next',
    payload: {
      bookId,
      title: 'Old Bell',
      content: 'Nia follows the bell into the lower archive.',
      summary: 'Nia reaches the lower archive.',
      runtimeState: {
        chapterSummary: {
          mood: 'curious',
        },
      },
    },
  });

  const revisedFirst = runBridge(workspace, {
    operation: 'revise_chapter',
    payload: {
      bookId,
      chapterId: first.data.chapter.id,
      revisedContent: 'Nia opens the sealed gate, hears the old bell, and hides the key.',
      summary: 'Nia opens the sealed gate and hides the key.',
      runtimeState: {
        chapterSummary: {
          events: 'Nia opens the sealed gate and hides the key.',
          mood: 'controlled dread',
        },
      },
    },
  });

  assert.equal(revisedFirst.ok, true);
  assert.equal(revisedFirst.data.runtimeState.manifest.lastAppliedChapter, 2);
  const summaries = readJson(join(bookRoot, 'story', 'state', 'chapter_summaries.json'));
  assert.equal(summaries.rows.length, 2);
  assert.equal(summaries.rows.find((row) => row.chapter === 1).mood, 'controlled dread');
  assert.equal(summaries.rows.find((row) => row.chapter === 2).mood, 'curious');
  const manifest = readJson(join(bookRoot, 'story', 'state', 'manifest.json'));
  assert.equal(manifest.lastAppliedChapter, 2);
  assert.equal(manifest.migrationWarnings.some((warning) => warning.includes('historical chapter 1')), true);
});
