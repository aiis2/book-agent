# Book Engine API Contract

## Request envelope

```json
{
  "operation": "write_next",
  "payload": {},
  "session": {
    "sessionId": "optional-session-id",
    "activeBookId": "optional-book-id"
  }
}
```

## Success envelope

```json
{
  "ok": true,
  "operation": "write_next",
  "data": {},
  "error": null,
  "meta": {
    "engine": "book-hermes-engine-node",
    "version": "draft-batch-1",
    "interactionIntent": "write_next"
  }
}
```

## Error envelope

```json
{
  "ok": false,
  "operation": "write_next",
  "data": null,
  "error": {
    "code": "ENGINE_ERROR",
    "message": "Human-readable message",
    "details": {}
  },
  "meta": {
    "engine": "book-hermes-engine-node",
    "version": "draft-batch-1"
  }
}
```

## Supported v1 operations

- run_interaction
- create_book
- develop_book
- write_next
- revise_chapter
- rename_entity
- update_author_intent
- update_current_focus
- edit_truth_file
- export_book
- short_fiction_run
- generate_cover

## Current file-backed semantics

- create_book: creates projects/<bookId>/ with book.json, chapters/index.json, story/author_intent.md, and story/current_focus.md.
- create_book: also initializes story/characters.json, story/relationships.json, and story/zep/graph.json for the frontend maintenance flows.
- create_book: also initializes an InkOS-style runtime-state seam under story/state/, plus story/current_state.md, story/pending_hooks.md, and story/chapter_summaries.md projections.
- update_author_intent: rewrites story/author_intent.md and updates book.json.updatedAt.
- update_current_focus: rewrites story/current_focus.md and updates book.json.updatedAt.
- develop_book: optionally refreshes intent and focus, then appends story/development_log.md.
- write_next: creates a chapter markdown file under chapters/, appends the chapter entry to chapters/index.json, can advance current focus, and uses the DeepSeek-compatible generator when no explicit content is supplied.
- write_next: also applies an optional payload.runtimeState delta into story/state/, updates markdown projections, and writes story/snapshots/<chapter>/.
- revise_chapter: rewrites an existing chapter file, increments revision metadata, refreshes the chapter index, and can use the DeepSeek-compatible generator when no revised content is supplied.
- revise_chapter: re-applies the chapter runtime-state delta with same-chapter reapply semantics so the summary row, hooks, and current-state facts stay aligned to the revised chapter.
- revise_chapter: when revising an earlier chapter after later chapters exist, refreshes that chapter summary and snapshot without rewinding the runtime-state manifest.
- rename_entity: replaces exact string matches across story files, truth files, chapter markdown, and chapter metadata.
- edit_truth_file: writes or appends a markdown file under story/truth/.
- run_interaction: either delegates to another supported operation through payload.action or returns a DeepSeek-backed assistant response while persisting story/interaction_log.md, an upstream-style transcript stream at .inkos/sessions/<bookId>.jsonl, and an upstream-aligned InteractionSession snapshot at .inkos/session.json.
- export_book: writes exports/manuscript.md and exports/book-export.json, including the current runtimeState bundle.
- short_fiction_run: writes a markdown side-story artifact under exports/ and uses the DeepSeek-compatible generator when no explicit content is supplied.
- generate_cover: writes covers/cover-brief.json and covers/cover-prompt.md; the prompt artifact can be generated through the DeepSeek-compatible model client.

## Interaction normalization

- Bridge requests now normalize through vendored InkOS interaction schemas before dispatch.
- `update_current_focus` is normalized to InkOS intent `update_focus`.
- `edit_truth_file` is normalized to InkOS intent `edit_truth`.
- `run_interaction` is normalized to InkOS intent `chat` when it is a freeform prompt, or to the delegated target intent when `payload.action` is present.
- `short_fiction_run` and `generate_cover` currently remain Book Hermes local intent extensions outside the upstream InkOS interaction intent set.
- Success responses expose `meta.interactionIntent` so smoke harnesses and future host layers can inspect the normalized intent that was validated.
- `run_interaction` responses now also include `data.session` when a freeform interaction path completes, exposing the persisted InteractionSession snapshot with `messages`, `events`, `currentExecution`, and `pendingDecision` when applicable.

## Runtime-state payload extension

`write_next` and `revise_chapter` accept an optional `payload.runtimeState` object:

```json
{
  "runtimeState": {
    "currentStatePatch": {
      "currentLocation": "Archive roof",
      "currentGoal": "Reach the burned records before the antagonist"
    },
    "hookOps": {
      "upsert": [
        {
          "hookId": "archive-fire",
          "type": "mystery",
          "expectedPayoff": "Reveal who burned the archive",
          "payoffTiming": "mid-arc",
          "promoted": true
        }
      ],
      "mention": ["archive-fire"],
      "resolve": [],
      "defer": []
    },
    "chapterSummary": {
      "characters": "Mara",
      "events": "Mara reaches the archive as it burns.",
      "mood": "urgent"
    }
  }
}
```

The engine normalizes this into schema-version-2 runtime state files and returns `data.runtimeState` with manifest, currentState, hooks, chapterSummaries, and artifact paths.

## Model configuration

- Default live model: deepseek-v4-pro
- Accepted API key names: DEEPSEEK_API_KEY, API_KEY, BOOK_AGENT_API_KEY
- DEEPSEEK_API_KEY and API_KEY are equivalent DeepSeek credential names for this repo; BOOK_AGENT_API_KEY is only a project-local compatibility alias for the same credential.
- Accepted overrides: BOOK_AGENT_MODEL, BOOK_AGENT_MODEL_BASE_URL
- Deterministic test override: BOOK_AGENT_DISABLE_MODEL=1

## Integration boundary note

- The bridge talks to the vendored local engine implementation in this repository.
- Book Hermes Agent follows Hermes and InkOS source architecture, but it does not proxy requests to an external Hermes deployment or InkOS service.

## Browser smoke harness

- Run python scripts/bridge_smoke_server.py <port> from the repository root.
- Open http://127.0.0.1:<port> in the VS Code integrated browser.
- Use Run Full Workflow to execute the full host-python to engine-node smoke path against a disposable workspace.
- The browser smoke harness forces BOOK_AGENT_DISABLE_MODEL=1 so the browser validation path stays deterministic and does not spend live model quota.
- Current browser smoke runs also expose `.inkos/session.json` and `.inkos/sessions/<bookId>.jsonl` in the generated workspace once the full workflow reaches `run_interaction`; `.inkos/session.json` now stores a richer InteractionSession snapshot rather than only the minimal global active-book fields.

## Frontend HTTP API

The engine now also exposes a local CRUD API for the React management console at `http://127.0.0.1:4319`.

Routes:
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

Additional persisted domain artifacts:
- `story/characters.json` stores character profiles
- `story/relationships.json` stores bloodline and relationship edges
- `story/zep/graph.json` stores Zep-style episodes, entities, and facts

`GET /api/books/:id` returns a combined detail document containing:
- `book` metadata
- `chapters` with inline markdown content
- `domain.characters`
- `domain.relationships`
- `domain.zepGraph`

## Explicitly unsupported in v1

- Studio startup and view orchestration
- TUI startup and terminal rendering
- analytics, radar, detect, eval bulk surfaces
- Hermes gateway and ACP operations
