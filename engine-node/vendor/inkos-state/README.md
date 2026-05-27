# inkos-state vendor seam

This directory contains a focused, type-stripped adaptation of InkOS runtime-state handling.

Copied or adapted source areas:
- `packages/core/src/models/runtime-state.ts`
- `packages/core/src/state/state-validator.ts`
- `packages/core/src/state/state-reducer.ts`
- `packages/core/src/state/state-projections.ts`
- `packages/core/src/state/runtime-state-store.ts`

Trim decisions:
- Kept schema version 2 runtime-state JSON artifacts, hook state, chapter summaries, current-state facts, reducer semantics, projections, and snapshot validation.
- Omitted SQLite memory index, markdown bootstrap parsers, hook governance helper imports, and the full PipelineRunner orchestration tree.
- Book Hermes writes this seam through `engine-node/src/adapters/pipeline-runtime.mjs` so host-python never sees vendored internals.
