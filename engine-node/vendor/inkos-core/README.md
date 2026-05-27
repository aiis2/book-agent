# vendored inkos core

This directory is reserved for focused upstream copies from InkOS core.

## Policy

- vendor only the minimum directories needed for the current batch
- record the upstream source path for every copied slice
- do not mirror the entire InkOS repository
- trim UI, CLI shell, and presentation-only logic unless required by the engine boundary

## Expected first copy set

- interaction
- pipeline
- models
- state
- selected agents and utils

## Current copied files

- book-id.mjs
- path-safety.mjs
- platform.mjs

See [docs/plans/2026-05-26-upstream-copy-manifest.md](../../docs/plans/2026-05-26-upstream-copy-manifest.md) for upstream source paths and trimming decisions.
