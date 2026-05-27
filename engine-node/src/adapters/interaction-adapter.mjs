import { z } from 'zod';

import { InteractionRequestSchema } from '../../vendor/inkos-interaction/intents.mjs';
import { routeInteractionRequest } from '../../vendor/inkos-interaction/request-router.mjs';


const BridgeOperationSchema = z.object({
  operation: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
});

const BookHermesExtensionIntentSchema = z.enum(['short_fiction_run', 'generate_cover']);

const BookHermesInteractionRequestSchema = InteractionRequestSchema.extend({
  intent: z.union([InteractionRequestSchema.shape.intent, BookHermesExtensionIntentSchema]),
  chapterId: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  revisedContent: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
  prompt: z.string().min(1).optional(),
  truthFile: z.string().min(1).optional(),
  style: z.string().min(1).optional(),
  mood: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
  actionPayload: z.record(z.string(), z.unknown()).optional(),
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
});

const DIRECT_INTENT_ALIASES = {
  create_book: 'create_book',
  develop_book: 'develop_book',
  write_next: 'write_next',
  revise_chapter: 'revise_chapter',
  rename_entity: 'rename_entity',
  update_author_intent: 'update_author_intent',
  update_current_focus: 'update_focus',
  edit_truth_file: 'edit_truth',
  export_book: 'export_book',
  short_fiction_run: 'short_fiction_run',
  generate_cover: 'generate_cover',
};

const LOCAL_EXTENSION_INTENTS = new Set(['short_fiction_run', 'generate_cover']);


function normalizeString(value) {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}


function buildInteractionIntent(operation, payload) {
  if (operation === 'run_interaction') {
    const delegatedAction = normalizeString(payload?.action);
    return delegatedAction ? (DIRECT_INTENT_ALIASES[delegatedAction] ?? delegatedAction) : 'chat';
  }

  return DIRECT_INTENT_ALIASES[operation] ?? operation;
}


function buildInteractionPayload(intent, payload, rootOperation) {
  const normalized = {
    intent,
    bookId: normalizeString(payload?.bookId),
    title: normalizeString(payload?.title),
    genre: normalizeString(payload?.genre),
    platform: normalizeString(payload?.platform),
    authorIntent: normalizeString(payload?.authorIntent ?? payload?.content),
    currentFocus: normalizeString(payload?.currentFocus ?? payload?.content),
    fileName: normalizeString(payload?.fileName ?? payload?.truthFile),
    format: normalizeString(payload?.format),
    oldValue: normalizeString(payload?.oldValue ?? payload?.from),
    newValue: normalizeString(payload?.newValue ?? payload?.to),
    instruction: normalizeString(payload?.instruction ?? payload?.prompt ?? payload?.note ?? payload?.summary),
    chapterId: normalizeString(payload?.chapterId),
    content: normalizeString(payload?.content),
    revisedContent: normalizeString(payload?.revisedContent),
    summary: normalizeString(payload?.summary),
    prompt: normalizeString(payload?.prompt),
    truthFile: normalizeString(payload?.truthFile),
    style: normalizeString(payload?.style),
    mood: normalizeString(payload?.mood),
  };

  if (intent === 'create_book') {
    normalized.authorIntent = normalizeString(payload?.authorIntent);
    normalized.currentFocus = normalizeString(payload?.currentFocus);
  }

  if (intent === 'develop_book') {
    normalized.authorIntent = normalizeString(payload?.authorIntent);
    normalized.currentFocus = normalizeString(payload?.currentFocus);
  }

  if (intent === 'update_author_intent') {
    normalized.authorIntent = normalizeString(payload?.authorIntent ?? payload?.content);
  }

  if (intent === 'update_focus') {
    normalized.currentFocus = normalizeString(payload?.currentFocus ?? payload?.content);
  }

  if (intent === 'chat' && rootOperation === 'run_interaction') {
    normalized.instruction = normalizeString(payload?.prompt ?? payload?.instruction);
  }

  return normalized;
}


function validateInteractionRequest(candidate) {
  const parsed = BookHermesInteractionRequestSchema.parse(candidate);
  if (!LOCAL_EXTENSION_INTENTS.has(parsed.intent)) {
    routeInteractionRequest(parsed);
  }
  return parsed;
}


export function normalizeBridgeRequest(request) {
  const parsed = BridgeOperationSchema.parse(request ?? {});
  const payload = parsed.payload ?? {};

  if (parsed.operation === 'run_interaction' && normalizeString(payload.action)) {
    const delegatedPayload = {
      ...payload,
      ...(typeof payload.actionPayload === 'object' && payload.actionPayload !== null ? payload.actionPayload : {}),
      bookId: normalizeString(payload.bookId)
        ?? normalizeString(typeof payload.actionPayload === 'object' && payload.actionPayload !== null ? payload.actionPayload.bookId : undefined),
      prompt: normalizeString(payload.prompt),
    };
    const delegatedIntent = buildInteractionIntent(parsed.operation, payload);
    return {
      operation: parsed.operation,
      payload,
      interactionRequest: validateInteractionRequest(buildInteractionPayload(delegatedIntent, delegatedPayload, parsed.operation)),
    };
  }

  const intent = buildInteractionIntent(parsed.operation, payload);
  return {
    operation: parsed.operation,
    payload,
    interactionRequest: validateInteractionRequest(buildInteractionPayload(intent, payload, parsed.operation)),
  };
}