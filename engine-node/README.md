# engine-node

This directory is the InkOS-derived Node engine for Book Hermes Agent.
It vendors and adapts upstream source slices into this repository and does not depend on a separate Hermes or InkOS runtime/package installation at execution time.

## Owns

- book interaction runtime
- writing pipeline execution
- export and short-fiction execution
- vendored InkOS core slices
- adapter-facing request handling
- DeepSeek-compatible generation client for live writing operations

## Current runtime behavior

- Generated operations such as write_next, run_interaction, short_fiction_run, revise_chapter, and generate_cover call the DeepSeek-compatible model client when an API key is available.
- The runtime accepts DEEPSEEK_API_KEY or API_KEY as the DeepSeek credential from process env or the repository .env file. BOOK_AGENT_API_KEY remains an optional project-local alias or override for the same key.
- BOOK_AGENT_DISABLE_MODEL=1 disables live model calls and forces deterministic local fallbacks for smoke tests and browser harness verification.
- Bridge requests now pass through `engine-node/src/adapters/interaction-adapter.mjs`, which validates a normalized request against vendored InkOS interaction schemas before dispatching to the current handlers.
- The first Batch 2 vendor slice now lives under `engine-node/vendor/inkos-interaction/` and carries the upstream `modes`, `intents`, and `request-router` seam.
- `run_interaction` also persists upstream-style transcript events under `.inkos/sessions/<bookId>.jsonl` through the vendored `session-transcript` seam while keeping the existing markdown interaction log for backward compatibility.
- Bridge dispatch now also persists an upstream-aligned interaction session snapshot at `.inkos/session.json`, carrying `activeBookId`, `automationMode`, `messages`, `events`, `currentExecution`, and `pendingDecision` while remaining backward-compatible with the old global-session fields.
- `engine-node/src/adapters/interaction-runtime.mjs` is now the narrow runtime wrapper that updates the InteractionSession lifecycle for `run_interaction` without pulling in the full InkOS runtime tree.
- `short_fiction_run` now also emits upstream-style package sidecars through a new vendored short-fiction packaging seam: `<stem>.package.json` plus `<stem>-cover-prompt.md`.
- Workspace persistence now validates `book.json` and `chapters/index.json` against vendored InkOS model schemas, with narrow local status extensions where Book Hermes still differs from upstream.
- `create_book`, `write_next`, and `revise_chapter` now persist an InkOS-style structured runtime state seam under `story/state/`, plus markdown projections and per-chapter snapshots under `story/snapshots/<chapter>/`.
- Runtime state responses expose schema-version-2 manifests, current-state facts, pending hooks, and chapter summary rows while keeping these internals inside engine-node.
- The engine now also owns multi-novel catalog reads plus persisted `story/characters.json`, `story/relationships.json`, and `story/zep/graph.json` artifacts for character profiles, bloodline/relationship tracking, and Zep-style temporal graph data.
- `npm run api` starts a local HTTP API for frontend-facing CRUD and preview flows.

## HTTP API

`npm run api` starts the local API at `http://127.0.0.1:4319`.

Current routes:
- `GET /api/health`
- `GET /api/books`
- `POST /api/books`
- `GET /api/books/:id`
- `PATCH /api/books/:id/metadata`
- `POST /api/books/:id/chapters`
- `PATCH /api/books/:id/chapters/:chapterId`
- `PUT /api/books/:id/characters`
- `PUT /api/books/:id/relationships`
- `PUT /api/books/:id/zep`
- `POST /api/books/:id/export`
- `POST /api/books/:id/interact`

The API is intended for the `ui-web` management console and keeps the host-python to engine-node boundary narrow.

## First migration targets from InkOS

Copy or vendor these areas first:
- packages/core/src/interaction/
- packages/core/src/pipeline/
- packages/core/src/models/
- packages/core/src/state/
- packages/core/src/models/runtime-state.ts
- required book-domain agents and supporting utils

## Do not pull first

- packages/studio/
- packages/cli/src/tui/
- wide CLI presentation concerns
- dead or UI-only assets
