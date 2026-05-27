# inkos-short-fiction vendor slice

This directory contains the current Book Hermes copy of the smallest useful InkOS short-fiction packaging seam.

Current copied files:
- `package-prompts.mjs`
- `package-parser.mjs`

These files are used by `engine-node/src/adapters/book-operations.mjs` so `short_fiction_run` can produce richer upstream-style package artifacts instead of only a single markdown draft file.
