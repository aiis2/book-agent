import { z } from 'zod';


export const PlatformSchema = z.enum(['tomato', 'feilu', 'qidian', 'other']);


export function normalizePlatformId(platform) {
  if (typeof platform !== 'string') {
    return undefined;
  }

  const raw = platform.trim();
  if (!raw) {
    return undefined;
  }

  const lowered = raw.toLowerCase();
  const compact = lowered.replace(/[\s_-]+/g, '');

  if (compact === 'tomato' || compact === 'fanqie' || compact === 'fanqienovel' || raw.includes('番茄')) {
    return 'tomato';
  }
  if (compact === 'qidian' || compact === 'qidianzhongwenwang' || raw.includes('起点')) {
    return 'qidian';
  }
  if (compact === 'feilu' || raw.includes('飞卢')) {
    return 'feilu';
  }
  if (compact === 'other' || compact === 'others' || raw.includes('其他') || raw.includes('其它')) {
    return 'other';
  }

  return 'other';
}


export function normalizePlatformOrOther(platform) {
  return normalizePlatformId(platform) ?? 'other';
}


export const GenreSchema = z.string().min(1);


export const BookStatusSchema = z.enum([
  'incubating',
  'outlining',
  'active',
  'paused',
  'completed',
  'dropped',
]);


export const FanficModeSchema = z.enum(['canon', 'au', 'ooc', 'cp']);


export const BookConfigSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  platform: PlatformSchema,
  genre: GenreSchema,
  status: BookStatusSchema,
  targetChapters: z.number().int().min(1).default(200),
  chapterWordCount: z.number().int().min(1000).default(3000),
  language: z.enum(['zh', 'en']).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  parentBookId: z.string().optional(),
  fanficMode: FanficModeSchema.optional(),
});
