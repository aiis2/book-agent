import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createBook } from '../src/adapters/create-book.mjs';
import {
  createBookPaths,
  saveBookConfig,
  saveChapterIndex,
} from '../src/adapters/book-workspace.mjs';


test('saveBookConfig rejects invalid upstream-derived book shapes', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'book-agent-schema-book-'));
  const created = await createBook(workspace, {
    title: 'Schema Harbor',
    genre: 'mystery',
    platform: 'qidian',
  });

  await assert.rejects(
    () => saveBookConfig(createBookPaths(workspace, created.book.id), {
      ...created.book,
      status: 'broken-status',
    }),
    /Invalid book config/u,
  );
});


test('saveChapterIndex rejects invalid upstream-derived chapter metadata', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'book-agent-schema-chapter-'));
  const created = await createBook(workspace, {
    title: 'Schema Harbor',
    genre: 'mystery',
    platform: 'qidian',
  });
  const paths = createBookPaths(workspace, created.book.id);

  await assert.rejects(
    () => saveChapterIndex(paths, [{
      id: 'chapter-001-schema-harbor',
      number: 1,
      title: 'Cold Dock',
      summary: 'Vale reaches the dock.',
      status: 'invalid-status',
      revision: 1,
      wordCount: 42,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      path: 'chapters/chapter-001-schema-harbor.md',
    }]),
    /Invalid chapter index/u,
  );
});
