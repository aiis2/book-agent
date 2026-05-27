export interface BookSummary {
  id: string
  title: string
  genre: string
  platform: string
  status: string
  updatedAt: string
  chapterCount: number
  characterCount: number
  relationshipCount: number
  episodeCount: number
}

export interface TruthFile {
  name: string
  path: string
  content: string
}

export interface ChapterRecord {
  id: string
  number: number
  title: string
  status: string
  summary: string
  revision: number
  wordCount: number
  createdAt: string
  updatedAt: string
  path: string
  content: string
}

export interface CharacterProfile {
  id: string
  name: string
  role: string
  summary: string
  biography: string
  traits: string[]
  aliases: string[]
  notes: string
  createdAt: string
  updatedAt: string
}

export interface Relationship {
  id: string
  fromCharacterId: string
  toCharacterId: string
  type: 'bloodline' | 'family' | 'ally' | 'enemy' | 'mentor' | 'romance' | 'rival' | 'other'
  label: string
  summary: string
  strength: number
  validAt?: string
  invalidAt?: string
  createdAt: string
  updatedAt: string
}

export interface ZepEpisode {
  id: string
  title: string
  summary: string
  chapterId?: string
  occurredAt?: string
  recordedAt: string
  location: string
  participantIds: string[]
  tags: string[]
}

export interface ZepEntity {
  id: string
  name: string
  kind: string
  summary: string
  aliases: string[]
  attributes: Record<string, unknown>
}

export interface ZepFact {
  id: string
  sourceEntityId: string
  targetEntityId?: string
  relation: string
  summary: string
  episodeIds: string[]
  validAt?: string
  invalidAt?: string
  attributes: Record<string, unknown>
}

export interface ZepGraph {
  schemaVersion: 1
  episodes: ZepEpisode[]
  entities: ZepEntity[]
  facts: ZepFact[]
}

export interface BookDetail {
  book: {
    id: string
    title: string
    genre: string
    platform: string
    status: string
    targetChapters: number
    chapterWordCount: number
    language?: 'zh' | 'en'
    createdAt: string
    updatedAt: string
  }
  authorIntent: string
  currentFocus: string
  truthFiles: TruthFile[]
  chapters: ChapterRecord[]
  domain: {
    characters: CharacterProfile[]
    relationships: Relationship[]
    zepGraph: ZepGraph
  }
}

// ── Settings types ────────────────────────────────────────────────────────────

export interface ModelEntry {
  id: string
  name: string
  enabled: boolean
}

export interface ModelService {
  id: string
  name: string
  type: string
  baseUrl: string
  apiKey: string
  enabled: boolean
  models: ModelEntry[]
}

export interface DefaultModels {
  writeModel: string
  chatModel: string
  reviseModel: string
  coverModel: string
}

export interface GeneralSettings {
  language: string
  autoSave: boolean
  maxToolIterations: number
  sendWithEnter: boolean
}

export interface DisplaySettings {
  theme: 'dark' | 'light'
  fontSize: number
  contentMaxWidth: number
  showLineNumbers: boolean
}

export interface DataSettings {
  workspacePath: string
  autoBackup: boolean
  backupInterval: number
}

export interface McpServer {
  id: string
  name: string
  command: string
  args: string[]
  env: Record<string, string>
  enabled: boolean
}

export interface Skill {
  id: string
  name: string
  description: string
  systemPrompt: string
  enabled: boolean
}

export interface SkillsSettings {
  enabled: boolean
  list: Skill[]
}

export interface WebSearchSettings {
  enabled: boolean
  provider: string
  apiKey: string
  maxResults: number
}

export interface GlobalMemorySettings {
  enabled: boolean
  provider: string
  maxEntries: number
  autoCompress: boolean
}

export interface AppSettings {
  modelServices: ModelService[]
  defaultModels: DefaultModels
  general: GeneralSettings
  display: DisplaySettings
  data: DataSettings
  mcpServers: McpServer[]
  skills: SkillsSettings
  webSearch: WebSearchSettings
  globalMemory: GlobalMemorySettings
}

// ── UI-local types ──────────────────────────────────────────────────────────

/** Application-level view mode toggled by the icon sidebar. */
export type ViewMode = 'catalog' | 'agent'

/** A single message in the agent chat panel. */
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  ts: number
}

/** Form value shape for CharacterProfile editor (text-encoded array fields). */
export type CharacterFormValues = Omit<CharacterProfile, 'traits' | 'aliases'> & {
  traitsText?: string
  aliasesText?: string
}

/** Form value shape for Relationship editor. */
export type RelationshipFormValues = Relationship

