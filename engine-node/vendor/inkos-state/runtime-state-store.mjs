import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  ChapterSummariesStateSchema,
  CurrentStateStateSchema,
  HooksStateSchema,
  RuntimeStateSnapshotSchema,
  StateManifestSchema,
} from '../inkos-models/runtime-state.mjs';
import { renderChapterSummariesProjection, renderCurrentStateProjection, renderHooksProjection } from './state-projections.mjs';
import { applyRuntimeStateDelta } from './state-reducer.mjs';
import { validateRuntimeState } from './state-validator.mjs';


function runtimeStatePaths(bookRoot) {
  const storyDir = join(bookRoot, 'story');
  const stateDir = join(storyDir, 'state');
  const snapshotsDir = join(storyDir, 'snapshots');

  return {
    storyDir,
    stateDir,
    snapshotsDir,
    manifestPath: join(stateDir, 'manifest.json'),
    currentStateJsonPath: join(stateDir, 'current_state.json'),
    hooksJsonPath: join(stateDir, 'hooks.json'),
    chapterSummariesJsonPath: join(stateDir, 'chapter_summaries.json'),
    currentStateMarkdownPath: join(storyDir, 'current_state.md'),
    pendingHooksMarkdownPath: join(storyDir, 'pending_hooks.md'),
    chapterSummariesMarkdownPath: join(storyDir, 'chapter_summaries.md'),
  };
}


async function readTextIfExists(path) {
  try {
    return (await readFile(path, 'utf8')).replace(/\r\n/g, '\n').trim();
  } catch {
    return '';
  }
}


async function readJsonIfExists(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}


async function loadBookSeed(bookRoot, defaults = {}) {
  const book = await readJsonIfExists(join(bookRoot, 'book.json')) ?? {};
  const chapterIndex = await readJsonIfExists(join(bookRoot, 'chapters', 'index.json')) ?? [];
  const authorIntent = typeof defaults.authorIntent === 'string'
    ? defaults.authorIntent
    : await readTextIfExists(join(bookRoot, 'story', 'author_intent.md'));
  const currentFocus = typeof defaults.currentFocus === 'string'
    ? defaults.currentFocus
    : await readTextIfExists(join(bookRoot, 'story', 'current_focus.md'));
  const chapters = Array.isArray(chapterIndex) ? chapterIndex : [];
  const lastAppliedChapter = chapters.reduce((max, chapter) => (
    Number.isInteger(chapter?.number) && chapter.number > max ? chapter.number : max
  ), 0);

  return {
    language: defaults.language === 'zh' || book.language === 'zh' ? 'zh' : 'en',
    lastAppliedChapter,
    authorIntent,
    currentFocus,
    chapters,
  };
}


function fact(subject, predicate, object, chapter) {
  const text = String(object ?? '').trim();
  if (!text) {
    return null;
  }
  return {
    subject,
    predicate,
    object: text,
    validFromChapter: chapter,
    validUntilChapter: null,
    sourceChapter: chapter,
  };
}


async function createInitialSnapshot(bookRoot, defaults = {}) {
  const seed = await loadBookSeed(bookRoot, defaults);
  const facts = [
    fact('book', 'Author Intent', seed.authorIntent, 0),
    fact('protagonist', 'Current Goal', seed.currentFocus, seed.lastAppliedChapter),
  ].filter(Boolean);
  const rows = seed.chapters
    .filter((chapter) => Number.isInteger(chapter?.number) && chapter.number > 0)
    .map((chapter) => ({
      chapter: chapter.number,
      title: String(chapter.title ?? `Chapter ${chapter.number}`).trim() || `Chapter ${chapter.number}`,
      characters: '',
      events: String(chapter.summary ?? '').trim(),
      stateChanges: '',
      hookActivity: '',
      mood: '',
      chapterType: '',
    }));

  return RuntimeStateSnapshotSchema.parse({
    manifest: {
      schemaVersion: 2,
      language: seed.language,
      lastAppliedChapter: seed.lastAppliedChapter,
      projectionVersion: 1,
      migrationWarnings: [],
    },
    currentState: {
      chapter: seed.lastAppliedChapter,
      facts,
    },
    hooks: { hooks: [] },
    chapterSummaries: { rows },
  });
}


async function readSnapshot(bookRoot) {
  const paths = runtimeStatePaths(bookRoot);
  const raw = {
    manifest: await readJsonIfExists(paths.manifestPath),
    currentState: await readJsonIfExists(paths.currentStateJsonPath),
    hooks: await readJsonIfExists(paths.hooksJsonPath),
    chapterSummaries: await readJsonIfExists(paths.chapterSummariesJsonPath),
  };

  if (!raw.manifest || !raw.currentState || !raw.hooks || !raw.chapterSummaries) {
    return null;
  }

  return RuntimeStateSnapshotSchema.parse(raw);
}


function assertRuntimeStateValid(snapshot) {
  const issues = validateRuntimeState(snapshot);
  if (issues.length > 0) {
    throw new Error(`Invalid runtime state: ${issues.map((issue) => issue.code).join(', ')}`);
  }
  return RuntimeStateSnapshotSchema.parse(snapshot);
}


export async function loadRuntimeStateSnapshot(bookRoot) {
  const existing = await readSnapshot(bookRoot);
  return existing ? assertRuntimeStateValid(existing) : createInitialSnapshot(bookRoot);
}


export async function persistRuntimeStateSnapshot(bookRoot, snapshot) {
  const paths = runtimeStatePaths(bookRoot);
  const next = assertRuntimeStateValid(snapshot);

  await mkdir(paths.stateDir, { recursive: true });
  await Promise.all([
    writeFile(paths.manifestPath, `${JSON.stringify(StateManifestSchema.parse(next.manifest), null, 2)}\n`, 'utf8'),
    writeFile(paths.currentStateJsonPath, `${JSON.stringify(CurrentStateStateSchema.parse(next.currentState), null, 2)}\n`, 'utf8'),
    writeFile(paths.hooksJsonPath, `${JSON.stringify(HooksStateSchema.parse(next.hooks), null, 2)}\n`, 'utf8'),
    writeFile(paths.chapterSummariesJsonPath, `${JSON.stringify(ChapterSummariesStateSchema.parse(next.chapterSummaries), null, 2)}\n`, 'utf8'),
  ]);

  return next;
}


export function renderRuntimeStateProjections(snapshot) {
  const next = assertRuntimeStateValid(snapshot);
  return {
    currentStateMarkdown: renderCurrentStateProjection(next.currentState, next.manifest.language),
    hooksMarkdown: renderHooksProjection(next.hooks, next.manifest.language),
    chapterSummariesMarkdown: renderChapterSummariesProjection(next.chapterSummaries, next.manifest.language),
  };
}


export async function persistRuntimeStateProjections(bookRoot, snapshot) {
  const paths = runtimeStatePaths(bookRoot);
  const projections = renderRuntimeStateProjections(snapshot);

  await mkdir(paths.storyDir, { recursive: true });
  await Promise.all([
    writeFile(paths.currentStateMarkdownPath, projections.currentStateMarkdown, 'utf8'),
    writeFile(paths.pendingHooksMarkdownPath, projections.hooksMarkdown, 'utf8'),
    writeFile(paths.chapterSummariesMarkdownPath, projections.chapterSummariesMarkdown, 'utf8'),
  ]);

  return projections;
}


export async function ensureRuntimeState(bookRoot, defaults = {}) {
  const snapshot = await loadRuntimeStateSnapshot(bookRoot);
  const persisted = await persistRuntimeStateSnapshot(bookRoot, snapshot);
  const projections = await persistRuntimeStateProjections(bookRoot, persisted);

  return {
    snapshot: persisted,
    projections,
    paths: runtimeStatePaths(bookRoot),
  };
}


export async function buildRuntimeStateArtifacts(params) {
  const snapshot = await loadRuntimeStateSnapshot(params.bookRoot);
  const next = applyRuntimeStateDelta({
    snapshot,
    delta: params.delta,
    allowReapply: params.allowReapply,
  });
  const projections = renderRuntimeStateProjections(next);

  return {
    previousSnapshot: snapshot,
    snapshot: next,
    projections,
  };
}


export async function persistRuntimeStateArtifacts(params) {
  const persisted = await persistRuntimeStateSnapshot(params.bookRoot, params.artifacts.snapshot);
  const projections = await persistRuntimeStateProjections(params.bookRoot, persisted);
  const paths = runtimeStatePaths(params.bookRoot);

  if (Number.isInteger(params.chapterNumber) && params.chapterNumber > 0) {
    const snapshotDir = join(paths.snapshotsDir, String(params.chapterNumber));
    const snapshotStateDir = join(snapshotDir, 'state');
    await mkdir(snapshotStateDir, { recursive: true });
    await Promise.all([
      writeFile(join(snapshotStateDir, 'manifest.json'), `${JSON.stringify(persisted.manifest, null, 2)}\n`, 'utf8'),
      writeFile(join(snapshotStateDir, 'current_state.json'), `${JSON.stringify(persisted.currentState, null, 2)}\n`, 'utf8'),
      writeFile(join(snapshotStateDir, 'hooks.json'), `${JSON.stringify(persisted.hooks, null, 2)}\n`, 'utf8'),
      writeFile(join(snapshotStateDir, 'chapter_summaries.json'), `${JSON.stringify(persisted.chapterSummaries, null, 2)}\n`, 'utf8'),
      writeFile(join(snapshotDir, 'current_state.md'), projections.currentStateMarkdown, 'utf8'),
      writeFile(join(snapshotDir, 'pending_hooks.md'), projections.hooksMarkdown, 'utf8'),
      writeFile(join(snapshotDir, 'chapter_summaries.md'), projections.chapterSummariesMarkdown, 'utf8'),
    ]);
  }

  return {
    snapshot: persisted,
    projections,
    paths,
  };
}


export async function loadRuntimeStateBundle(bookRoot) {
  const ensured = await ensureRuntimeState(bookRoot);
  return {
    manifest: ensured.snapshot.manifest,
    currentState: ensured.snapshot.currentState,
    hooks: ensured.snapshot.hooks,
    chapterSummaries: ensured.snapshot.chapterSummaries,
    projections: ensured.projections,
    paths: ensured.paths,
  };
}
