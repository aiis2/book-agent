import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

import { createBook } from './adapters/create-book.mjs';
import {
  getBookDetail,
  listBooks,
  replaceCharacters,
  replaceRelationships,
  replaceZepGraph,
  updateBookMetadata,
} from './adapters/book-domain.mjs';
import { loadSettings, saveSettings } from './adapters/settings.mjs';
import {
  developBook,
  editTruthFile,
  exportBook,
  generateCover,
  renameEntity,
  reviseChapter,
  runInteraction,
  shortFictionRun,
  updateAuthorIntent,
  updateCurrentFocus,
  writeNext,
} from './adapters/book-operations.mjs';


const operationHandlers = {
  create_book: createBook,
  develop_book: developBook,
  run_interaction: runInteraction,
  write_next: writeNext,
  revise_chapter: reviseChapter,
  rename_entity: renameEntity,
  update_author_intent: updateAuthorIntent,
  update_current_focus: updateCurrentFocus,
  edit_truth_file: editTruthFile,
  export_book: exportBook,
  short_fiction_run: shortFictionRun,
  generate_cover: generateCover,
};


async function dispatchOperation(workspaceRoot, operation, payload) {
  const handler = operationHandlers[operation];
  if (!handler) {
    throw new Error(`Unsupported operation: ${String(operation)}`);
  }

  return handler(workspaceRoot, payload, {
    dispatchOperation: (nextOperation, nextPayload) => dispatchOperation(workspaceRoot, nextOperation, nextPayload),
  });
}


function sendJson(response, statusCode, payload) {
  const body = Buffer.from(JSON.stringify(payload, null, 2));
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(body.length),
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,PUT,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  response.end(body);
}


async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}


function routeParams(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'api') {
    return null;
  }
  return parts.slice(1);
}


async function handleApi(request, response, workspaceRoot) {
  if (request.method === 'OPTIONS') {
    sendJson(response, 200, { ok: true });
    return;
  }

  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  const parts = routeParams(url.pathname);
  if (!parts) {
    sendJson(response, 404, { ok: false, error: { message: 'Not found' } });
    return;
  }

  try {
    if (parts.length === 1 && parts[0] === 'health') {
      sendJson(response, 200, { ok: true, service: 'book-hermes-engine-api' });
      return;
    }

    if (parts.length === 1 && parts[0] === 'settings') {
      if (request.method === 'GET') {
        sendJson(response, 200, { ok: true, data: { settings: loadSettings(workspaceRoot) } });
        return;
      }
      if (request.method === 'PATCH') {
        const body = await readJsonBody(request);
        const next = saveSettings(workspaceRoot, body);
        sendJson(response, 200, { ok: true, data: { settings: next } });
        return;
      }
    }

    if (parts.length === 1 && parts[0] === 'books') {
      if (request.method === 'GET') {
        sendJson(response, 200, { ok: true, data: { books: await listBooks(workspaceRoot) } });
        return;
      }
      if (request.method === 'POST') {
        const body = await readJsonBody(request);
        sendJson(response, 200, { ok: true, data: await createBook(workspaceRoot, body) });
        return;
      }
    }

    if (parts[0] === 'books' && parts[1]) {
      const bookId = decodeURIComponent(parts[1]);

      if (parts.length === 2 && request.method === 'GET') {
        sendJson(response, 200, { ok: true, data: await getBookDetail(workspaceRoot, bookId) });
        return;
      }

      if (parts.length === 3 && parts[2] === 'metadata' && request.method === 'PATCH') {
        const body = await readJsonBody(request);
        sendJson(response, 200, { ok: true, data: await updateBookMetadata(workspaceRoot, bookId, body) });
        return;
      }

      if (parts.length === 3 && parts[2] === 'characters' && request.method === 'PUT') {
        const body = await readJsonBody(request);
        sendJson(response, 200, { ok: true, data: await replaceCharacters(workspaceRoot, bookId, body) });
        return;
      }

      if (parts.length === 3 && parts[2] === 'relationships' && request.method === 'PUT') {
        const body = await readJsonBody(request);
        sendJson(response, 200, { ok: true, data: await replaceRelationships(workspaceRoot, bookId, body) });
        return;
      }

      if (parts.length === 3 && parts[2] === 'zep' && request.method === 'PUT') {
        const body = await readJsonBody(request);
        sendJson(response, 200, { ok: true, data: await replaceZepGraph(workspaceRoot, bookId, body) });
        return;
      }

      if (parts.length === 3 && parts[2] === 'chapters' && request.method === 'POST') {
        const body = await readJsonBody(request);
        sendJson(response, 200, { ok: true, data: await writeNext(workspaceRoot, { ...body, bookId }) });
        return;
      }

      if (parts.length === 4 && parts[2] === 'chapters' && request.method === 'PATCH') {
        const chapterId = decodeURIComponent(parts[3]);
        const body = await readJsonBody(request);
        sendJson(response, 200, { ok: true, data: await reviseChapter(workspaceRoot, { ...body, bookId, chapterId }) });
        return;
      }

      if (parts.length === 3 && parts[2] === 'export' && request.method === 'POST') {
        sendJson(response, 200, { ok: true, data: await exportBook(workspaceRoot, { bookId }) });
        return;
      }

      if (parts.length === 3 && parts[2] === 'interact' && request.method === 'POST') {
        const body = await readJsonBody(request);
        const result = await runInteraction(workspaceRoot, {
          bookId,
          prompt: body.prompt,
          action: body.action,
          actionPayload: body.actionPayload ?? body.payload,
        }, {
          dispatchOperation: (operation, payload) => dispatchOperation(workspaceRoot, operation, payload),
        });
        sendJson(response, 200, { ok: true, data: result });
        return;
      }
    }

    sendJson(response, 404, { ok: false, error: { message: 'Not found' } });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    });
  }
}


export function createApiServer(workspaceRoot = process.cwd()) {
  return createServer((request, response) => {
    handleApi(request, response, workspaceRoot);
  });
}


async function main() {
  const port = Number(process.env.BOOK_AGENT_API_PORT || 4319);
  const server = createApiServer(process.cwd());
  await new Promise((resolvePromise) => server.listen(port, '127.0.0.1', resolvePromise));
  process.stdout.write(`Book Hermes engine API listening at http://127.0.0.1:${port}\n`);
}


if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
