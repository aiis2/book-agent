import {
  appendInteractionEvent,
  appendInteractionMessage,
  bindActiveBook,
  clearPendingDecision,
  updateAutomationMode,
} from '../../vendor/inkos-interaction/session.mjs';
import { loadProjectSession, persistProjectSession } from './interaction-session-store.mjs';


function normalizeAutomationMode(value) {
  return value === 'auto' || value === 'semi' || value === 'manual'
    ? value
    : undefined;
}


function userPromptText(payload, fallbackOperation) {
  if (typeof payload?.prompt === 'string' && payload.prompt.trim()) {
    return payload.prompt.trim();
  }
  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message.trim();
  }
  if (typeof payload?.instruction === 'string' && payload.instruction.trim()) {
    return payload.instruction.trim();
  }
  return fallbackOperation;
}


function startExecutionState(intent, bookId) {
  return {
    status: 'planning',
    ...(bookId ? { bookId } : {}),
    stageLabel: `handling ${intent}`,
  };
}


function completedExecutionState(intent, bookId) {
  return {
    status: 'completed',
    ...(bookId ? { bookId } : {}),
    stageLabel: `completed ${intent}`,
  };
}


function waitingExecutionState(bookId) {
  return {
    status: 'waiting_human',
    ...(bookId ? { bookId } : {}),
    stageLabel: 'waiting for your next decision',
  };
}


function shouldWaitForHuman(automationMode, intent) {
  const editIntent = intent === 'update_focus' || intent === 'update_author_intent' || intent === 'edit_truth' || intent === 'rename_entity';
  const contentIntent = intent === 'write_next' || intent === 'continue_book' || intent === 'revise_chapter' || intent === 'rewrite_chapter';

  if (automationMode === 'auto') {
    return false;
  }
  if (automationMode === 'semi') {
    return contentIntent;
  }
  return contentIntent || editIntent;
}


export async function beginInteractionSession(projectRoot, interactionRequest, payload) {
  const automationMode = normalizeAutomationMode(payload?.automationMode);
  const bookId = typeof interactionRequest?.bookId === 'string' && interactionRequest.bookId.trim()
    ? interactionRequest.bookId
    : undefined;
  const promptText = userPromptText(payload, interactionRequest?.intent ?? 'run_interaction');
  let session = await loadProjectSession(projectRoot);

  if (automationMode) {
    session = updateAutomationMode(session, automationMode);
  }
  if (bookId) {
    session = bindActiveBook(session, bookId);
  }
  session = clearPendingDecision(session);
  session = appendInteractionMessage(session, {
    role: 'user',
    content: promptText,
    timestamp: Date.now(),
  });
  session = appendInteractionEvent(session, {
    kind: 'request.started',
    timestamp: Date.now(),
    status: 'planning',
    ...(bookId ? { bookId } : {}),
    detail: promptText,
  });
  session = {
    ...session,
    currentExecution: startExecutionState(interactionRequest.intent, bookId),
  };

  await persistProjectSession(projectRoot, session);
  return session;
}


export async function completeInteractionSession(projectRoot, session, interactionRequest, assistantText) {
  const bookId = typeof interactionRequest?.bookId === 'string' && interactionRequest.bookId.trim()
    ? interactionRequest.bookId
    : session.activeBookId;
  const withAssistantMessage = appendInteractionMessage(session, {
    role: 'assistant',
    content: assistantText,
    timestamp: Date.now(),
  });
  const waitForHuman = shouldWaitForHuman(withAssistantMessage.automationMode, interactionRequest.intent);
  const withCompletionEvent = appendInteractionEvent(withAssistantMessage, {
    kind: waitForHuman ? 'task.waiting_human' : 'task.completed',
    timestamp: Date.now(),
    status: waitForHuman ? 'waiting_human' : 'completed',
    ...(bookId ? { bookId } : {}),
    detail: assistantText,
  });
  const nextSession = {
    ...withCompletionEvent,
    currentExecution: waitForHuman
      ? waitingExecutionState(bookId)
      : completedExecutionState(interactionRequest.intent, bookId),
    pendingDecision: waitForHuman && bookId
      ? {
          kind: 'review-next-step',
          bookId,
          summary: 'Execution finished. Choose the next action explicitly.',
        }
      : undefined,
  };

  await persistProjectSession(projectRoot, nextSession);
  return nextSession;
}


export async function failInteractionSession(projectRoot, session, interactionRequest, error) {
  const bookId = typeof interactionRequest?.bookId === 'string' && interactionRequest.bookId.trim()
    ? interactionRequest.bookId
    : session.activeBookId;
  const detail = error instanceof Error ? error.message : String(error);
  const nextSession = {
    ...appendInteractionEvent(session, {
      kind: 'task.failed',
      timestamp: Date.now(),
      status: 'failed',
      ...(bookId ? { bookId } : {}),
      detail,
    }),
    currentExecution: {
      status: 'failed',
      ...(bookId ? { bookId } : {}),
      stageLabel: detail,
    },
  };

  await persistProjectSession(projectRoot, nextSession);
  return nextSession;
}