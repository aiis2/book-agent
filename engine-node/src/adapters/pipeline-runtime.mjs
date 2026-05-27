import {
  buildRuntimeStateArtifacts,
  ensureRuntimeState,
  loadRuntimeStateSnapshot,
  loadRuntimeStateBundle,
  persistRuntimeStateArtifacts,
} from '../../vendor/inkos-state/runtime-state-store.mjs';


function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}


function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }
  const text = normalizeText(value);
  return text ? [text] : [];
}


function normalizeInteger(value, fallback) {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}


function normalizeHookStatus(value) {
  return ['open', 'progressing', 'deferred', 'resolved'].includes(value) ? value : 'open';
}


function normalizePayoffTiming(value) {
  return ['immediate', 'near-term', 'mid-arc', 'slow-burn', 'endgame'].includes(value) ? value : undefined;
}


function normalizeHookRecord(hook, chapterNumber, index) {
  const hookId = normalizeText(hook?.hookId) || `hook-${String(chapterNumber).padStart(3, '0')}-${index + 1}`;
  return {
    hookId,
    startChapter: normalizeInteger(hook?.startChapter, chapterNumber),
    type: normalizeText(hook?.type) || 'plot',
    status: normalizeHookStatus(hook?.status),
    lastAdvancedChapter: normalizeInteger(hook?.lastAdvancedChapter, chapterNumber),
    expectedPayoff: normalizeText(hook?.expectedPayoff),
    ...(normalizePayoffTiming(hook?.payoffTiming) ? { payoffTiming: normalizePayoffTiming(hook.payoffTiming) } : {}),
    notes: normalizeText(hook?.notes),
    ...(Array.isArray(hook?.dependsOn) ? { dependsOn: normalizeStringList(hook.dependsOn) } : {}),
    ...(normalizeText(hook?.paysOffInArc) ? { paysOffInArc: normalizeText(hook.paysOffInArc) } : {}),
    ...(typeof hook?.coreHook === 'boolean' ? { coreHook: hook.coreHook } : {}),
    ...(Number.isInteger(hook?.halfLifeChapters) && hook.halfLifeChapters > 0 ? { halfLifeChapters: hook.halfLifeChapters } : {}),
    ...(Number.isInteger(hook?.advancedCount) && hook.advancedCount >= 0 ? { advancedCount: hook.advancedCount } : {}),
    ...(typeof hook?.promoted === 'boolean' ? { promoted: hook.promoted } : {}),
  };
}


function normalizeHookOps(runtimeState, chapterNumber) {
  const hookOps = runtimeState && typeof runtimeState === 'object' ? runtimeState.hookOps : undefined;
  return {
    upsert: Array.isArray(hookOps?.upsert)
      ? hookOps.upsert.map((hook, index) => normalizeHookRecord(hook, chapterNumber, index))
      : [],
    mention: normalizeStringList(hookOps?.mention),
    resolve: normalizeStringList(hookOps?.resolve),
    defer: normalizeStringList(hookOps?.defer),
  };
}


function buildCurrentStatePatch(payload) {
  const runtimeState = payload?.runtimeState && typeof payload.runtimeState === 'object' ? payload.runtimeState : {};
  const explicitPatch = runtimeState.currentStatePatch && typeof runtimeState.currentStatePatch === 'object'
    ? runtimeState.currentStatePatch
    : {};
  const nextFocus = normalizeText(payload?.nextFocus);
  const summary = normalizeText(payload?.summary);

  return {
    ...Object.fromEntries(
      Object.entries(explicitPatch)
        .map(([key, value]) => [key, normalizeText(value)])
        .filter(([, value]) => value),
    ),
    ...(nextFocus ? { currentGoal: nextFocus } : {}),
    ...(summary ? { currentConflict: summary } : {}),
  };
}


function buildChapterSummary(chapter, payload) {
  const runtimeState = payload?.runtimeState && typeof payload.runtimeState === 'object' ? payload.runtimeState : {};
  const explicitSummary = runtimeState.chapterSummary && typeof runtimeState.chapterSummary === 'object'
    ? runtimeState.chapterSummary
    : {};
  const hookOps = runtimeState.hookOps && typeof runtimeState.hookOps === 'object' ? runtimeState.hookOps : {};
  const hookActivity = [
    ...normalizeStringList(hookOps.mention).map((id) => `mentioned ${id}`),
    ...normalizeStringList(hookOps.resolve).map((id) => `resolved ${id}`),
    ...normalizeStringList(hookOps.defer).map((id) => `deferred ${id}`),
  ].join('; ');

  return {
    chapter: chapter.number,
    title: normalizeText(explicitSummary.title) || chapter.title,
    characters: normalizeStringList(explicitSummary.characters ?? payload?.characters).join(', '),
    events: normalizeText(explicitSummary.events) || normalizeText(payload?.summary) || chapter.summary,
    stateChanges: normalizeText(explicitSummary.stateChanges) || normalizeText(payload?.nextFocus),
    hookActivity: normalizeText(explicitSummary.hookActivity) || hookActivity,
    mood: normalizeText(explicitSummary.mood ?? payload?.mood),
    chapterType: normalizeText(explicitSummary.chapterType ?? payload?.chapterType),
  };
}


function buildRuntimeStateDelta(chapter, payload) {
  const runtimeState = payload?.runtimeState && typeof payload.runtimeState === 'object' ? payload.runtimeState : {};
  const patch = buildCurrentStatePatch(payload);
  return {
    chapter: chapter.number,
    ...(Object.keys(patch).length > 0 ? { currentStatePatch: patch } : {}),
    hookOps: normalizeHookOps(runtimeState, chapter.number),
    chapterSummary: buildChapterSummary(chapter, payload),
    notes: normalizeStringList(runtimeState.notes),
  };
}


export async function initializeBookRuntimeState(paths, book, seed = {}) {
  const ensured = await ensureRuntimeState(paths.bookRoot, {
    language: book.language === 'zh' ? 'zh' : 'en',
    authorIntent: normalizeText(seed.authorIntent),
    currentFocus: normalizeText(seed.currentFocus),
  });

  return {
    manifest: ensured.snapshot.manifest,
    paths: {
      stateDir: ensured.paths.stateDir,
      currentStatePath: ensured.paths.currentStateMarkdownPath,
      pendingHooksPath: ensured.paths.pendingHooksMarkdownPath,
      chapterSummariesPath: ensured.paths.chapterSummariesMarkdownPath,
    },
  };
}


export async function persistChapterRuntimeState(paths, book, chapter, payload, options = {}) {
  const delta = buildRuntimeStateDelta(chapter, payload);
  const currentSnapshot = await loadRuntimeStateSnapshot(paths.bookRoot);
  const historicalReapply = options.allowReapply === true
    && chapter.number < currentSnapshot.manifest.lastAppliedChapter;
  const artifacts = historicalReapply
    ? {
        previousSnapshot: currentSnapshot,
        snapshot: {
          ...currentSnapshot,
          manifest: {
            ...currentSnapshot.manifest,
            migrationWarnings: [
              ...new Set([
                ...currentSnapshot.manifest.migrationWarnings,
                `historical chapter ${chapter.number} summary re-applied without rewinding runtime state`,
              ]),
            ],
          },
          chapterSummaries: {
            rows: [
              ...currentSnapshot.chapterSummaries.rows.filter((row) => row.chapter !== chapter.number),
              delta.chapterSummary,
            ].sort((left, right) => left.chapter - right.chapter),
          },
        },
      }
    : await buildRuntimeStateArtifacts({
        bookRoot: paths.bookRoot,
        delta,
        allowReapply: options.allowReapply === true,
      });
  const persisted = await persistRuntimeStateArtifacts({
    bookRoot: paths.bookRoot,
    artifacts,
    chapterNumber: chapter.number,
  });

  return {
    manifest: persisted.snapshot.manifest,
    currentState: persisted.snapshot.currentState,
    hooks: persisted.snapshot.hooks,
    chapterSummaries: persisted.snapshot.chapterSummaries,
    paths: {
      stateDir: persisted.paths.stateDir,
      currentStatePath: persisted.paths.currentStateMarkdownPath,
      pendingHooksPath: persisted.paths.pendingHooksMarkdownPath,
      chapterSummariesPath: persisted.paths.chapterSummariesMarkdownPath,
      snapshotDir: `${persisted.paths.snapshotsDir}/${chapter.number}`,
    },
    bookId: book.id,
  };
}


export async function loadBookRuntimeState(paths) {
  const bundle = await loadRuntimeStateBundle(paths.bookRoot);
  return {
    manifest: bundle.manifest,
    currentState: bundle.currentState,
    hooks: bundle.hooks,
    chapterSummaries: bundle.chapterSummaries,
    paths: {
      stateDir: bundle.paths.stateDir,
      currentStatePath: bundle.paths.currentStateMarkdownPath,
      pendingHooksPath: bundle.paths.pendingHooksMarkdownPath,
      chapterSummariesPath: bundle.paths.chapterSummariesMarkdownPath,
    },
  };
}
