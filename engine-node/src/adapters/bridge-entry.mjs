import process from 'node:process';

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
} from './book-operations.mjs';
import { createBook } from './create-book.mjs';
import { normalizeBridgeRequest } from './interaction-adapter.mjs';
import { persistActiveBookSession } from './interaction-session-store.mjs';


async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}


function successEnvelope(operation, data, interactionIntent = null) {
  return {
    ok: true,
    operation,
    data,
    error: null,
    meta: {
      engine: 'book-hermes-engine-node',
      version: 'draft-batch-1',
      interactionIntent,
    },
  };
}


function errorEnvelope(operation, error) {
  return {
    ok: false,
    operation,
    data: null,
    error: {
      code: 'ENGINE_ERROR',
      message: error instanceof Error ? error.message : String(error),
      details: {},
    },
    meta: {
      engine: 'book-hermes-engine-node',
      version: 'draft-batch-1',
    },
  };
}


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


function inferActiveBookId(payload, data) {
  if (data && typeof data === 'object') {
    if (data.book && typeof data.book === 'object' && typeof data.book.id === 'string') {
      return data.book.id;
    }
    if (data.result && typeof data.result === 'object') {
      const nested = inferActiveBookId(payload, data.result);
      if (nested) {
        return nested;
      }
    }
  }

  return typeof payload?.bookId === 'string' && payload.bookId.trim()
    ? payload.bookId
    : null;
}


async function handleRequest(request) {
  const normalized = normalizeBridgeRequest(request);
  const operation = normalized.operation;
  const payload = normalized.payload;
  const data = await dispatchOperation(process.cwd(), operation, payload);
  const activeBookId = inferActiveBookId(payload, data);

  if (activeBookId) {
    await persistActiveBookSession(process.cwd(), activeBookId);
  }

  return successEnvelope(
    operation,
    data,
    normalized.interactionRequest.intent,
  );
}


async function main() {
  const raw = await readStdin();
  if (!raw.trim()) {
    process.stderr.write('Bridge request is required on stdin.\n');
    process.exitCode = 1;
    return;
  }

  let request;
  try {
    request = JSON.parse(raw);
  } catch (error) {
    process.stdout.write(`${JSON.stringify(errorEnvelope('unknown', new Error('Invalid JSON request')), null, 2)}\n`);
    process.exitCode = 1;
    return;
  }

  try {
    const response = await handleRequest(request);
    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify(errorEnvelope(request?.operation ?? 'unknown', error), null, 2)}\n`);
    process.exitCode = 1;
  }
}


await main();