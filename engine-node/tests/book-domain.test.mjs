import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createBook } from '../src/adapters/create-book.mjs';
import {
  getBookDetail,
  listBooks,
  replaceCharacters,
  replaceRelationships,
  replaceZepGraph,
} from '../src/adapters/book-domain.mjs';


test('domain artifacts initialize and list across multiple novels', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'book-agent-domain-'));
  const first = await createBook(workspace, {
    title: 'North Harbor',
    genre: 'mystery',
    platform: 'qidian',
  });
  const second = await createBook(workspace, {
    title: 'South Harbor',
    genre: 'thriller',
    platform: 'tomato',
  });

  const books = await listBooks(workspace);
  assert.equal(books.length, 2);
  assert.equal(books.some((book) => book.id === first.book.id), true);
  assert.equal(books.some((book) => book.id === second.book.id), true);

  const detail = await getBookDetail(workspace, first.book.id);
  assert.deepEqual(detail.domain.characters, []);
  assert.deepEqual(detail.domain.relationships, []);
  assert.deepEqual(detail.domain.zepGraph.episodes, []);
});


test('characters, relationships, and zep graph persist with relationship sync', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'book-agent-domain-sync-'));
  const created = await createBook(workspace, {
    title: 'Graph Harbor',
    genre: 'mystery',
    platform: 'qidian',
  });
  const bookId = created.book.id;

  await replaceCharacters(workspace, bookId, {
    characters: [
      {
        id: 'mara',
        name: 'Mara Vale',
        role: 'lead investigator',
        summary: 'A cold but loyal investigator.',
        traits: ['precise', 'guarded'],
      },
      {
        id: 'rowan',
        name: 'Rowan Vale',
        role: 'witness',
        summary: 'Mara\'s estranged sibling.',
      },
    ],
  });

  const updated = await replaceRelationships(workspace, bookId, {
    relationships: [
      {
        id: 'rel-bloodline-1',
        fromCharacterId: 'mara',
        toCharacterId: 'rowan',
        type: 'bloodline',
        label: 'siblings',
        summary: 'Mara and Rowan are siblings with a fractured alliance.',
        strength: 0.9,
      },
    ],
  });

  assert.equal(updated.characters.length, 2);
  assert.equal(updated.relationships.length, 1);
  assert.equal(updated.zepGraph.entities.some((entity) => entity.id === 'mara' && entity.kind === 'character'), true);
  assert.equal(updated.zepGraph.facts.some((fact) => fact.id === 'rel-bloodline-1' && fact.relation === 'bloodline'), true);

  const zep = await replaceZepGraph(workspace, bookId, {
    zepGraph: {
      schemaVersion: 1,
      episodes: [
        {
          id: 'episode-001',
          title: 'Dockside Ledger Discovery',
          summary: 'Mara learns the ledger has been forged.',
          chapterId: 'chapter-001-cold-dock',
          occurredAt: 'Chapter 1 / Dawn',
          recordedAt: new Date().toISOString(),
          location: 'North Harbor Dock',
          participantIds: ['mara', 'rowan'],
          tags: ['ledger', 'harbor'],
        },
      ],
      entities: updated.zepGraph.entities,
      facts: updated.zepGraph.facts,
    },
  });

  assert.equal(zep.zepGraph.episodes.length, 1);
  assert.equal(zep.zepGraph.episodes[0].participantIds.includes('mara'), true);
});
