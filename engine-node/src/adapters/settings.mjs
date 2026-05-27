/**
 * Settings adapter — reads and writes the workspace-level settings.json.
 *
 * The settings file lives at <workspaceRoot>/settings.json and stores all
 * host-level configuration: model provider credentials, default models,
 * general preferences, display options, data paths, MCP server list,
 * skill toggles, web-search config, and global-memory config.
 *
 * The file is intentionally human-readable and can be edited directly.
 * Every PATCH from the API merges at the top-level key level, so you
 * can update a single section without touching others.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ── default schema ──────────────────────────────────────────────────────────

export function defaultSettings() {
  return {
    modelServices: [
      {
        id: 'deepseek',
        name: 'DeepSeek',
        type: 'openai-compatible',
        baseUrl: 'https://api.deepseek.com/v1',
        apiKey: '',
        enabled: true,
        models: [
          { id: 'deepseek-chat', name: 'DeepSeek Chat', enabled: true },
          { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', enabled: true },
        ],
      },
    ],
    defaultModels: {
      writeModel: 'deepseek-chat',
      chatModel: 'deepseek-chat',
      reviseModel: 'deepseek-chat',
      coverModel: 'deepseek-chat',
    },
    general: {
      language: 'zh-CN',
      autoSave: true,
      maxToolIterations: 12,
      sendWithEnter: true,
    },
    display: {
      theme: 'dark',
      fontSize: 14,
      contentMaxWidth: 860,
      showLineNumbers: true,
    },
    data: {
      workspacePath: '',
      autoBackup: false,
      backupInterval: 24,
    },
    mcpServers: [],
    skills: {
      enabled: true,
      list: [],
    },
    webSearch: {
      enabled: false,
      provider: 'tavily',
      apiKey: '',
      maxResults: 5,
    },
    globalMemory: {
      enabled: false,
      provider: 'built-in',
      maxEntries: 100,
      autoCompress: true,
    },
  };
}

// ── file helpers ─────────────────────────────────────────────────────────────

function settingsPath(workspaceRoot) {
  return join(workspaceRoot, 'settings.json');
}

export function loadSettings(workspaceRoot) {
  const path = settingsPath(workspaceRoot);
  if (!existsSync(path)) {
    return defaultSettings();
  }
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw);
    // Merge with defaults so new fields from future updates are always present.
    return deepMerge(defaultSettings(), parsed);
  } catch {
    return defaultSettings();
  }
}

/**
 * Save a partial settings patch. Each top-level key is deep-merged with
 * the existing value so that clients can send partial updates.
 */
export function saveSettings(workspaceRoot, patch) {
  const current = loadSettings(workspaceRoot);
  const next = deepMerge(current, patch);
  writeFileSync(settingsPath(workspaceRoot), JSON.stringify(next, null, 2), 'utf8');
  return next;
}

// ── utils ────────────────────────────────────────────────────────────────────

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override !== undefined ? override : base;
  }
  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (isPlainObject(base[key]) && isPlainObject(override[key])) {
      result[key] = deepMerge(base[key], override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}
