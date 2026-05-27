import { basename } from 'node:path';

import { deriveBookIdFromTitle } from '../../vendor/inkos-core/book-id.mjs';
import {
  appendManualSessionMessages,
  appendTranscriptEvents,
  transcriptPath,
} from '../../vendor/inkos-interaction/session-transcript.mjs';
import {
  buildShortFictionPackageSystemPrompt,
  buildShortFictionPackageUserPrompt,
} from '../../vendor/inkos-short-fiction/package-prompts.mjs';
import { parseShortFictionSalesPackage } from '../../vendor/inkos-short-fiction/package-parser.mjs';
import { safeChildPath } from '../../vendor/inkos-core/path-safety.mjs';
import { generateText, loadModelConfig } from './model-client.mjs';
import {
  beginInteractionSession,
  completeInteractionSession,
  failInteractionSession,
} from './interaction-runtime.mjs';
import {
  loadBookRuntimeState,
  persistChapterRuntimeState,
} from './pipeline-runtime.mjs';
import {
  appendTextDocument,
  chapterPath,
  countWords,
  deriveChapterId,
  ensureBookDirectories,
  fileExists,
  loadBookWorkspace,
  normalizeOptionalString,
  nowIso,
  readOptionalText,
  requireNonEmptyString,
  saveBookConfig,
  saveChapterIndex,
  touchBook,
  writeJsonDocument,
  writeTextDocument,
} from './book-workspace.mjs';


function buildChapterMarkdown(title, content) {
  const body = normalizeOptionalString(content);
  return `# ${title}\n\n${body || 'Continue the draft from the latest story focus.'}`;
}


function buildGeneratedChapterContent(book, authorIntent, currentFocus, chapterNumber, title, prompt) {
  const sections = [
    `${book.title} chapter ${chapterNumber}: ${title}.`,
    currentFocus ? `Current focus: ${currentFocus}.` : '',
    authorIntent ? `Author intent: ${authorIntent}.` : '',
    prompt ? `Scene brief: ${prompt}.` : '',
    'Advance the conflict with one concrete decision and end on a forward-looking image.',
  ].filter(Boolean);
  return sections.join(' ');
}


function countOccurrences(text, searchValue) {
  if (!searchValue) {
    return 0;
  }
  return text.split(searchValue).length - 1;
}


function replaceOccurrences(text, fromValue, toValue) {
  const count = countOccurrences(text, fromValue);
  return {
    count,
    nextText: count > 0 ? text.split(fromValue).join(toValue) : text,
  };
}


function renderShortFictionDraftMarkdown(title, content) {
  const normalizedTitle = normalizeOptionalString(title) || 'Untitled Short Fiction';
  const normalizedContent = normalizeOptionalString(content);
  if (!normalizedContent) {
    return `# ${normalizedTitle}`;
  }
  if (normalizedContent.startsWith('#')) {
    return normalizedContent;
  }
  return `# ${normalizedTitle}\n\n${normalizedContent}`;
}


function buildShortFictionOutlineMarkdown(state, title, prompt) {
  return [
    `# ${title}`,
    '',
    '## Story direction',
    prompt,
    '',
    '## Active book context',
    `Source book: ${state.book.title}`,
    `Genre: ${state.book.genre}`,
    `Platform: ${state.book.platform}`,
    '',
    '## Narrative anchors',
    `Author intent: ${state.authorIntent || 'Not set.'}`,
    `Current focus: ${state.currentFocus || 'Not set.'}`,
  ].join('\n');
}


function buildShortFictionPackageFallback(title, prompt, state) {
  const sellingPoints = [
    `- Strong conflict hook built from: ${prompt}`,
    `- Connects back to ${state.book.title} through the current narrative pressure.`,
    `- Keeps a mobile-first commercial reading rhythm with a clear payoff.`,
  ].join('\n');
  const intro = [
    `${title} follows a high-pressure side story spun out of ${state.book.title}.`,
    `The core pull is ${prompt.toLowerCase()}.`,
    'It is framed as a compact payoff-driven read rather than a detached appendix.',
  ].join(' ');
  const coverPrompt = [
    `3:4 vertical cover for ${title}.`,
    `Mood: ${state.currentFocus || 'tense and cinematic'}.`,
    `Genre: ${state.book.genre}.`,
    `Include one clear emotional focal character and one recognizable prop tied to ${prompt}.`,
    'High-contrast commercial palette, mobile reading title area, avoid film-poster clutter.',
  ].join(' ');

  return [
    '=== SHORT_FICTION_PACKAGE_TITLE ===',
    title,
    '=== SHORT_FICTION_INTRO ===',
    intro,
    '=== SHORT_FICTION_SELLING_POINTS ===',
    sellingPoints,
    '=== SHORT_FICTION_COVER_PROMPT ===',
    coverPrompt,
  ].join('\n');
}


async function appendStoryLog(path, heading, lines) {
  const body = [`## ${heading}`, ...lines.filter(Boolean)].join('\n');
  await appendTextDocument(path, body);
}


function describeBookContext(state) {
  const latestChapters = state.chapterIndex.length > 0
    ? state.chapterIndex.slice(-3).map((chapter) => `${chapter.number}. ${chapter.title}: ${chapter.summary}`).join('\n')
    : 'No chapters drafted yet.';

  return [
    `Title: ${state.book.title}`,
    `Genre: ${state.book.genre}`,
    `Platform: ${state.book.platform}`,
    `Author intent: ${state.authorIntent || 'Not set.'}`,
    `Current focus: ${state.currentFocus || 'Not set.'}`,
    `Recent chapters:\n${latestChapters}`,
  ].join('\n');
}


async function maybeGenerateText({ systemPrompt, userPrompt, fallback, temperature = 1.2, maxTokens = 4096 }) {
  const config = await loadModelConfig();
  if (!config.enabled) {
    return {
      text: fallback,
      mode: 'template',
      model: null,
      provider: null,
      usage: null,
    };
  }

  const result = await generateText({
    systemPrompt,
    userPrompt,
    temperature,
    maxTokens,
  });

  return {
    text: result.text,
    mode: 'model',
    model: result.model,
    provider: result.provider,
    usage: result.usage,
  };
}


export async function updateAuthorIntent(workspaceRoot, payload) {
  const bookId = requireNonEmptyString(payload?.bookId, 'update_author_intent.payload.bookId');
  const content = requireNonEmptyString(
    payload?.content ?? payload?.authorIntent,
    'update_author_intent.payload.content',
  );
  const state = await loadBookWorkspace(workspaceRoot, bookId);
  const book = touchBook(state.book, 'developing');

  await writeTextDocument(state.paths.authorIntentPath, content);
  await saveBookConfig(state.paths, book);

  return {
    book,
    authorIntent: content,
    paths: {
      authorIntentPath: state.paths.authorIntentPath,
    },
  };
}


export async function updateCurrentFocus(workspaceRoot, payload) {
  const bookId = requireNonEmptyString(payload?.bookId, 'update_current_focus.payload.bookId');
  const content = requireNonEmptyString(
    payload?.content ?? payload?.currentFocus,
    'update_current_focus.payload.content',
  );
  const state = await loadBookWorkspace(workspaceRoot, bookId);
  const book = touchBook(state.book, 'developing');

  await writeTextDocument(state.paths.currentFocusPath, content);
  await saveBookConfig(state.paths, book);

  return {
    book,
    currentFocus: content,
    paths: {
      currentFocusPath: state.paths.currentFocusPath,
    },
  };
}


export async function developBook(workspaceRoot, payload) {
  const bookId = requireNonEmptyString(payload?.bookId, 'develop_book.payload.bookId');
  const note = normalizeOptionalString(payload?.note ?? payload?.summary ?? payload?.plan);
  const authorIntent = normalizeOptionalString(payload?.authorIntent);
  const currentFocus = normalizeOptionalString(payload?.currentFocus);

  if (!note && !authorIntent && !currentFocus) {
    throw new Error('develop_book.payload.note, authorIntent, or currentFocus is required');
  }

  const state = await loadBookWorkspace(workspaceRoot, bookId);
  const nextAuthorIntent = authorIntent || state.authorIntent;
  const nextCurrentFocus = currentFocus || state.currentFocus;
  const book = touchBook(state.book, 'developing');

  if (authorIntent) {
    await writeTextDocument(state.paths.authorIntentPath, authorIntent);
  }
  if (currentFocus) {
    await writeTextDocument(state.paths.currentFocusPath, currentFocus);
  }

  await appendStoryLog(
    state.paths.developmentLogPath,
    `${nowIso()} develop_book`,
    [note, authorIntent ? `Author intent: ${authorIntent}` : '', currentFocus ? `Current focus: ${currentFocus}` : ''],
  );
  await saveBookConfig(state.paths, book);

  return {
    book,
    note,
    authorIntent: nextAuthorIntent,
    currentFocus: nextCurrentFocus,
    paths: {
      developmentLogPath: state.paths.developmentLogPath,
    },
  };
}


export async function writeNext(workspaceRoot, payload) {
  const bookId = requireNonEmptyString(payload?.bookId, 'write_next.payload.bookId');
  const state = await loadBookWorkspace(workspaceRoot, bookId);
  const chapterId = deriveChapterId(payload, state.chapterIndex.length);

  if (state.chapterIndex.some((chapter) => chapter.id === chapterId)) {
    throw new Error(`Chapter already exists: ${chapterId}`);
  }

  const chapterNumber = state.chapterIndex.length + 1;
  const title = normalizeOptionalString(payload?.title) || `Chapter ${String(chapterNumber).padStart(2, '0')}`;
  const prompt = normalizeOptionalString(payload?.prompt ?? payload?.summary);
  const manualContent = normalizeOptionalString(payload?.content);
  const generated = manualContent
    ? {
        text: manualContent,
        mode: 'manual',
        model: null,
        provider: null,
        usage: null,
      }
    : await maybeGenerateText({
        systemPrompt: 'You are the InkOS-derived drafting engine inside Book Hermes Agent. Write vivid, coherent novel prose without explanations or markdown fences.',
        userPrompt: [
          describeBookContext(state),
          `Write chapter ${chapterNumber} titled ${title}.`,
          prompt ? `Scene brief: ${prompt}` : '',
          'Return only the chapter body prose.',
        ].filter(Boolean).join('\n\n'),
        fallback: buildGeneratedChapterContent(state.book, state.authorIntent, state.currentFocus, chapterNumber, title, prompt),
        temperature: 1.3,
        maxTokens: Number.isInteger(state.book.chapterWordCount) ? state.book.chapterWordCount * 2 : 4096,
      });
  const content = generated.text;
  const markdown = normalizeOptionalString(payload?.markdown) || buildChapterMarkdown(title, content);
  const summary = normalizeOptionalString(payload?.summary) || state.currentFocus || `Drafted ${title}`;
  const chapterFilePath = chapterPath(state.paths, chapterId);
  const currentFocus = normalizeOptionalString(payload?.nextFocus) || state.currentFocus;
  const chapter = {
    id: chapterId,
    number: chapterNumber,
    title,
    summary,
    status: 'draft',
    revision: 1,
    wordCount: countWords(content),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    path: `chapters/${chapterId}.md`,
  };
  const chapterIndex = [...state.chapterIndex, chapter];
  const book = touchBook(state.book, 'drafting');

  await writeTextDocument(chapterFilePath, markdown);
  await saveChapterIndex(state.paths, chapterIndex);
  if (currentFocus && currentFocus !== state.currentFocus) {
    await writeTextDocument(state.paths.currentFocusPath, currentFocus);
  }
  await saveBookConfig(state.paths, book);
  const runtimeState = await persistChapterRuntimeState(state.paths, book, chapter, payload);

  return {
    book,
    chapter,
    currentFocus,
    runtimeState,
    generation: {
      mode: generated.mode,
      provider: generated.provider,
      model: generated.model,
      usage: generated.usage,
    },
    paths: {
      chapterPath: chapterFilePath,
      chapterIndexPath: state.paths.chapterIndexPath,
    },
  };
}


function stripHeading(markdown) {
  return markdown.replace(/^# .*\n+/u, '').trim();
}


export async function reviseChapter(workspaceRoot, payload) {
  const bookId = requireNonEmptyString(payload?.bookId, 'revise_chapter.payload.bookId');
  const chapterId = requireNonEmptyString(payload?.chapterId, 'revise_chapter.payload.chapterId');
  const state = await loadBookWorkspace(workspaceRoot, bookId);
  const chapterIndexPosition = state.chapterIndex.findIndex((chapter) => chapter.id === chapterId);

  if (chapterIndexPosition < 0) {
    throw new Error(`Unknown chapterId: ${chapterId}`);
  }

  const existingChapter = state.chapterIndex[chapterIndexPosition];
  const chapterFilePath = chapterPath(state.paths, chapterId);
  const existingMarkdown = await readOptionalText(chapterFilePath);
  const title = normalizeOptionalString(payload?.title) || existingChapter.title;
  const requestedRevision = normalizeOptionalString(payload?.revisedContent ?? payload?.content);
  const generated = requestedRevision
    ? {
        text: requestedRevision,
        mode: 'manual',
        model: null,
        provider: null,
        usage: null,
      }
    : await maybeGenerateText({
        systemPrompt: 'You are the InkOS-derived reviser inside Book Hermes Agent. Revise the chapter prose while preserving continuity and returning only the revised chapter body.',
        userPrompt: [
          describeBookContext(state),
          `Revise chapter ${existingChapter.number} titled ${title}.`,
          `Current chapter body:\n${stripHeading(existingMarkdown) || 'No chapter body yet.'}`,
          normalizeOptionalString(payload?.instruction) ? `Revision brief: ${normalizeOptionalString(payload.instruction)}` : '',
        ].filter(Boolean).join('\n\n'),
        fallback: stripHeading(existingMarkdown),
        temperature: 1.1,
        maxTokens: Number.isInteger(state.book.chapterWordCount) ? state.book.chapterWordCount * 2 : 4096,
      });
  const content = generated.text;

  if (!content) {
    throw new Error('revise_chapter.payload.content is required');
  }

  const markdown = normalizeOptionalString(payload?.markdown) || buildChapterMarkdown(title, content);
  const revisedChapter = {
    ...existingChapter,
    title,
    summary: normalizeOptionalString(payload?.summary) || existingChapter.summary,
    status: 'revised',
    revision: Number(existingChapter.revision ?? 1) + 1,
    wordCount: countWords(content),
    updatedAt: nowIso(),
  };
  const chapterIndex = [...state.chapterIndex];
  chapterIndex[chapterIndexPosition] = revisedChapter;
  const book = touchBook(state.book, 'drafting');

  await writeTextDocument(chapterFilePath, markdown);
  await saveChapterIndex(state.paths, chapterIndex);
  await saveBookConfig(state.paths, book);
  const runtimeState = await persistChapterRuntimeState(
    state.paths,
    book,
    revisedChapter,
    payload,
    { allowReapply: true },
  );

  return {
    book,
    chapter: revisedChapter,
    runtimeState,
    generation: {
      mode: generated.mode,
      provider: generated.provider,
      model: generated.model,
      usage: generated.usage,
    },
    paths: {
      chapterPath: chapterFilePath,
    },
  };
}


export async function renameEntity(workspaceRoot, payload) {
  const bookId = requireNonEmptyString(payload?.bookId, 'rename_entity.payload.bookId');
  const fromValue = requireNonEmptyString(payload?.from, 'rename_entity.payload.from');
  const toValue = requireNonEmptyString(payload?.to, 'rename_entity.payload.to');

  if (fromValue === toValue) {
    throw new Error('rename_entity payload values must differ');
  }

  const state = await loadBookWorkspace(workspaceRoot, bookId);
  const textTargets = [
    state.paths.authorIntentPath,
    state.paths.currentFocusPath,
    state.paths.developmentLogPath,
    state.paths.interactionLogPath,
    ...state.chapterIndex.map((chapter) => chapterPath(state.paths, chapter.id)),
    ...state.truthFiles.map((truthFile) => truthFile.path),
  ];
  const changedFiles = [];
  let totalReplacements = 0;

  for (const target of textTargets) {
    if (!(await fileExists(target))) {
      continue;
    }

    const currentText = await readOptionalText(target);
    const replacement = replaceOccurrences(currentText, fromValue, toValue);
    if (replacement.count > 0) {
      await writeTextDocument(target, replacement.nextText);
      changedFiles.push({ path: target, replacements: replacement.count });
      totalReplacements += replacement.count;
    }
  }

  const updatedBook = { ...state.book };
  const titleReplacement = replaceOccurrences(String(updatedBook.title ?? ''), fromValue, toValue);
  if (titleReplacement.count > 0) {
    updatedBook.title = titleReplacement.nextText;
    totalReplacements += titleReplacement.count;
  }

  const chapterIndex = state.chapterIndex.map((chapter) => {
    const title = replaceOccurrences(String(chapter.title ?? ''), fromValue, toValue);
    const summary = replaceOccurrences(String(chapter.summary ?? ''), fromValue, toValue);
    totalReplacements += title.count + summary.count;

    return {
      ...chapter,
      title: title.nextText,
      summary: summary.nextText,
      ...(title.count > 0 || summary.count > 0 ? { updatedAt: nowIso() } : {}),
    };
  });

  if (totalReplacements === 0) {
    throw new Error(`No occurrences of ${JSON.stringify(fromValue)} found in ${bookId}`);
  }

  const book = touchBook(updatedBook);
  await saveBookConfig(state.paths, book);
  await saveChapterIndex(state.paths, chapterIndex);

  return {
    book,
    replacements: totalReplacements,
    changedFiles,
  };
}


export async function editTruthFile(workspaceRoot, payload) {
  const bookId = requireNonEmptyString(payload?.bookId, 'edit_truth_file.payload.bookId');
  const fileName = normalizeOptionalString(payload?.truthFile ?? payload?.fileName) || 'canon.md';
  const content = requireNonEmptyString(payload?.content, 'edit_truth_file.payload.content');
  const mode = payload?.mode === 'append' ? 'append' : 'replace';
  const state = await loadBookWorkspace(workspaceRoot, bookId);
  const truthPath = safeChildPath(state.paths.truthRoot, fileName.endsWith('.md') ? fileName : `${fileName}.md`);
  const currentText = mode === 'append' ? await readOptionalText(truthPath) : '';
  const nextText = currentText ? `${currentText}\n${content}` : content;
  const book = touchBook(state.book);

  await ensureBookDirectories(state.paths);
  await writeTextDocument(truthPath, nextText);
  await saveBookConfig(state.paths, book);

  return {
    book,
    truthFile: basename(truthPath),
    mode,
    paths: {
      truthPath,
    },
  };
}


export async function exportBook(workspaceRoot, payload) {
  const bookId = requireNonEmptyString(payload?.bookId, 'export_book.payload.bookId');
  const state = await loadBookWorkspace(workspaceRoot, bookId);
  const chapters = [];

  for (const chapter of state.chapterIndex) {
    chapters.push({
      ...chapter,
      content: await readOptionalText(chapterPath(state.paths, chapter.id)),
    });
  }

  const bundle = {
    book: state.book,
    authorIntent: state.authorIntent,
    currentFocus: state.currentFocus,
    runtimeState: await loadBookRuntimeState(state.paths),
    truthFiles: state.truthFiles.map((truthFile) => ({
      name: truthFile.name,
      content: truthFile.content,
    })),
    chapters,
  };
  const manuscriptSections = [
    `# ${state.book.title}`,
    '',
    '## Metadata',
    `- Book ID: ${state.book.id}`,
    `- Genre: ${state.book.genre}`,
    `- Platform: ${state.book.platform}`,
    '',
    '## Author Intent',
    state.authorIntent || 'Not set.',
    '',
    '## Current Focus',
    state.currentFocus || 'Not set.',
  ];

  if (state.truthFiles.length > 0) {
    manuscriptSections.push('', '## Truth Files');
    for (const truthFile of state.truthFiles) {
      manuscriptSections.push('', `### ${truthFile.name}`, truthFile.content || '');
    }
  }

  manuscriptSections.push('', '## Chapters');
  for (const chapter of chapters) {
    manuscriptSections.push('', chapter.content || `# ${chapter.title}`);
  }

  await ensureBookDirectories(state.paths);
  await writeJsonDocument(state.paths.exportBundlePath, bundle);
  await writeTextDocument(state.paths.manuscriptPath, manuscriptSections.join('\n'));

  return {
    book: touchBook(state.book),
    exports: {
      chapterCount: chapters.length,
      manuscriptPath: state.paths.manuscriptPath,
      bundlePath: state.paths.exportBundlePath,
    },
  };
}


export async function shortFictionRun(workspaceRoot, payload) {
  const bookId = requireNonEmptyString(payload?.bookId, 'short_fiction_run.payload.bookId');
  const state = await loadBookWorkspace(workspaceRoot, bookId);
  const title = normalizeOptionalString(payload?.title) || `${state.book.title} Short Fiction`;
  const prompt = normalizeOptionalString(payload?.prompt ?? payload?.summary)
    || state.currentFocus
    || 'Write a compact story beat that sharpens the central conflict.';
  const fileStem = deriveBookIdFromTitle(title) || `short-fiction-${Date.now().toString(36)}`;
  const outputPath = safeChildPath(state.paths.exportsRoot, `${fileStem}.md`);
  const fallbackContent = [
    `# ${title}`,
    '',
    `Prompt: ${prompt}`,
    '',
    '## Opening',
    state.currentFocus || `Open inside the world of ${state.book.title}.`,
    '',
    '## Turn',
    state.authorIntent || 'Tighten the emotional and plot pressure.',
    '',
    '## Resolution',
    'Resolve the beat with a choice that could feed the next full-length chapter.',
  ].join('\n');
  const manualContent = normalizeOptionalString(payload?.content);
  const generated = manualContent
    ? {
        text: manualContent,
        mode: 'manual',
        model: null,
        provider: null,
        usage: null,
      }
    : await maybeGenerateText({
        systemPrompt: 'You are the InkOS-derived short fiction engine. Return only polished markdown for a compact side story.',
        userPrompt: [
          describeBookContext(state),
          `Write a short-fiction piece titled ${title}.`,
          `Story brief: ${prompt}`,
        ].join('\n\n'),
        fallback: fallbackContent,
        temperature: 1.4,
        maxTokens: 4096,
      });
  const content = generated.text;
  const draftMarkdown = renderShortFictionDraftMarkdown(title, content);
  const outlineMarkdown = buildShortFictionOutlineMarkdown(state, title, prompt);
  const packaging = await maybeGenerateText({
    systemPrompt: buildShortFictionPackageSystemPrompt(),
    userPrompt: buildShortFictionPackageUserPrompt({
      direction: prompt,
      outlineMarkdown,
      draftMarkdown,
      draftTitle: title,
    }),
    fallback: buildShortFictionPackageFallback(title, prompt, state),
    temperature: 0.9,
    maxTokens: 2400,
  });
  const salesPackage = parseShortFictionSalesPackage(packaging.text, title);
  const packagePath = safeChildPath(state.paths.exportsRoot, `${fileStem}.package.json`);
  const coverPromptPath = safeChildPath(state.paths.coversRoot, `${fileStem}-cover-prompt.md`);

  await ensureBookDirectories(state.paths);
  await writeTextDocument(outputPath, content);
  await writeJsonDocument(packagePath, {
    title: salesPackage.title,
    intro: salesPackage.intro,
    sellingPoints: salesPackage.sellingPoints,
    coverPrompt: salesPackage.coverPrompt,
  });
  await writeTextDocument(coverPromptPath, salesPackage.coverPrompt);

  return {
    book: touchBook(state.book),
    shortFiction: {
      title,
      path: outputPath,
      packagePath,
      coverPromptPath,
      wordCount: countWords(content),
    },
    salesPackage: {
      title: salesPackage.title,
      intro: salesPackage.intro,
      sellingPoints: salesPackage.sellingPoints,
      coverPrompt: salesPackage.coverPrompt,
    },
    generation: {
      mode: generated.mode,
      provider: generated.provider,
      model: generated.model,
      usage: generated.usage,
    },
    packagingGeneration: {
      mode: packaging.mode,
      provider: packaging.provider,
      model: packaging.model,
      usage: packaging.usage,
    },
  };
}


export async function generateCover(workspaceRoot, payload) {
  const bookId = requireNonEmptyString(payload?.bookId, 'generate_cover.payload.bookId');
  const state = await loadBookWorkspace(workspaceRoot, bookId);
  const cover = {
    title: state.book.title,
    subtitle: normalizeOptionalString(payload?.subtitle),
    genre: state.book.genre,
    platform: state.book.platform,
    style: normalizeOptionalString(payload?.style) || 'illustrated key art',
    mood: normalizeOptionalString(payload?.mood) || 'cinematic and high-contrast',
    palette: normalizeOptionalString(payload?.palette) || 'storm blue, brass, paper white',
    focalElements: [state.currentFocus, state.authorIntent].filter(Boolean),
    generatedAt: nowIso(),
  };
  const prompt = [
    `Create a ${cover.style} cover for ${cover.title}.`,
    cover.subtitle ? `Subtitle: ${cover.subtitle}.` : '',
    `Genre: ${cover.genre}. Platform: ${cover.platform}.`,
    `Mood: ${cover.mood}. Palette: ${cover.palette}.`,
    cover.focalElements.length > 0 ? `Focal elements: ${cover.focalElements.join('; ')}.` : '',
  ].filter(Boolean).join(' ');
  const generatedPrompt = await maybeGenerateText({
    systemPrompt: 'You are the InkOS-derived cover concept generator. Return only a polished cover art brief or prompt.',
    userPrompt: [
      describeBookContext(state),
      `Create a cover prompt for ${cover.title}.`,
      prompt,
    ].join('\n\n'),
    fallback: prompt,
    temperature: 1.1,
    maxTokens: 1200,
  });

  await ensureBookDirectories(state.paths);
  await writeJsonDocument(state.paths.coverBriefPath, cover);
  await writeTextDocument(state.paths.coverPromptPath, generatedPrompt.text);

  return {
    book: touchBook(state.book),
    cover,
    generation: {
      mode: generatedPrompt.mode,
      provider: generatedPrompt.provider,
      model: generatedPrompt.model,
      usage: generatedPrompt.usage,
    },
    paths: {
      coverBriefPath: state.paths.coverBriefPath,
      coverPromptPath: state.paths.coverPromptPath,
    },
  };
}


async function logInteraction(workspaceRoot, bookId, operation, lines) {
  const state = await loadBookWorkspace(workspaceRoot, bookId);
  await appendStoryLog(
    state.paths.interactionLogPath,
    `${nowIso()} ${operation}`,
    Array.isArray(lines) && lines.length > 0 ? lines : ['No freeform interaction text supplied.'],
  );
}


function buildTranscriptMessages(userText, assistantText) {
  const timestamp = Date.now();
  return [
    {
      role: 'user',
      content: [{ type: 'text', text: userText }],
      timestamp,
    },
    {
      role: 'assistant',
      content: [{ type: 'text', text: assistantText }],
      timestamp: timestamp + 1,
    },
  ];
}


async function persistInteractionTranscript(workspaceRoot, book, userText, assistantText) {
  const sessionId = book.id;
  const timestamp = Date.now();

  await appendTranscriptEvents(workspaceRoot, sessionId, ({ events, nextSeq }) => {
    if (events.length > 0) {
      return [];
    }

    return [{
      type: 'session_created',
      version: 1,
      sessionId,
      seq: nextSeq,
      timestamp,
      bookId: book.id,
      title: book.title,
      createdAt: timestamp,
      updatedAt: timestamp,
    }];
  });

  await appendManualSessionMessages(
    workspaceRoot,
    sessionId,
    buildTranscriptMessages(userText, assistantText),
    userText,
  );

  return {
    sessionId,
    transcriptPath: transcriptPath(workspaceRoot, sessionId),
  };
}


export async function runInteraction(workspaceRoot, payload, context = {}) {
  const runtimeSession = await beginInteractionSession(
    workspaceRoot,
    {
      intent: payload?.action ? String(payload.action) === 'update_current_focus' ? 'update_focus' : String(payload.action) : 'chat',
      ...(typeof payload?.bookId === 'string' && payload.bookId.trim() ? { bookId: payload.bookId } : {}),
    },
    payload,
  );

  try {
  const action = normalizeOptionalString(payload?.action ?? payload?.tool ?? payload?.operation);

  if (action && action !== 'run_interaction') {
    const forwardedPayload = typeof payload?.actionPayload === 'object' && payload.actionPayload !== null
      ? { ...payload.actionPayload }
      : { ...payload };
    delete forwardedPayload.action;
    delete forwardedPayload.tool;
    delete forwardedPayload.operation;
    delete forwardedPayload.actionPayload;
    if (payload?.bookId && !forwardedPayload.bookId) {
      forwardedPayload.bookId = payload.bookId;
    }

    const result = await context.dispatchOperation(action, forwardedPayload);
    if (forwardedPayload.bookId) {
      const state = await loadBookWorkspace(workspaceRoot, forwardedPayload.bookId);
      const promptText = normalizeOptionalString(payload?.prompt ?? payload?.message ?? payload?.instruction)
        || `Delegated operation ${action}`;
      const assistantText = `Delegated operation ${action} completed for ${state.book.title}.`;
      await logInteraction(
        workspaceRoot,
        forwardedPayload.bookId,
        `run_interaction -> ${action}`,
        [
          `User: ${promptText}`,
          `Delegated operation: ${action}`,
        ],
      );

      const transcript = await persistInteractionTranscript(
        workspaceRoot,
        state.book,
        promptText,
        assistantText,
      );

      await completeInteractionSession(
        workspaceRoot,
        runtimeSession,
        {
          intent: action === 'update_current_focus' ? 'update_focus' : action,
          bookId: forwardedPayload.bookId,
        },
        assistantText,
      );

      return {
        delegatedOperation: action,
        result,
        transcript,
      };
    }

    return {
      delegatedOperation: action,
      result,
    };
  }

  const bookId = requireNonEmptyString(payload?.bookId, 'run_interaction.payload.bookId');
  const message = requireNonEmptyString(
    payload?.prompt ?? payload?.message ?? payload?.instruction,
    'run_interaction.payload.prompt',
  );
  const state = await loadBookWorkspace(workspaceRoot, bookId);
  const fallbackResponse = `Recorded instruction for ${state.book.title}: ${message}`;
  const generated = await maybeGenerateText({
    systemPrompt: 'You are the InkOS-derived book interaction runtime. Respond as a concise, practical writing partner focused on the active project.',
    userPrompt: [
      describeBookContext(state),
      `User request: ${message}`,
      'Respond with the next best writing guidance or concrete narrative continuation advice.',
    ].join('\n\n'),
    fallback: fallbackResponse,
    temperature: 1,
    maxTokens: 1600,
  });

  await logInteraction(workspaceRoot, bookId, 'run_interaction', [
    `User: ${message}`,
    `Assistant: ${generated.text}`,
  ]);
  const transcript = await persistInteractionTranscript(workspaceRoot, state.book, message, generated.text);
  const persistedSession = await completeInteractionSession(
    workspaceRoot,
    runtimeSession,
    {
      intent: 'chat',
      bookId,
    },
    generated.text,
  );

  return {
    book: state.book,
    authorIntent: state.authorIntent,
    currentFocus: state.currentFocus,
    latestChapters: state.chapterIndex.slice(-3),
    recordedPrompt: message,
    assistantResponse: generated.text,
    generation: {
      mode: generated.mode,
      provider: generated.provider,
      model: generated.model,
      usage: generated.usage,
    },
    paths: {
      interactionLogPath: state.paths.interactionLogPath,
      transcriptPath: transcript.transcriptPath,
    },
    transcript,
    session: persistedSession,
  };
  } catch (error) {
    await failInteractionSession(
      workspaceRoot,
      runtimeSession,
      {
        intent: payload?.action ? String(payload.action) === 'update_current_focus' ? 'update_focus' : String(payload.action) : 'chat',
        ...(typeof payload?.bookId === 'string' && payload.bookId.trim() ? { bookId: payload.bookId } : {}),
      },
      error,
    );
    throw error;
  }
}
