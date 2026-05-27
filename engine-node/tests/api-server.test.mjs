import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createApiServer } from '../src/api-server.mjs';


async function startServer(workspace) {
  const server = createApiServer(workspace);
  await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
  const address = server.address();
  assert.notEqual(address, null);
  assert.equal(typeof address, 'object');
  const baseUrl = `http://127.0.0.1:${address.port}/api`;
  return {
    baseUrl,
    async close() {
      await new Promise((resolvePromise, rejectPromise) => {
        server.close((error) => {
          if (error) {
            rejectPromise(error);
            return;
          }
          resolvePromise();
        });
      });
    },
  };
}


async function requestJson(baseUrl, path, init) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const json = await response.json();
  assert.equal(response.ok, true, JSON.stringify(json));
  return json;
}


test('API server supports catalog, domain, and chapter maintenance flows', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'book-agent-api-'));
  const server = await startServer(workspace);
  const previousDisableModel = process.env.BOOK_AGENT_DISABLE_MODEL;
  process.env.BOOK_AGENT_DISABLE_MODEL = '1';

  try {
    const created = await requestJson(server.baseUrl, '/books', {
      method: 'POST',
      body: JSON.stringify({
        title: 'API Harbor',
        genre: 'mystery',
        platform: 'qidian',
        authorIntent: 'Keep the harbor claustrophobic.',
        currentFocus: 'Mara enters the dock records office.',
      }),
    });
    const bookId = created.data.book.id;

    const catalog = await requestJson(server.baseUrl, '/books', { method: 'GET' });
    assert.equal(catalog.data.books.length, 1);
    assert.equal(catalog.data.books[0].id, bookId);

    await requestJson(server.baseUrl, `/books/${bookId}/characters`, {
      method: 'PUT',
      body: JSON.stringify({
        characters: [
          {
            id: 'mara',
            name: 'Mara Vale',
            role: 'lead investigator',
            summary: 'Tracks the forged ledger.',
            traits: ['cold', 'precise'],
          },
        ],
      }),
    });

    await requestJson(server.baseUrl, `/books/${bookId}/relationships`, {
      method: 'PUT',
      body: JSON.stringify({
        relationships: [
          {
            id: 'family-1',
            fromCharacterId: 'mara',
            toCharacterId: 'mara',
            type: 'family',
            label: 'self-reference',
            summary: 'Used to verify relationship persistence.',
            strength: 0.2,
          },
        ],
      }),
    });

    await requestJson(server.baseUrl, `/books/${bookId}/zep`, {
      method: 'PUT',
      body: JSON.stringify({
        zepGraph: {
          schemaVersion: 1,
          episodes: [
            {
              id: 'episode-1',
              title: 'Dock Records',
              summary: 'Mara enters the records office.',
              occurredAt: 'Chapter 1 / Dawn',
              recordedAt: new Date().toISOString(),
              location: 'Dock records office',
              participantIds: ['mara'],
              tags: ['records'],
            },
          ],
          entities: [],
          facts: [],
        },
      }),
    });

    await requestJson(server.baseUrl, `/books/${bookId}/chapters`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Cold Dock',
        content: 'Mara reaches the office and discovers the ledger pages have been switched.',
        summary: 'Mara finds the forged ledger.',
      }),
    });

    const interaction = await requestJson(server.baseUrl, `/books/${bookId}/interact`, {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'Move the next beat toward the burned archive.',
        action: 'update_current_focus',
        payload: {
          content: 'Mara follows the smoke trail toward the archive before the records burn.',
        },
      }),
    });
    assert.equal(interaction.data.delegatedOperation, 'update_current_focus');
    assert.equal(interaction.data.result.currentFocus.includes('archive'), true);

    const detail = await requestJson(server.baseUrl, `/books/${bookId}`, { method: 'GET' });
    assert.equal(detail.data.domain.characters.length, 1);
    assert.equal(detail.data.domain.zepGraph.episodes.length, 1);
    assert.equal(detail.data.chapters.length, 1);
    assert.equal(detail.data.currentFocus.includes('archive'), true);
  } finally {
    if (previousDisableModel === undefined) {
      delete process.env.BOOK_AGENT_DISABLE_MODEL;
    } else {
      process.env.BOOK_AGENT_DISABLE_MODEL = previousDisableModel;
    }
    await server.close();
  }
});

test('Settings endpoint: GET returns defaults and PATCH persists changes', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'book-agent-settings-'));
  const server = await startServer(workspace);

  try {
    const initial = await requestJson(server.baseUrl, '/settings', { method: 'GET' });
    assert.ok(Array.isArray(initial.data.settings.modelServices), 'modelServices should be an array');
    assert.ok(initial.data.settings.defaultModels, 'defaultModels should exist');
    assert.ok(initial.data.settings.general, 'general should exist');
    assert.ok(initial.data.settings.webSearch, 'webSearch should exist');
    assert.ok(initial.data.settings.globalMemory, 'globalMemory should exist');

    // PATCH: update general.language and a webSearch toggle
    const patched = await requestJson(server.baseUrl, '/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        general: { language: 'en', autoSave: false, maxToolIterations: 5, sendWithEnter: false },
        webSearch: { enabled: true, provider: 'tavily', apiKey: 'test-key', maxResults: 3 },
      }),
    });
    assert.equal(patched.data.settings.general.language, 'en');
    assert.equal(patched.data.settings.general.maxToolIterations, 5);
    assert.equal(patched.data.settings.webSearch.enabled, true);
    assert.equal(patched.data.settings.webSearch.apiKey, 'test-key');

    // Verify other fields are still preserved after patch
    assert.ok(Array.isArray(patched.data.settings.modelServices));
    assert.ok(patched.data.settings.display);

    // GET again — should reflect persisted patch
    const after = await requestJson(server.baseUrl, '/settings', { method: 'GET' });
    assert.equal(after.data.settings.general.language, 'en');
    assert.equal(after.data.settings.webSearch.apiKey, 'test-key');
  } finally {
    await server.close();
  }
});
