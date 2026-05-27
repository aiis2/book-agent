# Upstream Copy Manifest

## Purpose

This document records which upstream source files have already been copied into this repository, why they were selected, and what trimming decisions were made.

The goal is to keep Book Hermes Agent aligned with the copy-first strategy while preventing uncontrolled vendor growth.

## Current status

### Hermes

No Hermes source files have been copied verbatim yet, but the current host runtime now includes narrow local adaptations of Hermes plugin and tool-registry patterns.

Current strategy:
- keep Hermes concepts in host-python design and adapter boundaries first
- defer direct Hermes code vendoring until the Python-side plugin boundary is ready

Planned first-copy candidates:
- `run_agent.py`
- `tools/registry.py`
- `hermes_cli/plugins.py`
- selected session/state helpers if direct reuse becomes necessary

#### Hermes-inspired local adaptations

1. `d:/npm_work/hermes-agent/tools/registry.py`
   - adapted into `host-python/book_hermes_host/tool_registry.py`
   - reason: needed for a small host-side tool registry so the Book plugin surface is not hardcoded in the CLI
   - trim decision: kept only registration, listing, and invocation concepts; omitted Hermes dynamic discovery, TTL caching, MCP refresh, and toolset alias management

2. `d:/npm_work/hermes-agent/hermes_cli/plugins.py`
   - adapted into `host-python/book_hermes_host/plugin_loader.py`
   - reason: needed for a small plugin loader that discovers `host-python/plugins/*/plugin.py`
   - trim decision: kept only file-based discovery and register(ctx) loading; omitted manifests, entry-point plugins, hook lifecycle, gateway/platform support, and YAML handling

### InkOS

The first focused vendor slice started under `engine-node/vendor/inkos-core/`. Batch 2 has now expanded through interaction, model, short-fiction, and runtime-state seams.

#### Copied now

1. `d:/npm_work/inkos/packages/core/src/utils/book-id.ts`
   - copied to `engine-node/vendor/inkos-core/book-id.mjs`
   - reason: needed immediately for safe book id derivation and validation
   - trim decision: removed TypeScript type annotations only; logic preserved

2. `d:/npm_work/inkos/packages/core/src/utils/path-safety.ts`
   - copied to `engine-node/vendor/inkos-core/path-safety.mjs`
   - reason: needed immediately for path traversal protection in adapter file writes
   - trim decision: removed TypeScript type annotations only; logic preserved

3. `d:/npm_work/inkos/packages/core/src/models/book.ts`
   - partially copied to `engine-node/vendor/inkos-core/platform.mjs`
   - reason: needed immediately for platform normalization in `create_book`
   - trim decision: copied only `normalizePlatformId` and `normalizePlatformOrOther`; omitted zod schemas and unrelated type declarations

4. `d:/npm_work/inkos/packages/core/src/interaction/project-tools.ts`
   - partially adapted into `engine-node/src/adapters/create-book.mjs`
   - reason: `buildBookConfig` and the `createBook`-style filesystem layout were the smallest stable upstream seam for the first working operation
   - trim decision: extracted only the logic needed for `create_book`; omitted unrelated interaction tools, export code, chat tools, telemetry hooks, and pipeline integrations

5. `d:/npm_work/inkos/packages/core/src/llm/providers/endpoints/deepseek.ts`
   - partially copied to `engine-node/vendor/inkos-core/deepseek-endpoint.mjs`
   - reason: needed for the first live DeepSeek-backed generation path that matches the user's configured provider choice
   - trim decision: kept endpoint metadata and model identifiers only; omitted endpoint-bank wiring, type imports, and unrelated provider registry code

6. `d:/npm_work/inkos/packages/core/src/interaction/modes.ts`
   - copied to `engine-node/vendor/inkos-interaction/modes.mjs`
   - reason: needed as the smallest reusable upstream automation-mode seam for request normalization
   - trim decision: removed TypeScript type annotations only; logic preserved

7. `d:/npm_work/inkos/packages/core/src/interaction/intents.ts`
   - copied to `engine-node/vendor/inkos-interaction/intents.mjs`
   - reason: needed to validate Book Hermes bridge requests against real InkOS interaction intent schemas instead of only local handcrafted operation names
   - trim decision: removed TypeScript type annotations only; preserved the schema surface and kept local-only intent extensions in `engine-node/src/adapters/interaction-adapter.mjs`

8. `d:/npm_work/inkos/packages/core/src/interaction/request-router.ts`
   - copied to `engine-node/vendor/inkos-interaction/request-router.mjs`
   - reason: needed to preserve the upstream parse/route entrypoint for normalized interaction requests
   - trim decision: removed TypeScript type imports only; logic preserved

9. `d:/npm_work/inkos/packages/core/src/interaction/session-transcript-schema.ts`
   - copied to `engine-node/vendor/inkos-interaction/session-transcript-schema.mjs`
   - reason: needed to persist `run_interaction` history as upstream-style transcript events instead of only a local markdown log
   - trim decision: removed TypeScript type annotations only; logic preserved

10. `d:/npm_work/inkos/packages/core/src/interaction/session-transcript.ts`
    - partially copied to `engine-node/vendor/inkos-interaction/session-transcript.mjs`
    - reason: needed to append upstream-style transcript events under `.inkos/sessions/` for the current interaction adapter
    - trim decision: removed TypeScript-only imports and external AgentMessage typing, kept event append/read logic, and left broader session/runtime orchestration for later batches

11. `d:/npm_work/inkos/packages/core/src/interaction/session.ts`
   - partially copied to `engine-node/vendor/inkos-interaction/session.mjs`
   - reason: needed to carry the upstream InteractionSession/GlobalSession schema seam plus the smallest session helper set required for engine-side interaction lifecycle persistence
   - trim decision: copied `InteractionSessionSchema`, `GlobalSessionSchema`, `PendingDecisionSchema`, message/event bindings, and automation helpers; still omitted BookSession, creation-draft rounds, and broader draft-state helpers that are not yet wired in Book Hermes

12. `d:/npm_work/inkos/packages/core/src/interaction/project-session-store.ts`
   - partially adapted into `engine-node/src/adapters/interaction-session-store.mjs`
   - reason: needed to persist `.inkos/session.json` as a backward-compatible InteractionSession snapshot while preserving the upstream global-session semantics used by the existing bridge tests
   - trim decision: kept the upstream session-file path semantics, added a compatibility merge path for the pre-existing minimal global session format, and still omitted book-directory discovery and wider runtime coupling

13. `d:/npm_work/inkos/packages/core/src/interaction/events.ts`
   - copied to `engine-node/vendor/inkos-interaction/events.mjs`
   - reason: needed to validate currentExecution and event records inside the newly persisted InteractionSession snapshot
   - trim decision: removed TypeScript type annotations only; logic preserved

14. `d:/npm_work/inkos/packages/core/src/interaction/runtime.ts`
   - partially adapted into `engine-node/src/adapters/interaction-runtime.mjs`
   - reason: needed to introduce a narrow runtime wrapper that updates InteractionSession messages, events, execution state, and pending decision semantics around `run_interaction`
   - trim decision: kept only session lifecycle handling for request start/complete/fail and the automation-mode wait decision; omitted the broader upstream tool orchestration, draft lifecycle, and full runtime dispatch tree for later batches

15. `d:/npm_work/inkos/packages/core/src/prompts/short-fiction.ts`
   - partially copied to `engine-node/vendor/inkos-short-fiction/package-prompts.mjs`
   - reason: needed to move `short_fiction_run` packaging away from a single handcrafted artifact and toward a real upstream prompt seam for intro/selling-point/cover-prompt generation
   - trim decision: copied only the packaging prompt builders plus prompt trimming helper; omitted outline/draft/review prompts for later batches

16. `d:/npm_work/inkos/packages/core/src/agents/short-fiction.ts`
   - partially copied to `engine-node/vendor/inkos-short-fiction/package-parser.mjs`
   - reason: needed to parse the upstream tagged packaging output format into stable Book Hermes sidecar artifacts
   - trim decision: copied only the sales-package parser helpers; omitted agent classes, draft parsing, retries, and chapter rendering utilities

17. `d:/npm_work/inkos/packages/core/src/models/book.ts`
   - copied to `engine-node/vendor/inkos-models/book.mjs`
   - reason: needed to validate persisted `book.json` data with an upstream-derived schema and reuse the upstream platform normalization in adapter writes
   - trim decision: removed TypeScript type annotations only; preserved the current schema and normalization logic

18. `d:/npm_work/inkos/packages/core/src/models/length-governance.ts`
   - copied to `engine-node/vendor/inkos-models/length-governance.mjs`
   - reason: needed as the only direct dependency of the upstream chapter metadata schema
   - trim decision: removed TypeScript type annotations only; logic preserved

19. `d:/npm_work/inkos/packages/core/src/models/chapter.ts`
   - copied to `engine-node/vendor/inkos-models/chapter.mjs`
   - reason: needed to validate persisted chapter metadata in `chapters/index.json`
   - trim decision: removed TypeScript type annotations only; kept the upstream schema surface and applied Book Hermes status extensions locally in `book-workspace.mjs` rather than editing the vendored file

20. `d:/npm_work/inkos/packages/core/src/models/runtime-state.ts`
   - copied to `engine-node/vendor/inkos-models/runtime-state.mjs`
   - reason: needed to preserve InkOS schema-version-2 runtime state artifacts for current state, pending hooks, and chapter summaries
   - trim decision: removed TypeScript type declarations only; kept the schema surface and added a local `RuntimeStateSnapshotSchema` helper for adapter validation

21. `d:/npm_work/inkos/packages/core/src/state/state-validator.ts`
   - copied to `engine-node/vendor/inkos-state/state-validator.mjs`
   - reason: needed to validate the structured runtime-state bundle before and after local pipeline writes
   - trim decision: removed TypeScript types only; kept duplicate-hook, duplicate-summary, and manifest/current-state consistency checks

22. `d:/npm_work/inkos/packages/core/src/state/state-reducer.ts`
   - partially copied to `engine-node/vendor/inkos-state/state-reducer.mjs`
   - reason: needed to apply chapter runtime-state deltas for current-state facts, hook lifecycle, and chapter summaries
   - trim decision: kept reducer semantics for backwards checks, same-chapter reapply, hook upsert/mention/resolve/defer, current-state patching, and summary replacement; omitted hook-governance utility imports that are not yet vendored

23. `d:/npm_work/inkos/packages/core/src/state/state-projections.ts`
   - partially copied to `engine-node/vendor/inkos-state/state-projections.mjs`
   - reason: needed to maintain markdown projections beside structured JSON state so copied InkOS behavior remains inspectable by humans and future agents
   - trim decision: kept current-state, pending-hooks, and chapter-summary projection shapes; omitted Chinese localization and stale-hook diagnostic helpers until their dependencies are vendored

24. `d:/npm_work/inkos/packages/core/src/state/runtime-state-store.ts`
   - partially copied to `engine-node/vendor/inkos-state/runtime-state-store.mjs`
   - reason: needed to load, validate, render, persist, and snapshot runtime state as a local engine concern
   - trim decision: kept structured state load/save, projection writes, and per-chapter snapshots; omitted SQLite memory index, markdown bootstrap parsers, and broad PipelineRunner coupling

25. `d:/npm_work/inkos/packages/core/src/pipeline/runner.ts`
   - partially adapted into `engine-node/src/adapters/pipeline-runtime.mjs`
   - reason: needed a narrow Book Hermes adapter for the pipeline state side effects of chapter write/revise without pulling the full InkOS PipelineRunner tree yet
   - trim decision: implemented the state-write seam around `create_book`, `write_next`, `revise_chapter`, and `export_book`; deferred full planner/composer/writer/auditor orchestration and provider override machinery

## Next planned InkOS copy batches

### Batch 2 candidates

- `packages/core/src/interaction/` ongoing: modes, intents, request-router, transcript persistence, event/session schemas, a backward-compatible InteractionSession store, and a narrow runtime wrapper are now vendored; deeper draft lifecycle and fuller runtime orchestration still remain
- `packages/core/src/pipeline/` deeper planner/composer/writer/auditor orchestration after the current state seam
- `packages/core/src/models/` additional runtime and project models as needed
- `packages/core/src/state/` markdown bootstrap, memory index, and hook governance helpers
- selected files from `packages/core/src/agents/`

### Explicitly excluded for now

- `packages/studio/`
- `packages/cli/src/tui/`
- broad CLI presentation helpers
- UI assets and dashboards

## Rules for future copy operations

- Record source path before or at the time of copying.
- Record whether the file was copied verbatim, type-stripped, or partially extracted.
- Prefer the smallest reusable seam over copying a whole subtree.
- If a copied file is later superseded by a narrower or clearer local adapter, update this manifest with the replacement relationship.
