// Shared design tokens and app-wide constants for ui-web.
// Keep this file in sync with the Ant Design ConfigProvider token in App.tsx.

export const ACCENT = '#7c5ce8'
export const SIDEBAR_BG = '#0e0e16'

/** Colour palettes for book avatar gradients, keyed by index. */
export const BOOK_AVATAR_PALETTES: [string, string][] = [
  ['#7c5ce8', '#a29bfe'],
  ['#00b894', '#55efc4'],
  ['#e17055', '#fdcb6e'],
  ['#0984e3', '#74b9ff'],
  ['#d63031', '#fd79a8'],
  ['#00cec9', '#81ecec'],
]

export const PLATFORM_OPTIONS = [
  { value: 'qidian' },
  { value: 'tomato' },
  { value: 'feilu' },
  { value: 'other' },
]

export const RELATIONSHIP_TYPES = [
  'bloodline',
  'family',
  'ally',
  'enemy',
  'mentor',
  'romance',
  'rival',
  'other',
]

/** Derive a deterministic gradient pair from a book title string. */
export function bookAvatarGradient(title: string): [string, string] {
  let hash = 0
  for (const ch of title) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff
  return BOOK_AVATAR_PALETTES[hash % BOOK_AVATAR_PALETTES.length]
}

/** Format an ISO timestamp into a readable moment, or return an em-dash. */
export function formatMoment(value?: string): string {
  return value ?? '\u2014'
}
