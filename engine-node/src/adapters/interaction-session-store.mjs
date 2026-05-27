import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { randomUUID } from 'node:crypto';

import { GlobalSessionSchema, InteractionSessionSchema } from '../../vendor/inkos-interaction/session.mjs';


const SESSION_DIR = '.inkos';
const SESSION_FILE = 'session.json';


export function resolveGlobalSessionPath(projectRoot) {
  return join(projectRoot, SESSION_DIR, SESSION_FILE);
}


function createProjectSession(projectRoot, defaults = {}) {
  return InteractionSessionSchema.parse({
    sessionId: randomUUID(),
    projectRoot,
    automationMode: 'semi',
    messages: [],
    events: [],
    ...defaults,
  });
}


async function readSessionDocument(projectRoot) {
  try {
    const raw = await readFile(resolveGlobalSessionPath(projectRoot), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}


export async function loadProjectSession(projectRoot) {
  const raw = await readSessionDocument(projectRoot);
  if (!raw || typeof raw !== 'object') {
    return createProjectSession(projectRoot);
  }

  const parsed = InteractionSessionSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }

  return createProjectSession(projectRoot, {
    activeBookId: typeof raw.activeBookId === 'string' ? raw.activeBookId : undefined,
    automationMode: raw.automationMode === 'auto' || raw.automationMode === 'manual' ? raw.automationMode : 'semi',
  });
}


export async function persistProjectSession(projectRoot, projectSession) {
  const session = InteractionSessionSchema.parse(projectSession);
  await mkdir(join(projectRoot, SESSION_DIR), { recursive: true });
  await writeFile(resolveGlobalSessionPath(projectRoot), `${JSON.stringify(session, null, 2)}\n`, 'utf-8');
  return session;
}


export async function loadGlobalSession(projectRoot) {
  const raw = await readSessionDocument(projectRoot);
  return GlobalSessionSchema.parse(raw ?? {});
}


export async function persistGlobalSession(projectRoot, globalSession) {
  const session = GlobalSessionSchema.parse(globalSession);
  const existing = await loadProjectSession(projectRoot);
  return persistProjectSession(projectRoot, {
    ...existing,
    activeBookId: session.activeBookId,
    automationMode: session.automationMode,
  });
}


export async function persistActiveBookSession(projectRoot, bookId, automationMode) {
  const current = await loadProjectSession(projectRoot);
  return persistProjectSession(projectRoot, {
    ...current,
    ...(typeof bookId === 'string' && bookId.trim() ? { activeBookId: bookId } : {}),
    ...(automationMode === 'auto' || automationMode === 'semi' || automationMode === 'manual'
      ? { automationMode }
      : {}),
  });
}