import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEEPSEEK_ENDPOINT } from '../../vendor/inkos-core/deepseek-endpoint.mjs';


const ADAPTER_ROOT = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(ADAPTER_ROOT, '..', '..', '..');
const DEFAULT_MODEL = 'deepseek-v4-pro';
let cachedDotEnv;


function stripQuotes(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}


function parseDotEnv(content) {
  const env = {};
  for (const line of content.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u);
    if (!match) {
      continue;
    }

    env[match[1]] = stripQuotes(match[2].trim());
  }
  return env;
}


async function loadDotEnv() {
  if (cachedDotEnv !== undefined) {
    return cachedDotEnv;
  }

  try {
    cachedDotEnv = parseDotEnv(await readFile(resolve(REPO_ROOT, '.env'), 'utf8'));
  } catch {
    cachedDotEnv = {};
  }
  return cachedDotEnv;
}


function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}


export async function loadModelConfig() {
  const dotEnv = await loadDotEnv();
  const env = {
    ...dotEnv,
    ...process.env,
  };
  const disabled = /^(1|true|yes|on)$/iu.test(firstNonEmpty(env.BOOK_AGENT_DISABLE_MODEL));
  // BOOK_AGENT_API_KEY is only a repo-local compatibility alias for the same DeepSeek credential.
  const apiKey = firstNonEmpty(env.BOOK_AGENT_API_KEY, env.DEEPSEEK_API_KEY, env.API_KEY);
  const baseUrl = firstNonEmpty(env.BOOK_AGENT_MODEL_BASE_URL, env.DEEPSEEK_BASE_URL, DEEPSEEK_ENDPOINT.baseUrl)
    .replace(/\/+$/u, '');
  const model = firstNonEmpty(env.BOOK_AGENT_MODEL, env.DEEPSEEK_MODEL, DEFAULT_MODEL);

  return {
    enabled: !disabled && Boolean(apiKey),
    disabled,
    provider: DEEPSEEK_ENDPOINT.id,
    apiKey,
    baseUrl,
    model,
  };
}


export async function generateText({ systemPrompt, userPrompt, temperature = 1.2, maxTokens = 4096 }) {
  const config = await loadModelConfig();
  if (!config.enabled) {
    throw new Error('No DeepSeek API key configured for generated operations.');
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Book-Hermes-Agent/0.1',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  const raw = await response.text();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error(`Model response was not valid JSON: ${raw}`);
  }

  if (!response.ok) {
    throw new Error(payload?.error?.message || `Model request failed with status ${response.status}`);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Model response did not contain assistant content.');
  }

  return {
    text: content.trim(),
    model: config.model,
    provider: config.provider,
    usage: payload?.usage ?? null,
  };
}