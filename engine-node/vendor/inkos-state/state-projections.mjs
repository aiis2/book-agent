function escapeTableCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').trim();
}


function renderListCell(values) {
  return Array.isArray(values) && values.length > 0 ? `[${values.join(', ')}]` : 'none';
}


export function renderHooksProjection(state) {
  const headers = [
    '| hook_id | start_chapter | type | status | last_advanced_chapter | expected_payoff | payoff_timing | depends_on | pays_off_in_arc | core_hook | half_life | promoted | notes |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  const rows = [...state.hooks]
    .sort((left, right) => (
      left.startChapter - right.startChapter
      || left.lastAdvancedChapter - right.lastAdvancedChapter
      || left.hookId.localeCompare(right.hookId)
    ))
    .map((hook) => `| ${
      [
        hook.hookId,
        hook.startChapter,
        hook.type,
        hook.status,
        hook.lastAdvancedChapter,
        hook.expectedPayoff,
        hook.payoffTiming ?? '',
        renderListCell(hook.dependsOn ?? []),
        hook.paysOffInArc ?? '',
        hook.coreHook === undefined ? '' : String(hook.coreHook),
        hook.halfLifeChapters ?? '',
        hook.promoted === undefined ? '' : String(hook.promoted),
        hook.notes,
      ].map(escapeTableCell).join(' | ')
    } |`);

  return ['# Pending Hooks', '', ...headers, ...rows, ''].join('\n');
}


export function renderChapterSummariesProjection(state) {
  const headers = [
    '| Chapter | Title | Characters | Key Events | State Changes | Hook Activity | Mood | Chapter Type |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  const rows = [...state.rows]
    .sort((left, right) => left.chapter - right.chapter)
    .map((summary) => `| ${
      [
        summary.chapter,
        summary.title,
        summary.characters,
        summary.events,
        summary.stateChanges,
        summary.hookActivity,
        summary.mood,
        summary.chapterType,
      ].map(escapeTableCell).join(' | ')
    } |`);

  return ['# Chapter Summaries', '', ...headers, ...rows, ''].join('\n');
}


function normalizePredicate(value) {
  return String(value ?? '').trim().toLowerCase();
}


function findFactValue(state, aliases) {
  const aliasSet = new Set(aliases.map(normalizePredicate));
  return state.facts.find((fact) => aliasSet.has(normalizePredicate(fact.predicate)))?.object;
}


function renderAdditionalFact(fact) {
  if (/^note_\d+$/i.test(fact.predicate)) {
    return `- ${fact.object}`;
  }
  return `- ${fact.predicate}: ${fact.object}`;
}


export function renderCurrentStateProjection(state) {
  const slots = [
    { label: 'Current Location', aliases: ['Current Location'] },
    { label: 'Protagonist State', aliases: ['Protagonist State'] },
    { label: 'Current Goal', aliases: ['Current Goal'] },
    { label: 'Current Constraint', aliases: ['Current Constraint'] },
    { label: 'Current Alliances', aliases: ['Current Alliances', 'Current Relationships'] },
    { label: 'Current Conflict', aliases: ['Current Conflict'] },
  ];
  const knownPredicates = new Set(slots.flatMap((slot) => slot.aliases.map(normalizePredicate)));
  const lines = [
    '# Current State',
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| Current Chapter | ${escapeTableCell(state.chapter)} |`,
    ...slots.map((slot) => {
      const value = findFactValue(state, slot.aliases) ?? '(not set)';
      return `| ${slot.label} | ${escapeTableCell(value)} |`;
    }),
  ];
  const additionalFacts = [...state.facts]
    .filter((fact) => !knownPredicates.has(normalizePredicate(fact.predicate)))
    .sort((left, right) => left.predicate.localeCompare(right.predicate));

  if (additionalFacts.length === 0) {
    return [...lines, ''].join('\n');
  }

  return [
    ...lines,
    '',
    '## Additional State',
    ...additionalFacts.map(renderAdditionalFact),
    '',
  ].join('\n');
}
