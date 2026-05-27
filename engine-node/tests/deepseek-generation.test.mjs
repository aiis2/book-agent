import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';


const repoRoot = resolve(import.meta.dirname, '..', '..');
const bridgeEntry = resolve(repoRoot, 'engine-node', 'src', 'adapters', 'bridge-entry.mjs');


async function runBridge(workspace, request, env, expectedStatus = 0) {
  const child = spawn(process.execPath, [bridgeEntry], {
    cwd: workspace,
    env: {
      ...process.env,
      ...env,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  child.stdin.end(JSON.stringify(request));

  const exitCode = await new Promise((resolvePromise, rejectPromise) => {
    child.on('error', rejectPromise);
    child.on('close', resolvePromise);
  });

  assert.equal(exitCode, expectedStatus, stderr || stdout);
  return JSON.parse(stdout);
}


test('bridge entry uses DeepSeek-compatible chat completions for generated operations', async () => {
  const requests = [];
  const server = createServer((req, res) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      requests.push({
        method: req.method,
        url: req.url,
        authorization: req.headers.authorization,
        body: JSON.parse(raw),
      });

      const callIndex = requests.length;
      const content = callIndex === 1
        ? 'Generated chapter from the mocked DeepSeek endpoint.'
        : 'Assistant response from the mocked DeepSeek endpoint.';

      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        id: `mock-${callIndex}`,
        object: 'chat.completion',
        created: 1,
        model: 'deepseek-v4-pro',
        choices: [{
          index: 0,
          message: { role: 'assistant', content },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 10,
          total_tokens: 20,
        },
      }));
    });
  });

  await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));

  try {
    const address = server.address();
    assert.notEqual(address, null);
    assert.equal(typeof address, 'object');

    const env = {
      API_KEY: 'test-deepseek-key',
      BOOK_AGENT_MODEL_BASE_URL: `http://127.0.0.1:${address.port}`,
      BOOK_AGENT_MODEL: 'deepseek-v4-pro',
    };
    const workspace = mkdtempSync(join(tmpdir(), 'book-agent-deepseek-'));
    const created = await runBridge(workspace, {
      operation: 'create_book',
      payload: {
        title: 'Deep Harbor',
        genre: 'thriller',
        platform: 'tomato',
        authorIntent: 'Keep the tone hard and investigative.',
        currentFocus: 'The protagonist reaches the docks before sunrise.',
      },
    }, env);
    const bookId = created.data.book.id;

    const chapter = await runBridge(workspace, {
      operation: 'write_next',
      payload: {
        bookId,
        title: 'Dawn Search',
      },
    }, env);

    assert.equal(chapter.data.chapter.title, 'Dawn Search');
    const chapterMarkdown = readFileSync(join(workspace, 'projects', bookId, 'chapters', `${chapter.data.chapter.id}.md`), 'utf8');
    assert.equal(chapterMarkdown.includes('Generated chapter from the mocked DeepSeek endpoint.'), true);

    const interaction = await runBridge(workspace, {
      operation: 'run_interaction',
      payload: {
        bookId,
        prompt: 'What should the investigator do next?',
      },
    }, env);

    assert.equal(interaction.data.assistantResponse.includes('mocked DeepSeek endpoint'), true);
    assert.equal(requests.length, 2);
    assert.equal(requests[0].url, '/chat/completions');
    assert.equal(requests[0].authorization, 'Bearer test-deepseek-key');
    assert.equal(requests[0].body.model, 'deepseek-v4-pro');
  } finally {
    server.closeAllConnections();
    await new Promise((resolvePromise, rejectPromise) => {
      server.close((error) => {
        if (error) {
          rejectPromise(error);
          return;
        }
        resolvePromise();
      });
    });
  }
});