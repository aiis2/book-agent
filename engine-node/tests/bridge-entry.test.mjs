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


test('bridge entry creates a book workspace', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'book-agent-node-'));
  const result = runBridge(workspace, {
    operation: 'create_book',
    payload: {
      title: 'Harbor Ledger',
      genre: 'urban',
      platform: 'tomato',
      authorIntent: 'Make the investigation feel intimate and grounded.',
      currentFocus: 'Open with the forged ledger discovery.',
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.operation, 'create_book');

  const bookRoot = join(workspace, 'projects', result.data.book.id);
  assert.equal(existsSync(join(bookRoot, 'book.json')), true);
  assert.equal(existsSync(join(bookRoot, 'chapters', 'index.json')), true);

  const bookConfig = JSON.parse(readFileSync(join(bookRoot, 'book.json'), 'utf8'));
  assert.equal(bookConfig.title, 'Harbor Ledger');
  assert.equal(bookConfig.platform, 'tomato');
});


test('bridge entry runs the documented v1 workflow operations', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'book-agent-node-flow-'));
  const created = runBridge(workspace, {
    operation: 'create_book',
    payload: {
      title: 'Night Harbor',
      genre: 'mystery',
      platform: 'qidian',
      authorIntent: 'Inspector Vale must stay cold while the harbor closes in.',
      currentFocus: 'Inspector Vale reaches the frozen dock before dawn.',
    },
  });
  const bookId = created.data.book.id;

  const updatedIntent = runBridge(workspace, {
    operation: 'update_author_intent',
    payload: {
      bookId,
      content: 'Inspector Vale must look detached while protecting the one witness who still trusts him.',
    },
  });
  assert.equal(updatedIntent.data.authorIntent.includes('witness'), true);

  const updatedFocus = runBridge(workspace, {
    operation: 'update_current_focus',
    payload: {
      bookId,
      content: 'Inspector Vale studies the ledger while the tide erases the blood on the dock.',
    },
  });
  assert.equal(updatedFocus.data.currentFocus.includes('ledger'), true);

  const developed = runBridge(workspace, {
    operation: 'develop_book',
    payload: {
      bookId,
      note: 'Tighten the suspect triangle around Vale, Rowan, and the harbormaster.',
      currentFocus: 'Inspector Vale corners Rowan beside the harbor cranes.',
    },
  });
  assert.equal(developed.data.currentFocus.includes('Rowan'), true);

  const written = runBridge(workspace, {
    operation: 'write_next',
    payload: {
      bookId,
      title: 'Cold Dock',
      content: 'Inspector Vale meets Rowan under the cranes and learns the ledger is forged.',
      summary: 'Vale confronts Rowan about the forged ledger.',
      nextFocus: 'Inspector Vale now needs proof before the harbormaster burns the records.',
    },
  });
  assert.equal(written.data.chapter.title, 'Cold Dock');
  assert.equal(written.data.chapter.status, 'draft');

  const revised = runBridge(workspace, {
    operation: 'revise_chapter',
    payload: {
      bookId,
      chapterId: written.data.chapter.id,
      revisedContent: 'Inspector Vale traps Rowan beneath the cranes and proves the ledger pages were switched.',
      summary: 'Vale forces Rowan to admit the ledger pages were switched.',
    },
  });
  assert.equal(revised.data.chapter.revision, 2);
  assert.equal(revised.data.chapter.status, 'revised');

  const truth = runBridge(workspace, {
    operation: 'edit_truth_file',
    payload: {
      bookId,
      truthFile: 'harbor-facts.md',
      content: 'Rowan saw the harbormaster switch the ledger pages before dawn.',
    },
  });
  assert.equal(truth.data.truthFile, 'harbor-facts.md');

  const renamed = runBridge(workspace, {
    operation: 'rename_entity',
    payload: {
      bookId,
      from: 'Rowan',
      to: 'Mara',
    },
  });
  assert.equal(renamed.data.replacements > 0, true);

  const interaction = runBridge(workspace, {
    operation: 'run_interaction',
    payload: {
      bookId,
      prompt: 'Track how Mara pressures Vale into choosing between evidence and loyalty.',
    },
  });
  assert.equal(interaction.data.recordedPrompt.includes('Mara'), true);

  const delegatedInteraction = runBridge(workspace, {
    operation: 'run_interaction',
    payload: {
      bookId,
      action: 'update_current_focus',
      prompt: 'Shift the next beat toward the archive fire.',
      actionPayload: {
        content: 'Inspector Vale races toward the records archive before Mara can reach the fire first.',
      },
    },
  });
  assert.equal(delegatedInteraction.data.delegatedOperation, 'update_current_focus');
  assert.equal(delegatedInteraction.data.result.currentFocus.includes('archive'), true);

  const exported = runBridge(workspace, {
    operation: 'export_book',
    payload: {
      bookId,
    },
  });
  assert.equal(existsSync(exported.data.exports.manuscriptPath), true);
  assert.equal(existsSync(exported.data.exports.bundlePath), true);

  const shortFiction = runBridge(workspace, {
    operation: 'short_fiction_run',
    payload: {
      bookId,
      title: 'Harbor Ashes',
      prompt: 'Write the archive fire as a compact side story.',
    },
  });
  assert.equal(existsSync(shortFiction.data.shortFiction.path), true);
  assert.equal(existsSync(shortFiction.data.shortFiction.packagePath), true);
  assert.equal(existsSync(shortFiction.data.shortFiction.coverPromptPath), true);
  const shortFictionPackage = JSON.parse(readFileSync(shortFiction.data.shortFiction.packagePath, 'utf8'));
  assert.equal(shortFictionPackage.title, 'Harbor Ashes');
  assert.equal(Array.isArray(shortFictionPackage.sellingPoints), true);
  assert.equal(shortFictionPackage.sellingPoints.length >= 3, true);
  assert.equal(readFileSync(shortFiction.data.shortFiction.coverPromptPath, 'utf8').trim().length > 0, true);

  const cover = runBridge(workspace, {
    operation: 'generate_cover',
    payload: {
      bookId,
      style: 'grainy noir poster',
      mood: 'cold, investigative, tense',
    },
  });
  assert.equal(existsSync(cover.data.paths.coverBriefPath), true);
  assert.equal(existsSync(cover.data.paths.coverPromptPath), true);

  const storyRoot = join(workspace, 'projects', bookId, 'story');
  assert.equal(readFileSync(join(storyRoot, 'development_log.md'), 'utf8').includes('Mara'), true);
  assert.equal(readFileSync(join(storyRoot, 'current_focus.md'), 'utf8').includes('archive'), true);
  assert.equal(existsSync(join(storyRoot, 'development_log.md')), true);
  assert.equal(existsSync(join(storyRoot, 'interaction_log.md')), true);
  assert.equal(existsSync(join(storyRoot, 'truth', 'harbor-facts.md')), true);

  const chapterIndex = JSON.parse(readFileSync(join(workspace, 'projects', bookId, 'chapters', 'index.json'), 'utf8'));
  assert.equal(chapterIndex.length, 1);
  assert.equal(chapterIndex[0].title, 'Cold Dock');
  assert.equal(chapterIndex[0].summary.includes('Mara'), true);
});