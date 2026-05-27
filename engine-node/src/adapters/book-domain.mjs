import { readdir } from 'node:fs/promises';

import { z } from 'zod';

import { normalizePlatformOrOther } from '../../vendor/inkos-models/book.mjs';
import {
  chapterPath,
  createBookPaths,
  fileExists,
  loadBookWorkspace,
  nowIso,
  readJsonDocument,
  readOptionalText,
  saveBookConfig,
  writeJsonDocument,
  writeTextDocument,
} from './book-workspace.mjs';


const CharacterProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1).default('character'),
  summary: z.string().default(''),
  biography: z.string().default(''),
  traits: z.array(z.string().min(1)).default([]),
  aliases: z.array(z.string().min(1)).default([]),
  notes: z.string().default(''),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const CharacterProfileListSchema = z.array(CharacterProfileSchema);

const RelationshipSchema = z.object({
  id: z.string().min(1),
  fromCharacterId: z.string().min(1),
  toCharacterId: z.string().min(1),
  type: z.enum(['bloodline', 'family', 'ally', 'enemy', 'mentor', 'romance', 'rival', 'other']),
  label: z.string().default(''),
  summary: z.string().default(''),
  strength: z.number().min(0).max(1).default(0.5),
  validAt: z.string().min(1).optional(),
  invalidAt: z.string().min(1).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const RelationshipListSchema = z.array(RelationshipSchema);

const ZepEpisodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().default(''),
  chapterId: z.string().min(1).optional(),
  occurredAt: z.string().min(1).optional(),
  recordedAt: z.string().datetime(),
  location: z.string().default(''),
  participantIds: z.array(z.string().min(1)).default([]),
  tags: z.array(z.string().min(1)).default([]),
});

const ZepEntitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(['character', 'location', 'artifact', 'faction', 'event', 'concept', 'other']),
  summary: z.string().default(''),
  aliases: z.array(z.string().min(1)).default([]),
  attributes: z.record(z.string(), z.unknown()).default({}),
});

const ZepFactSchema = z.object({
  id: z.string().min(1),
  sourceEntityId: z.string().min(1),
  targetEntityId: z.string().min(1).optional(),
  relation: z.string().min(1),
  summary: z.string().default(''),
  episodeIds: z.array(z.string().min(1)).default([]),
  validAt: z.string().min(1).optional(),
  invalidAt: z.string().min(1).optional(),
  attributes: z.record(z.string(), z.unknown()).default({}),
});

const ZepGraphSchema = z.object({
  schemaVersion: z.literal(1),
  episodes: z.array(ZepEpisodeSchema).default([]),
  entities: z.array(ZepEntitySchema).default([]),
  facts: z.array(ZepFactSchema).default([]),
});


function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}


function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}


function deriveEntityId(name, fallbackPrefix = 'item') {
  const normalized = normalizeText(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || `${fallbackPrefix}-${Date.now().toString(36)}`;
}


function parseCharacters(value) {
  return CharacterProfileListSchema.parse(value ?? []);
}


function parseRelationships(value) {
  return RelationshipListSchema.parse(value ?? []);
}


function parseZepGraph(value) {
  return ZepGraphSchema.parse(value ?? emptyZepGraph());
}


export function emptyZepGraph() {
  return {
    schemaVersion: 1,
    episodes: [],
    entities: [],
    facts: [],
  };
}


export async function ensureDomainArtifacts(paths) {
  if (!(await fileExists(paths.charactersPath))) {
    await writeJsonDocument(paths.charactersPath, []);
  }
  if (!(await fileExists(paths.relationshipsPath))) {
    await writeJsonDocument(paths.relationshipsPath, []);
  }
  if (!(await fileExists(paths.zepGraphPath))) {
    await writeJsonDocument(paths.zepGraphPath, emptyZepGraph());
  }
}


export async function loadDomainArtifacts(paths) {
  await ensureDomainArtifacts(paths);
  return {
    characters: parseCharacters(await readJsonDocument(paths.charactersPath, 'character profiles')),
    relationships: parseRelationships(await readJsonDocument(paths.relationshipsPath, 'relationships')),
    zepGraph: parseZepGraph(await readJsonDocument(paths.zepGraphPath, 'zep graph')),
  };
}


function synchronizeTemporalGraph(characters, relationships, zepGraph) {
  const externalEntities = zepGraph.entities.filter((entity) => entity.kind !== 'character');
  const characterEntities = characters.map((character) => ({
    id: character.id,
    name: character.name,
    kind: 'character',
    summary: character.summary,
    aliases: character.aliases,
    attributes: {
      role: character.role,
      biography: character.biography,
      traits: character.traits,
      notes: character.notes,
      updatedAt: character.updatedAt,
    },
  }));
  const externalFacts = zepGraph.facts.filter((fact) => fact.attributes?.source !== 'relationship-sync');
  const relationshipFacts = relationships.map((relationship) => ({
    id: relationship.id,
    sourceEntityId: relationship.fromCharacterId,
    targetEntityId: relationship.toCharacterId,
    relation: relationship.type,
    summary: relationship.summary || relationship.label,
    episodeIds: [],
    ...(relationship.validAt ? { validAt: relationship.validAt } : {}),
    ...(relationship.invalidAt ? { invalidAt: relationship.invalidAt } : {}),
    attributes: {
      source: 'relationship-sync',
      label: relationship.label,
      strength: relationship.strength,
    },
  }));

  return parseZepGraph({
    ...zepGraph,
    entities: [...externalEntities, ...characterEntities],
    facts: [...externalFacts, ...relationshipFacts],
  });
}


export async function saveDomainArtifacts(paths, domain) {
  const characters = parseCharacters(domain.characters);
  const relationships = parseRelationships(domain.relationships);
  const zepGraph = synchronizeTemporalGraph(characters, relationships, parseZepGraph(domain.zepGraph));

  await writeJsonDocument(paths.charactersPath, characters);
  await writeJsonDocument(paths.relationshipsPath, relationships);
  await writeJsonDocument(paths.zepGraphPath, zepGraph);

  return {
    characters,
    relationships,
    zepGraph,
  };
}


export async function listBooks(workspaceRoot) {
  const projectsRoot = createBookPaths(workspaceRoot, 'placeholder-book').projectsRoot;
  let entries = [];
  try {
    entries = await readdir(projectsRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  const books = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const paths = createBookPaths(workspaceRoot, entry.name);
    if (!(await fileExists(paths.bookConfigPath))) {
      continue;
    }
    const state = await loadBookWorkspace(workspaceRoot, entry.name);
    const domain = await loadDomainArtifacts(state.paths);
    books.push({
      id: state.book.id,
      title: state.book.title,
      genre: state.book.genre,
      platform: state.book.platform,
      status: state.book.status,
      updatedAt: state.book.updatedAt,
      chapterCount: state.chapterIndex.length,
      characterCount: domain.characters.length,
      relationshipCount: domain.relationships.length,
      episodeCount: domain.zepGraph.episodes.length,
    });
  }

  return books.sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
}


export async function getBookDetail(workspaceRoot, bookId) {
  const state = await loadBookWorkspace(workspaceRoot, bookId);
  const domain = await loadDomainArtifacts(state.paths);
  const chapters = [];
  for (const chapter of state.chapterIndex) {
    chapters.push({
      ...chapter,
      content: await readOptionalText(chapterPath(state.paths, chapter.id)),
    });
  }

  return {
    book: state.book,
    authorIntent: state.authorIntent,
    currentFocus: state.currentFocus,
    truthFiles: state.truthFiles,
    chapters,
    domain,
    paths: {
      bookRoot: state.paths.bookRoot,
      charactersPath: state.paths.charactersPath,
      relationshipsPath: state.paths.relationshipsPath,
      zepGraphPath: state.paths.zepGraphPath,
    },
  };
}


export async function updateBookMetadata(workspaceRoot, bookId, payload) {
  const state = await loadBookWorkspace(workspaceRoot, bookId);
  const nextBook = {
    ...state.book,
    ...(normalizeText(payload?.title) ? { title: normalizeText(payload.title) } : {}),
    ...(normalizeText(payload?.genre) ? { genre: normalizeText(payload.genre) } : {}),
    ...(payload?.platform !== undefined ? { platform: normalizePlatformOrOther(payload.platform) } : {}),
    ...(Number.isInteger(payload?.targetChapters) ? { targetChapters: payload.targetChapters } : {}),
    ...(Number.isInteger(payload?.chapterWordCount) ? { chapterWordCount: payload.chapterWordCount } : {}),
    ...(payload?.language === 'zh' || payload?.language === 'en' ? { language: payload.language } : {}),
    updatedAt: nowIso(),
  };

  await saveBookConfig(state.paths, nextBook);

  if (payload && Object.prototype.hasOwnProperty.call(payload, 'authorIntent')) {
    await writeTextDocument(state.paths.authorIntentPath, normalizeText(payload.authorIntent));
  }
  if (payload && Object.prototype.hasOwnProperty.call(payload, 'currentFocus')) {
    await writeTextDocument(state.paths.currentFocusPath, normalizeText(payload.currentFocus));
  }

  return getBookDetail(workspaceRoot, bookId);
}


export async function replaceCharacters(workspaceRoot, bookId, payload) {
  const state = await loadBookWorkspace(workspaceRoot, bookId);
  const existing = await loadDomainArtifacts(state.paths);
  const timestamp = nowIso();
  const characters = (Array.isArray(payload?.characters) ? payload.characters : []).map((character, index) => ({
    id: normalizeText(character?.id) || `character-${String(index + 1).padStart(3, '0')}-${deriveEntityId(character?.name, 'character')}`,
    name: normalizeText(character?.name) || `Character ${index + 1}`,
    role: normalizeText(character?.role) || 'character',
    summary: normalizeText(character?.summary),
    biography: normalizeText(character?.biography),
    traits: normalizeStringList(character?.traits),
    aliases: normalizeStringList(character?.aliases),
    notes: normalizeText(character?.notes),
    createdAt: normalizeText(character?.createdAt) || timestamp,
    updatedAt: timestamp,
  }));

  return saveDomainArtifacts(state.paths, {
    characters,
    relationships: existing.relationships,
    zepGraph: existing.zepGraph,
  });
}


export async function replaceRelationships(workspaceRoot, bookId, payload) {
  const state = await loadBookWorkspace(workspaceRoot, bookId);
  const existing = await loadDomainArtifacts(state.paths);
  const timestamp = nowIso();
  const relationships = (Array.isArray(payload?.relationships) ? payload.relationships : []).map((relationship, index) => ({
    id: normalizeText(relationship?.id) || `relationship-${String(index + 1).padStart(3, '0')}`,
    fromCharacterId: normalizeText(relationship?.fromCharacterId),
    toCharacterId: normalizeText(relationship?.toCharacterId),
    type: normalizeText(relationship?.type) || 'other',
    label: normalizeText(relationship?.label),
    summary: normalizeText(relationship?.summary),
    strength: typeof relationship?.strength === 'number' ? relationship.strength : 0.5,
    ...(normalizeText(relationship?.validAt) ? { validAt: normalizeText(relationship.validAt) } : {}),
    ...(normalizeText(relationship?.invalidAt) ? { invalidAt: normalizeText(relationship.invalidAt) } : {}),
    createdAt: normalizeText(relationship?.createdAt) || timestamp,
    updatedAt: timestamp,
  }));

  return saveDomainArtifacts(state.paths, {
    characters: existing.characters,
    relationships,
    zepGraph: existing.zepGraph,
  });
}


export async function replaceZepGraph(workspaceRoot, bookId, payload) {
  const state = await loadBookWorkspace(workspaceRoot, bookId);
  const existing = await loadDomainArtifacts(state.paths);
  const graphPayload = parseZepGraph(payload?.zepGraph ?? payload ?? emptyZepGraph());

  return saveDomainArtifacts(state.paths, {
    characters: existing.characters,
    relationships: existing.relationships,
    zepGraph: graphPayload,
  });
}
