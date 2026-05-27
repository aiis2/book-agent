# inkos-models vendor slice

This directory contains the current Book Hermes copy of the smallest useful InkOS model schemas needed by the engine workspace.

Current copied files:
- `book.mjs`
- `chapter.mjs`
- `length-governance.mjs`

These files are used by `engine-node/src/adapters/create-book.mjs` and `engine-node/src/adapters/book-workspace.mjs` so persisted workspace JSON is validated against upstream-derived schemas, with narrow local status extensions where Book Hermes still diverges.
