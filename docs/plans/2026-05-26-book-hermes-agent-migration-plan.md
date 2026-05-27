# Book Hermes Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the first independent Book Hermes Agent repository skeleton and migrate the minimum high-value Hermes and InkOS surfaces with a copy-first strategy.

**Architecture:** Hermes remains the Python host runtime and owns the agent loop, tool registry, plugin loading, session state, and memory. InkOS becomes the Node engine for book-domain workflows, initially behind a thin adapter boundary and later via vendored core modules.

**Tech Stack:** Python 3.11+, Node 20+, pnpm, TypeScript, pytest, vitest, AGPL project boundary

---

### Task 1: Lock repository constraints and architecture docs

**Files:**
- Create: AGENTS.md
- Create: DESIGN.md
- Create: docs/plans/2026-05-26-book-hermes-agent-design.md
- Create: docs/plans/2026-05-26-book-hermes-agent-migration-plan.md

**Step 1: Write the failing verification checklist**

Expected repository state after this task:
- Root contains AGENTS.md and DESIGN.md
- docs/plans contains design and implementation plan files
- Documents explicitly state AGPL assumption, dual-runtime boundary, and antd v6 priority after copy stabilization

**Step 2: Verify the checklist fails before files exist**

Run:
- PowerShell: Get-ChildItem AGENTS.md, DESIGN.md, docs/plans -ErrorAction SilentlyContinue

Expected:
- Missing files before creation

**Step 3: Create the minimal documents**

Required content:
- AGENTS.md: project rules for future coding agents
- DESIGN.md: repository architecture and migration constraints
- design doc: rationale, phases, copy list, do-not-copy list
- plan doc: executable batches with files and commands

**Step 4: Verify the documents exist**

Run:
- PowerShell: Get-ChildItem AGENTS.md, DESIGN.md, docs/plans

Expected:
- All four files present

### Task 2: Establish the first repository skeleton

**Files:**
- Create: host-python/README.md
- Create: host-python/plugins/book/README.md
- Create: host-python/tests/README.md
- Create: engine-node/README.md
- Create: engine-node/vendor/inkos-core/README.md
- Create: engine-node/src/adapters/README.md
- Create: shared/contracts/README.md
- Create: projects/README.md
- Create: scripts/README.md

**Step 1: Write the failing verification checklist**

Expected repository state after this task:
- Root has host-python, engine-node, shared, projects, scripts
- Each core directory contains a placeholder README describing intended scope
- No product code is implemented yet

**Step 2: Verify the checklist fails before directories exist**

Run:
- PowerShell: Get-ChildItem host-python, engine-node, shared, projects, scripts -ErrorAction SilentlyContinue

Expected:
- Missing directories before creation

**Step 3: Create the minimal skeleton**

Directory ownership:
- host-python: Hermes-derived host runtime
- engine-node: InkOS-derived engine runtime
- shared/contracts: JSON schema and protocol documentation
- projects: runtime workspace for books
- scripts: helper scripts for copy, sync, and validation

**Step 4: Verify the skeleton exists**

Run:
- PowerShell: Get-ChildItem -Recurse host-python, engine-node, shared, projects, scripts

Expected:
- All directories and README placeholders present

### Task 3: Build the Batch 1 copy boundary

**Files:**
- Create: shared/contracts/book-engine-api.md
- Create: host-python/plugins/book/TOOLS.md
- Create: engine-node/src/adapters/runtime-adapter.md

**Step 1: Write the failing contract checklist**

Expected deliverables:
- A documented Python-to-Node contract for the first tool surface
- A fixed tool list for Book Hermes v1
- A documented adapter responsibility split

**Step 2: Verify the contract files are missing**

Run:
- PowerShell: Get-ChildItem shared/contracts/book-engine-api.md, host-python/plugins/book/TOOLS.md, engine-node/src/adapters/runtime-adapter.md -ErrorAction SilentlyContinue

Expected:
- Files absent before creation

**Step 3: Create the minimal contract documents**

The contract must define:
- request envelope
- response envelope
- error envelope
- supported v1 operations
- unsupported operations reserved for later phases

**Step 4: Verify the contract files exist**

Run:
- PowerShell: Get-ChildItem shared/contracts/book-engine-api.md, host-python/plugins/book/TOOLS.md, engine-node/src/adapters/runtime-adapter.md

Expected:
- Files present

### Task 4: Execute Batch 1 bridge implementation

**Files:**
- Create: host-python/pyproject.toml
- Create: host-python/book_hermes_host/bridge.py
- Create: host-python/tests/test_bridge_smoke.py
- Create: engine-node/package.json
- Create: engine-node/src/adapters/bridge-entry.mjs
- Create: engine-node/src/adapters/create-book.mjs
- Create: engine-node/tests/bridge-entry.test.mjs

**Step 1: Write the failing host smoke test**

Example behavior:
- Python bridge can invoke the Node adapter with a `create_book` request
- The adapter returns a structured response envelope and creates a minimal book workspace

**Step 2: Run host smoke test to verify failure**

Run:
- python -m unittest host-python/tests/test_bridge_smoke.py

Expected:
- FAIL because the Python bridge script and Node adapter entry do not exist yet

**Step 3: Write the minimal bridge implementation**

Implementation goal:
- Python host can call a Node entrypoint
- Node entrypoint accepts a structured operation name and payload
- Return success or normalized error in one schema

**Step 4: Run host smoke test to verify pass**

Run:
- python -m unittest host-python/tests/test_bridge_smoke.py

Expected:
- PASS

**Step 5: Run Node smoke test**

Run:
- pnpm --dir engine-node test

Expected:
- PASS

#### Current status snapshot

- The bridge now implements the documented v1 operation set with file-backed local workspace behavior plus optional DeepSeek-backed generation when model credentials are available.
- Host runtime now includes a Hermes-inspired plugin loader, tool registry, CLI entrypoint, and active-book session state.
- Repository-local goal persistence now exists at `scripts/goal_driver.py`, writing `docs/plans/active-goal.json` whenever built-in goal tools are unavailable.
- Batch 2 has started with a real InkOS interaction seam: `engine-node/vendor/inkos-interaction/` plus `engine-node/src/adapters/interaction-adapter.mjs` now normalize bridge requests through upstream-derived interaction schemas before dispatch.
- `run_interaction` now also persists upstream-style transcript events under `.inkos/sessions/<bookId>.jsonl` through the vendored transcript seam while preserving the existing markdown interaction log.
- Bridge dispatch now also persists `.inkos/session.json` through a minimal upstream-derived GlobalSession seam, so the engine has its own active-book session artifact in addition to the host-side `.book-hermes-session.json`.
- Node smoke verification: node --test engine-node/tests/*.test.mjs
- Python smoke verification: python -m unittest discover -s host-python/tests
- Browser smoke verification: python scripts/bridge_smoke_server.py 32123 and open http://127.0.0.1:32123 to run the deterministic full workflow in the VS Code integrated browser.
- Live CLI verification: create a book with python -m book_hermes_host.cli create-book, then use write-next and chat to confirm generation mode=model and model=deepseek-v4-pro.
- Disposable browser smoke workspace now proves the full path from host-python -> bridge.py -> engine-node adapter -> generated project artifacts without spending live model quota.

#### Batch 2 progress update

- Added `engine-node/tests/interaction-adapter.test.mjs` as the first Batch 2 TDD guard for upstream-derived request normalization.
- Added `engine-node/tests/interaction-transcript.test.mjs` as the next Batch 2 TDD guard for upstream-style transcript persistence.
- Added `engine-node/tests/global-session-store.test.mjs` as the next Batch 2 TDD guard for minimal upstream-style global session persistence.
- Added an `inkos-short-fiction` vendor slice so `short_fiction_run` can emit upstream-style package sidecars instead of only a single markdown draft.
- Added an `inkos-models` vendor slice so `book.json` and `chapters/index.json` are validated against upstream-derived schemas while preserving current Book Hermes status values through narrow local extensions.
- Added an `inkos-state` vendor slice so `create_book`, `write_next`, `revise_chapter`, and `export_book` now maintain schema-version-2 runtime state, markdown projections, and per-chapter snapshots under the local book workspace.
- Added `engine-node/src/adapters/pipeline-runtime.mjs` as the narrow pipeline-state adapter while deferring the full InkOS planner/composer/writer/auditor tree.
- Fixed the frontend HTTP `/api/books/:id/interact` route so delegated actions use the same local dispatch semantics as the bridge entry.
- Current proof: `node --test tests/*.test.mjs` from `engine-node` => 17 pass, 0 fail; `python -m unittest discover -s host-python/tests` => 15 tests OK; browser smoke workflow on port 32127 completed 13 operations with all `ok` and listed both `.inkos/session.json` and `.inkos/sessions/night-harbor.jsonl` in the generated workspace.
- Remaining Batch 2 work is still substantial: deeper planner/composer/writer/auditor orchestration, runtime-state markdown bootstrap/memory index, export runtime parity, and broader Hermes skill/tool migration.

### Task 5: Execute Batch 2 core vendoring

**Files:**
- Create or modify under: engine-node/vendor/inkos-core/
- Create: engine-node/src/adapters/interaction-runtime.ts
- Create: engine-node/src/adapters/pipeline-runtime.ts
- Create: engine-node/src/adapters/export-runtime.ts
- Create: engine-node/src/adapters/short-fiction-runtime.ts
- Create: engine-node/tests/vendor-contract.test.ts

**Step 1: Write the failing contract test**

Expected coverage:
- runInteraction delegates to vendored interaction runtime
- writeNext delegates to vendored pipeline runtime
- export delegates to vendored export runtime
- shortFictionRun delegates to vendored short-fiction runtime

**Step 2: Run the Node contract test to verify failure**

Run:
- pnpm --dir engine-node vitest run engine-node/tests/vendor-contract.test.ts

Expected:
- FAIL because vendored modules are not wired yet

**Step 3: Vendor minimal InkOS core slices**

First copy set:
- packages/core/src/interaction
- packages/core/src/pipeline
- packages/core/src/models
- packages/core/src/state
- minimal required agents and utils

**Step 4: Run the Node contract test to verify pass**

Run:
- pnpm --dir engine-node vitest run engine-node/tests/vendor-contract.test.ts

Expected:
- PASS

### Task 6: Defer UI until core copy stabilizes

**Files:**
- Modify: DESIGN.md
- Modify: docs/plans/2026-05-26-book-hermes-agent-design.md
- Future create: ui-web/package.json

**Step 1: Verify the rule is documented**

Required rule:
- No UI expansion before the engine boundary stabilizes
- After core copy stabilizes, prioritize antd v6 for any management UI

**Step 2: Verification command**

Run:
- PowerShell: Select-String -Path DESIGN.md, docs/plans/2026-05-26-book-hermes-agent-design.md -Pattern 'antd v6|UI|Studio'

Expected:
- Matching lines exist in both files

## Migration batches summary

### Batch 0
- Freeze design, constraints, and skeleton
- No executable code

### Batch 1
- Python host to Node bridge
- Tool surface only, no deep vendoring yet

### Batch 2
- Vendor InkOS core slices into engine-node
- Remove dependency on CLI shell semantics

### Batch 3
- Unify persistence, errors, observability, and recovery
- Add contract tests and smoke verification

### Batch 4
- Only after copy stabilizes: optional UI work with antd v6 priority

## Copy now
- Hermes plugin system concepts and tool registration pattern
- InkOS core interaction runtime
- InkOS pipeline runner and supporting domain models
- InkOS export and short-fiction engine slices

## Do not copy now
- InkOS Studio
- InkOS TUI
- Hermes gateway, ACP, dashboard, web, messaging adapters
- InkOS analytics, eval, radar, detect command surfaces unless directly needed for book workflows

## Execution handoff

Plan complete and saved to docs/plans/2026-05-26-book-hermes-agent-migration-plan.md. Two execution options:

1. Subagent-Driven (this session) - execute one batch at a time and review between batches.
2. Parallel Session (separate) - open a new session and execute from this plan with checkpoints.
