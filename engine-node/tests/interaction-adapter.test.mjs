import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeBridgeRequest } from '../src/adapters/interaction-adapter.mjs';


test('normalizeBridgeRequest maps write_next into an upstream-derived interaction request', () => {
  const normalized = normalizeBridgeRequest({
    operation: 'write_next',
    payload: {
      bookId: 'night-harbor',
      title: 'Cold Dock',
      prompt: 'Open with Vale approaching the cranes.',
    },
  });

  assert.equal(normalized.operation, 'write_next');
  assert.equal(normalized.interactionRequest.intent, 'write_next');
  assert.equal(normalized.interactionRequest.bookId, 'night-harbor');
  assert.equal(normalized.interactionRequest.instruction, 'Open with Vale approaching the cranes.');
});


test('normalizeBridgeRequest maps run_interaction into chat or delegated upstream intents', () => {
  const chatRequest = normalizeBridgeRequest({
    operation: 'run_interaction',
    payload: {
      bookId: 'night-harbor',
      prompt: 'Summarize the next narrative beat.',
    },
  });

  assert.equal(chatRequest.interactionRequest.intent, 'chat');
  assert.equal(chatRequest.interactionRequest.instruction, 'Summarize the next narrative beat.');

  const delegatedRequest = normalizeBridgeRequest({
    operation: 'run_interaction',
    payload: {
      bookId: 'night-harbor',
      prompt: 'Shift attention to the archive fire.',
      action: 'update_current_focus',
      actionPayload: {
        content: 'Vale runs toward the archive before Mara reaches the fuse box.',
      },
    },
  });

  assert.equal(delegatedRequest.operation, 'run_interaction');
  assert.equal(delegatedRequest.interactionRequest.intent, 'update_focus');
  assert.equal(delegatedRequest.interactionRequest.currentFocus, 'Vale runs toward the archive before Mara reaches the fuse box.');
  assert.equal(delegatedRequest.interactionRequest.bookId, 'night-harbor');
});


test('normalizeBridgeRequest preserves Book Hermes extension intents outside the upstream interaction set', () => {
  const normalized = normalizeBridgeRequest({
    operation: 'generate_cover',
    payload: {
      bookId: 'night-harbor',
      style: 'grainy noir poster',
      mood: 'cold and investigative',
    },
  });

  assert.equal(normalized.interactionRequest.intent, 'generate_cover');
  assert.equal(normalized.interactionRequest.bookId, 'night-harbor');
});