# Book Hermes Agent Design

## Current product direction

Book Hermes Agent is planned as a dual-runtime system:
- Hermes-derived Python host runtime
- InkOS-derived Node book engine

The repository is intentionally being shaped around source copy and focused adaptation, not around a large rewrite.
The runtime is also intentionally local to this repository: it vendors and adapts upstream ideas and code slices here rather than connecting to a separate Hermes or InkOS installation at execution time.

## Primary decision

Use a Hermes-derived host and an InkOS-derived engine implemented inside this repository.

Why:
- Hermes already solves agent loop, tools, plugins, session state, and memory.
- InkOS already solves book-domain interaction and writing workflows.
- The cheapest path is to keep each system near its natural runtime and join them through a narrow bridge.

## Runtime boundary

### host-python

Owns:
- agent orchestration
- plugin/tool registration
- session persistence
- memory integration
- host-side validation and smoke tests

### engine-node

Owns:
- book interaction runtime
- writing pipeline
- revise/export/short-fiction execution
- vendored InkOS domain logic
- structured runtime state, chapter summaries, pending hooks, and chapter snapshots
- frontend-facing HTTP API
- multi-novel catalog and story-domain persistence

### ui-web

Owns:
- React + Vite + Ant Design management console
- novel catalog browsing and selection
- chapter preview and revision workflows
- character profile, bloodline, and relationship maintenance
- Zep-style temporal graph editing and inspection

### shared/contracts

Owns:
- request schema
- response schema
- error schema
- migration notes for bridge evolution

## First migration batches

### Batch 0
- freeze design and constraints
- create repository skeleton
- add AGENTS.md and plan docs

### Batch 1
- implement Python-to-Node bridge
- expose minimal Book Hermes tool surface
- avoid deep upstream code movement beyond what the bridge needs

### Batch 2
- vendor high-value InkOS core directories into engine-node
- replace CLI-shell assumptions with direct runtime adapters

### Batch 3
- unify persistence, recovery, observability, and contract tests

### Batch 4
- expose a stable frontend-facing engine API
- add a React + Vite + antd v6 management console on top of the host-engine boundary

## Copy whitelist

Copy first:
- InkOS core interaction modules
- InkOS pipeline modules
- InkOS models and state modules
- Hermes plugin and tool registration patterns

Do not copy first:
- InkOS Studio
- InkOS TUI
- Hermes gateway
- Hermes ACP adapter
- Hermes dashboard and messaging platforms

## UI constraint

No UI-led implementation should start before the host-engine boundary is stable.
After core copy is complete, any management UI should prioritize antd v6 rather than extending legacy UI assumptions.

## Current integrated shape

The current repository direction is now a three-surface system:
- `host-python` keeps Hermes-style orchestration and tool entrypoints
- `engine-node` keeps InkOS-derived runtime behavior plus local HTTP CRUD/preview routes
- `ui-web` consumes the engine API for multi-novel maintenance, preview, manual edits, relationship tracking, and Zep-style timeline/graph management

## Current Batch 2 Runtime-State Seam

The Node engine now vendors a focused InkOS-style runtime-state seam:
- `vendor/inkos-models/runtime-state.mjs` keeps schema-version-2 runtime state contracts.
- `vendor/inkos-state/` keeps state validation, reducer, projection, and persistence helpers.
- `src/adapters/pipeline-runtime.mjs` writes `story/state/*.json`, `story/current_state.md`, `story/pending_hooks.md`, `story/chapter_summaries.md`, and `story/snapshots/<chapter>/`.

This remains inside `engine-node`; host-python receives only structured bridge response data and does not import vendored InkOS internals.

## Success bar for phase one

Phase one is successful when:
- the repository boundary is clear
- migration batches are explicit
- the first bridge path is defined
- copied scope is smaller than rewritten scope
