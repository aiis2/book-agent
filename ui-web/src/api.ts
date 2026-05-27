import type {
  AppSettings,
  BookDetail,
  BookSummary,
  CharacterProfile,
  Relationship,
  ZepGraph,
} from './types'


const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'


async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  const json = await response.json()
  if (!response.ok || json?.ok === false) {
    throw new Error(json?.error?.message ?? `Request failed: ${response.status}`)
  }

  return json.data as T
}


export function listBooks() {
  return requestJson<{ books: BookSummary[] }>('/books')
}


export function createBook(payload: Record<string, unknown>) {
  return requestJson<{ book: BookDetail['book'] }>('/books', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}


export function getBookDetail(bookId: string) {
  return requestJson<BookDetail>(`/books/${encodeURIComponent(bookId)}`)
}


export function updateBookMetadata(bookId: string, payload: Record<string, unknown>) {
  return requestJson<BookDetail>(`/books/${encodeURIComponent(bookId)}/metadata`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}


export function createChapter(bookId: string, payload: Record<string, unknown>) {
  return requestJson(`/books/${encodeURIComponent(bookId)}/chapters`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}


export function reviseChapter(bookId: string, chapterId: string, payload: Record<string, unknown>) {
  return requestJson(`/books/${encodeURIComponent(bookId)}/chapters/${encodeURIComponent(chapterId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}


export function replaceCharacters(bookId: string, characters: CharacterProfile[]) {
  return requestJson<BookDetail['domain']>(`/books/${encodeURIComponent(bookId)}/characters`, {
    method: 'PUT',
    body: JSON.stringify({ characters }),
  })
}


export function replaceRelationships(bookId: string, relationships: Relationship[]) {
  return requestJson<BookDetail['domain']>(`/books/${encodeURIComponent(bookId)}/relationships`, {
    method: 'PUT',
    body: JSON.stringify({ relationships }),
  })
}


export function replaceZepGraph(bookId: string, zepGraph: ZepGraph) {
  return requestJson<BookDetail['domain']>(`/books/${encodeURIComponent(bookId)}/zep`, {
    method: 'PUT',
    body: JSON.stringify({ zepGraph }),
  })
}


export function exportBook(bookId: string) {
  return requestJson(`/books/${encodeURIComponent(bookId)}/export`, {
    method: 'POST',
  })
}

export interface InteractResult {
  assistantResponse: string
  generation: { mode: string; model: string }
  session?: Record<string, unknown>
}

export function interactWithBook(bookId: string, prompt: string): Promise<InteractResult> {
  return requestJson<InteractResult>(`/books/${encodeURIComponent(bookId)}/interact`, {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  })
}

// ── Settings API ──────────────────────────────────────────────────────────────

export function getSettings() {
  return requestJson<{ settings: AppSettings }>('/settings')
}

export function updateSettings(patch: Partial<AppSettings>) {
  return requestJson<{ settings: AppSettings }>('/settings', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

