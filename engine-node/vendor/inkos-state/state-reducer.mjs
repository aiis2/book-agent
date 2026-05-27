import {
  ChapterSummariesStateSchema,
  CurrentStateStateSchema,
  HooksStateSchema,
  RuntimeStateDeltaSchema,
  StateManifestSchema,
} from '../inkos-models/runtime-state.mjs';
import { validateRuntimeState } from './state-validator.mjs';


function preferRicherText(primary, fallback) {
  const left = String(primary ?? '').trim();
  const right = String(fallback ?? '').trim();

  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  if (left === right) {
    return left;
  }
  return right.length > left.length ? right : left;
}


function mergeHook(existing, incoming) {
  const expectedPayoff = preferRicherText(existing.expectedPayoff, incoming.expectedPayoff);
  const notes = preferRicherText(existing.notes, incoming.notes);
  const lastAdvancedChapter = Math.max(existing.lastAdvancedChapter, incoming.lastAdvancedChapter);

  return {
    ...existing,
    ...incoming,
    startChapter: Math.min(existing.startChapter, incoming.startChapter),
    status: incoming.status === 'open' && existing.status !== 'open' ? existing.status : incoming.status,
    lastAdvancedChapter,
    expectedPayoff,
    notes,
  };
}


function applyHookOps(hooksState, delta) {
  const hooksById = new Map(hooksState.hooks.map((hook) => [hook.hookId, { ...hook }]));

  for (const hook of delta.hookOps.upsert) {
    const existing = hooksById.get(hook.hookId);
    hooksById.set(hook.hookId, existing ? mergeHook(existing, hook) : { ...hook });
  }

  for (const hookId of delta.hookOps.mention) {
    const existing = hooksById.get(hookId);
    if (!existing || existing.status === 'resolved') {
      continue;
    }
    hooksById.set(hookId, {
      ...existing,
      status: existing.status === 'open' ? 'progressing' : existing.status,
      lastAdvancedChapter: Math.max(existing.lastAdvancedChapter, delta.chapter),
      advancedCount: Number(existing.advancedCount ?? 0) + 1,
    });
  }

  for (const hookId of delta.hookOps.resolve) {
    const existing = hooksById.get(hookId);
    if (!existing) {
      continue;
    }
    hooksById.set(hookId, {
      ...existing,
      status: 'resolved',
      lastAdvancedChapter: Math.max(existing.lastAdvancedChapter, delta.chapter),
    });
  }

  for (const hookId of delta.hookOps.defer) {
    const existing = hooksById.get(hookId);
    if (!existing || existing.status === 'resolved') {
      continue;
    }
    hooksById.set(hookId, {
      ...existing,
      status: 'deferred',
      lastAdvancedChapter: Math.max(existing.lastAdvancedChapter, delta.chapter),
    });
  }

  return {
    hooks: [...hooksById.values()].sort((left, right) => (
      left.startChapter - right.startChapter
      || left.lastAdvancedChapter - right.lastAdvancedChapter
      || left.hookId.localeCompare(right.hookId)
    )),
  };
}


function applyCurrentStatePatch(currentState, delta) {
  if (!delta.currentStatePatch) {
    return {
      chapter: delta.chapter,
      facts: [...currentState.facts],
    };
  }

  const labels = {
    currentLocation: ['Current Location'],
    protagonistState: ['Protagonist State'],
    currentGoal: ['Current Goal'],
    currentConstraint: ['Current Constraint'],
    currentAlliances: ['Current Alliances', 'Current Relationships'],
    currentConflict: ['Current Conflict'],
  };
  const nextFacts = [...currentState.facts];

  for (const [patchKey, aliases] of Object.entries(labels)) {
    const value = delta.currentStatePatch[patchKey];
    if (value === undefined || String(value).trim().length === 0) {
      continue;
    }

    for (let index = nextFacts.length - 1; index >= 0; index -= 1) {
      const predicate = nextFacts[index]?.predicate ?? '';
      if (aliases.some((alias) => alias.toLowerCase() === predicate.toLowerCase())) {
        nextFacts.splice(index, 1);
      }
    }

    nextFacts.push({
      subject: 'protagonist',
      predicate: aliases[0],
      object: String(value).trim(),
      validFromChapter: delta.chapter,
      validUntilChapter: null,
      sourceChapter: delta.chapter,
    });
  }

  return {
    chapter: delta.chapter,
    facts: nextFacts.sort((left, right) => (
      left.predicate.localeCompare(right.predicate)
      || left.object.localeCompare(right.object)
    )),
  };
}


function applySummaryDelta(state, delta, allowReapply) {
  if (!delta.chapterSummary) {
    return {
      rows: [...state.rows].sort((left, right) => left.chapter - right.chapter),
    };
  }

  return {
    rows: [
      ...(allowReapply ? state.rows.filter((row) => row.chapter !== delta.chapterSummary.chapter) : state.rows),
      delta.chapterSummary,
    ].sort((left, right) => left.chapter - right.chapter),
  };
}


export function applyRuntimeStateDelta(params) {
  const snapshot = {
    manifest: StateManifestSchema.parse(params.snapshot.manifest),
    currentState: CurrentStateStateSchema.parse(params.snapshot.currentState),
    hooks: HooksStateSchema.parse(params.snapshot.hooks),
    chapterSummaries: ChapterSummariesStateSchema.parse(params.snapshot.chapterSummaries),
  };
  const delta = RuntimeStateDeltaSchema.parse(params.delta);
  const allowReapply = params.allowReapply ?? false;

  if (allowReapply ? delta.chapter < snapshot.manifest.lastAppliedChapter : delta.chapter <= snapshot.manifest.lastAppliedChapter) {
    throw new Error(`delta chapter ${delta.chapter} goes backwards`);
  }
  if (
    delta.chapterSummary
    && snapshot.chapterSummaries.rows.some((row) => row.chapter === delta.chapterSummary.chapter)
    && !allowReapply
  ) {
    throw new Error(`duplicate summary row for chapter ${delta.chapterSummary.chapter}`);
  }

  const next = {
    manifest: {
      ...snapshot.manifest,
      lastAppliedChapter: delta.chapter,
    },
    currentState: applyCurrentStatePatch(snapshot.currentState, delta),
    hooks: applyHookOps(snapshot.hooks, delta),
    chapterSummaries: applySummaryDelta(snapshot.chapterSummaries, delta, allowReapply),
  };
  const issues = validateRuntimeState(next);
  if (issues.length > 0) {
    throw new Error(issues.map((issue) => `${issue.code}: ${issue.message}`).join('; '));
  }

  return next;
}
