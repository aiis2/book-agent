# inkos-interaction vendor slice

This directory contains the first real Batch 2 InkOS interaction seam copied into Book Hermes Agent.

Current copied files:
- modes.mjs
- intents.mjs
- request-router.mjs
- session-transcript-schema.mjs
- session-transcript.mjs
- session.mjs

These files are used by `engine-node/src/adapters/interaction-adapter.mjs`, `engine-node/src/adapters/book-operations.mjs`, and `engine-node/src/adapters/interaction-session-store.mjs` to normalize Book Hermes bridge requests against upstream-derived InkOS schemas, persist upstream-style interaction transcript events, and keep a minimal global interaction session file.

Local extensions such as `short_fiction_run` and `generate_cover` are intentionally kept outside the upstream intent set and are layered in the adapter rather than patched into the vendored files.