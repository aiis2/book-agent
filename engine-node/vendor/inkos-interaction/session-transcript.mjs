import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { TranscriptEventSchema } from './session-transcript-schema.mjs';


const SESSIONS_DIR = '.inkos/sessions';
const appendQueues = new Map();


export function sessionsDir(projectRoot) {
  return join(projectRoot, SESSIONS_DIR);
}


export function transcriptPath(projectRoot, sessionId) {
  return join(sessionsDir(projectRoot), `${sessionId}.jsonl`);
}


export async function readTranscriptEvents(projectRoot, sessionId) {
  let raw;
  try {
    raw = await readFile(transcriptPath(projectRoot, sessionId), 'utf-8');
  } catch {
    return [];
  }

  const events = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }
    try {
      const parsed = TranscriptEventSchema.safeParse(JSON.parse(line));
      if (parsed.success) {
        events.push(parsed.data);
      }
    } catch {
      continue;
    }
  }

  return events.sort((left, right) => left.seq - right.seq);
}


export async function appendTranscriptEvents(projectRoot, sessionId, buildEvents) {
  const key = `${projectRoot}:${sessionId}`;
  const previous = appendQueues.get(key) ?? Promise.resolve();
  let result = [];

  const next = previous.then(async () => {
    const events = await readTranscriptEvents(projectRoot, sessionId);
    const nextSeq = events.reduce((max, event) => Math.max(max, event.seq), 0) + 1;
    const built = await buildEvents({ events, nextSeq });
    result = built.map((event) => TranscriptEventSchema.parse(event));
    if (result.length === 0) {
      return;
    }

    await mkdir(sessionsDir(projectRoot), { recursive: true });
    await appendFile(
      transcriptPath(projectRoot, sessionId),
      `${result.map((event) => JSON.stringify(event)).join('\n')}\n`,
      'utf-8',
    );
  });

  appendQueues.set(key, next.catch(() => undefined));
  await next;
  return result;
}


function transcriptRoleForMessage(message) {
  if (!message || typeof message !== 'object' || !('role' in message)) {
    return null;
  }
  const role = message.role;
  return role === 'user' || role === 'assistant' || role === 'toolResult' || role === 'system'
    ? role
    : null;
}


function messageTimestamp(message) {
  if (message && typeof message === 'object') {
    const timestamp = message.timestamp;
    if (typeof timestamp === 'number' && Number.isFinite(timestamp) && timestamp >= 0) {
      return Math.floor(timestamp);
    }
  }
  return Date.now();
}


function toolCallIdForMessage(message) {
  if (!message || typeof message !== 'object') {
    return undefined;
  }
  if (message.role === 'toolResult') {
    return typeof message.toolCallId === 'string' && message.toolCallId.length > 0
      ? message.toolCallId
      : undefined;
  }

  const content = message.content;
  if (!Array.isArray(content)) {
    return undefined;
  }

  const block = content.find((item) => (
    item
    && typeof item === 'object'
    && item.type === 'toolCall'
    && typeof item.id === 'string'
  ));
  return block?.id;
}


export async function appendManualSessionMessages(projectRoot, sessionId, messages, input = '') {
  const persistedMessages = messages
    .map((message) => ({ message, role: transcriptRoleForMessage(message) }))
    .filter((entry) => entry.role !== null);
  if (persistedMessages.length === 0) {
    return;
  }

  const requestId = randomUUID();
  await appendTranscriptEvents(projectRoot, sessionId, ({ nextSeq }) => {
    let seq = nextSeq;
    const events = [{
      type: 'request_started',
      version: 1,
      sessionId,
      requestId,
      seq: seq++,
      timestamp: Date.now(),
      input,
    }];

    let parentUuid = null;
    let lastAssistantUuid = null;
    for (const { message, role } of persistedMessages) {
      const uuid = randomUUID();
      const isToolResult = role === 'toolResult';
      const toolCallId = toolCallIdForMessage(message);
      events.push({
        type: 'message',
        version: 1,
        sessionId,
        requestId,
        uuid,
        parentUuid: isToolResult && lastAssistantUuid ? lastAssistantUuid : parentUuid,
        seq: seq++,
        role,
        timestamp: messageTimestamp(message),
        ...(toolCallId ? { toolCallId } : {}),
        ...(isToolResult && lastAssistantUuid ? { sourceToolAssistantUuid: lastAssistantUuid } : {}),
        message,
      });
      if (role === 'assistant') {
        lastAssistantUuid = uuid;
      }
      parentUuid = uuid;
    }

    events.push({
      type: 'request_committed',
      version: 1,
      sessionId,
      requestId,
      seq,
      timestamp: Date.now(),
    });
    return events;
  });
}