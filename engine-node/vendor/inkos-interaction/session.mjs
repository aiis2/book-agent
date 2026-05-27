import { z } from 'zod';

import { isSafeBookId } from '../inkos-core/book-id.mjs';
import { AutomationModeSchema } from './modes.mjs';
import { ExecutionStateSchema, InteractionEventSchema } from './events.mjs';


export const PendingDecisionSchema = z.object({
  kind: z.string().min(1),
  bookId: z.string().min(1),
  chapterNumber: z.number().int().min(1).optional(),
  summary: z.string().min(1),
});

export const InteractionMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
  timestamp: z.number().int().nonnegative(),
});

export const InteractionSessionSchema = z.object({
  sessionId: z.string().min(1),
  projectRoot: z.string().min(1),
  activeBookId: z.string().refine(isSafeBookId, 'Invalid activeBookId').optional(),
  activeChapterNumber: z.number().int().min(1).optional(),
  automationMode: AutomationModeSchema.default('semi'),
  messages: z.array(InteractionMessageSchema).default([]),
  events: z.array(InteractionEventSchema).default([]),
  pendingDecision: PendingDecisionSchema.optional(),
  currentExecution: ExecutionStateSchema.optional(),
});

export const GlobalSessionSchema = z.object({
  activeBookId: z.string().refine(isSafeBookId, 'Invalid activeBookId').optional(),
  automationMode: AutomationModeSchema.default('semi'),
});


export function bindActiveBook(session, bookId, chapterNumber) {
  return {
    ...session,
    activeBookId: bookId,
    ...(chapterNumber !== undefined ? { activeChapterNumber: chapterNumber } : {}),
  };
}


export function clearPendingDecision(session) {
  if (!session.pendingDecision) {
    return session;
  }

  return {
    ...session,
    pendingDecision: undefined,
  };
}


export function updateAutomationMode(session, automationMode) {
  return {
    ...session,
    automationMode,
  };
}


export function appendInteractionMessage(session, message) {
  return {
    ...session,
    messages: [...session.messages, message].sort((left, right) => left.timestamp - right.timestamp),
  };
}


export function appendInteractionEvent(session, event) {
  return {
    ...session,
    events: [...session.events, event],
  };
}