import { z } from 'zod';


export const AutomationModeSchema = z.enum(['auto', 'semi', 'manual']);


export function normalizeAutomationMode(mode, fallback = 'semi') {
  const parsed = AutomationModeSchema.safeParse(mode);
  return parsed.success ? parsed.data : fallback;
}