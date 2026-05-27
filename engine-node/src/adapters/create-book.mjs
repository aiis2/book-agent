import { assertSafeBookId, deriveBookIdFromTitle } from '../../vendor/inkos-core/book-id.mjs';
import { normalizePlatformOrOther } from '../../vendor/inkos-models/book.mjs';
import { emptyZepGraph } from './book-domain.mjs';
import { initializeBookRuntimeState } from './pipeline-runtime.mjs';
import {
  createBookPaths,
  ensureBookDirectories,
  fileExists,
  nowIso,
  saveChapterIndex,
  saveBookConfig,
  writeJsonDocument,
  writeTextDocument,
} from './book-workspace.mjs';


function buildBookConfig(payload) {
  const now = nowIso();
  const title = String(payload.title ?? '').trim();
  if (!title) {
    throw new Error('create_book.payload.title is required');
  }

  const bookId = assertSafeBookId(
    String(payload.bookId ?? deriveBookIdFromTitle(title) ?? '').trim() || `book-${Date.now().toString(36)}`,
    'create_book.payload.bookId',
  );

  return {
    id: bookId,
    title,
    platform: normalizePlatformOrOther(payload.platform),
    genre: typeof payload.genre === 'string' && payload.genre.trim() ? payload.genre.trim() : 'other',
    status: 'outlining',
    targetChapters: Number.isInteger(payload.targetChapters) ? payload.targetChapters : 200,
    chapterWordCount: Number.isInteger(payload.chapterWordCount) ? payload.chapterWordCount : 3000,
    ...(payload.language === 'zh' || payload.language === 'en' ? { language: payload.language } : {}),
    createdAt: now,
    updatedAt: now,
  };
}


export async function createBook(workspaceRoot, payload) {
  const book = buildBookConfig(payload);
  const paths = createBookPaths(workspaceRoot, book.id);

  if (await fileExists(paths.bookConfigPath)) {
    throw new Error(`Book already exists: ${book.id}`);
  }

  await ensureBookDirectories(paths);

  await saveBookConfig(paths, book);
  await saveChapterIndex(paths, []);
  await writeJsonDocument(paths.charactersPath, []);
  await writeJsonDocument(paths.relationshipsPath, []);
  await writeJsonDocument(paths.zepGraphPath, emptyZepGraph());
  await writeTextDocument(paths.authorIntentPath, String(payload.authorIntent ?? '').trim());
  await writeTextDocument(paths.currentFocusPath, String(payload.currentFocus ?? '').trim());
  const runtimeState = await initializeBookRuntimeState(paths, book, {
    authorIntent: payload.authorIntent,
    currentFocus: payload.currentFocus,
  });

  return {
    book,
    runtimeState,
    paths: {
      bookRoot: paths.bookRoot,
      bookConfigPath: paths.bookConfigPath,
      chapterIndexPath: paths.chapterIndexPath,
      authorIntentPath: paths.authorIntentPath,
      currentFocusPath: paths.currentFocusPath,
      stateDir: paths.stateRoot,
    },
  };
}
