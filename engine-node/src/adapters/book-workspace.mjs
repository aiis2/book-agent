import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';

import { assertSafeBookId, deriveBookIdFromTitle } from '../../vendor/inkos-core/book-id.mjs';
import { safeChildPath } from '../../vendor/inkos-core/path-safety.mjs';
import { z } from 'zod';
import { BookConfigSchema, BookStatusSchema } from '../../vendor/inkos-models/book.mjs';
import { ChapterMetaSchema, ChapterStatusSchema } from '../../vendor/inkos-models/chapter.mjs';


const BookHermesBookStatusSchema = z.union([
  BookStatusSchema,
  z.enum(['developing', 'drafting']),
]);

const BookHermesBookConfigSchema = BookConfigSchema.extend({
  status: BookHermesBookStatusSchema,
});

const BookHermesChapterStatusSchema = z.union([
  ChapterStatusSchema,
  z.enum(['draft', 'revised']),
]);

const BookHermesChapterSchema = ChapterMetaSchema.extend({
  id: z.string().min(1),
  summary: z.string().min(1),
  revision: z.number().int().min(1).default(1),
  path: z.string().min(1),
  status: BookHermesChapterStatusSchema,
});

const BookHermesChapterIndexSchema = z.array(BookHermesChapterSchema);


function parseBookConfig(value, label = 'book config') {
  try {
    return BookHermesBookConfigSchema.parse(value);
  } catch (error) {
    throw new Error(`Invalid ${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}


function parseChapterIndex(value, label = 'chapter index') {
  try {
    return BookHermesChapterIndexSchema.parse(value);
  } catch (error) {
    throw new Error(`Invalid ${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}


export function nowIso() {
  return new Date().toISOString();
}


export function normalizeOptionalString(value) {
  return typeof value === 'string' ? value.trim() : '';
}


export function requireNonEmptyString(value, label) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    throw new Error(`${label} is required`);
  }
  return normalized;
}


export function countWords(value) {
  const normalized = normalizeOptionalString(value);
  return normalized ? normalized.split(/\s+/u).length : 0;
}


export function deriveChapterId(payload, chapterCount) {
  const requested = normalizeOptionalString(payload?.chapterId);
  if (requested) {
    return assertSafeBookId(requested, 'chapterId');
  }

  const number = chapterCount + 1;
  const derivedTitle = deriveBookIdFromTitle(normalizeOptionalString(payload?.title));
  return derivedTitle
    ? `chapter-${String(number).padStart(3, '0')}-${derivedTitle}`
    : `chapter-${String(number).padStart(3, '0')}`;
}


export function createBookPaths(workspaceRoot, bookId) {
  const projectsRoot = safeChildPath(workspaceRoot, 'projects');
  const safeBookId = assertSafeBookId(String(bookId).trim(), 'bookId');
  const bookRoot = safeChildPath(workspaceRoot, `projects/${safeBookId}`);
  const chaptersRoot = safeChildPath(bookRoot, 'chapters');
  const storyRoot = safeChildPath(bookRoot, 'story');
  const truthRoot = safeChildPath(storyRoot, 'truth');
  const zepRoot = safeChildPath(storyRoot, 'zep');
  const stateRoot = safeChildPath(storyRoot, 'state');
  const snapshotsRoot = safeChildPath(storyRoot, 'snapshots');
  const exportsRoot = safeChildPath(bookRoot, 'exports');
  const coversRoot = safeChildPath(bookRoot, 'covers');

  return {
    projectsRoot,
    bookId: safeBookId,
    bookRoot,
    bookConfigPath: safeChildPath(bookRoot, 'book.json'),
    chaptersRoot,
    chapterIndexPath: safeChildPath(chaptersRoot, 'index.json'),
    storyRoot,
    authorIntentPath: safeChildPath(storyRoot, 'author_intent.md'),
    currentFocusPath: safeChildPath(storyRoot, 'current_focus.md'),
    charactersPath: safeChildPath(storyRoot, 'characters.json'),
    relationshipsPath: safeChildPath(storyRoot, 'relationships.json'),
    truthRoot,
    zepRoot,
    zepGraphPath: safeChildPath(zepRoot, 'graph.json'),
    stateRoot,
    snapshotsRoot,
    currentStateMarkdownPath: safeChildPath(storyRoot, 'current_state.md'),
    pendingHooksPath: safeChildPath(storyRoot, 'pending_hooks.md'),
    chapterSummariesPath: safeChildPath(storyRoot, 'chapter_summaries.md'),
    developmentLogPath: safeChildPath(storyRoot, 'development_log.md'),
    interactionLogPath: safeChildPath(storyRoot, 'interaction_log.md'),
    exportsRoot,
    manuscriptPath: safeChildPath(exportsRoot, 'manuscript.md'),
    exportBundlePath: safeChildPath(exportsRoot, 'book-export.json'),
    coversRoot,
    coverBriefPath: safeChildPath(coversRoot, 'cover-brief.json'),
    coverPromptPath: safeChildPath(coversRoot, 'cover-prompt.md'),
  };
}


export function chapterPath(paths, chapterId) {
  return safeChildPath(paths.chaptersRoot, `${assertSafeBookId(chapterId, 'chapterId')}.md`);
}


export async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}


export async function ensureBookDirectories(paths) {
  await mkdir(paths.projectsRoot, { recursive: true });
  await mkdir(paths.chaptersRoot, { recursive: true });
  await mkdir(paths.storyRoot, { recursive: true });
  await mkdir(paths.truthRoot, { recursive: true });
  await mkdir(paths.zepRoot, { recursive: true });
  await mkdir(paths.stateRoot, { recursive: true });
  await mkdir(paths.snapshotsRoot, { recursive: true });
  await mkdir(paths.exportsRoot, { recursive: true });
  await mkdir(paths.coversRoot, { recursive: true });
}


export async function readOptionalText(path) {
  if (!(await fileExists(path))) {
    return '';
  }
  return (await readFile(path, 'utf8')).replace(/\r\n/g, '\n').trim();
}


export async function readJsonDocument(path, label) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read ${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}


export async function writeJsonDocument(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}


export async function writeTextDocument(path, value) {
  const normalized = String(value ?? '').replace(/\r\n/g, '\n').trimEnd();
  await writeFile(path, `${normalized}\n`, 'utf8');
}


export async function appendTextDocument(path, value) {
  const current = await readOptionalText(path);
  const incoming = String(value ?? '').replace(/\r\n/g, '\n').trim();
  const nextValue = current ? `${current}\n\n${incoming}` : incoming;
  await writeTextDocument(path, nextValue);
}


export async function readTruthFiles(truthRoot) {
  if (!(await fileExists(truthRoot))) {
    return [];
  }

  const entries = await readdir(truthRoot, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const truthFiles = [];
  for (const name of files) {
    const path = safeChildPath(truthRoot, name);
    truthFiles.push({
      name,
      path,
      content: await readOptionalText(path),
    });
  }

  return truthFiles;
}


export async function loadBookWorkspace(workspaceRoot, bookId) {
  const paths = createBookPaths(workspaceRoot, requireNonEmptyString(bookId, 'bookId'));
  if (!(await fileExists(paths.bookConfigPath))) {
    throw new Error(`Unknown bookId: ${paths.bookId}`);
  }

  const book = parseBookConfig(await readJsonDocument(paths.bookConfigPath, 'book config'));
  const chapterIndex = (await fileExists(paths.chapterIndexPath))
    ? parseChapterIndex(await readJsonDocument(paths.chapterIndexPath, 'chapter index'))
    : [];

  return {
    paths,
    book,
    chapterIndex,
    authorIntent: await readOptionalText(paths.authorIntentPath),
    currentFocus: await readOptionalText(paths.currentFocusPath),
    truthFiles: await readTruthFiles(paths.truthRoot),
  };
}


export async function saveBookConfig(paths, book) {
  await writeJsonDocument(paths.bookConfigPath, parseBookConfig(book));
}


export async function saveChapterIndex(paths, chapterIndex) {
  await writeJsonDocument(paths.chapterIndexPath, parseChapterIndex(chapterIndex));
}


export function touchBook(book, status) {
  return {
    ...book,
    ...(status ? { status } : {}),
    updatedAt: nowIso(),
  };
}
