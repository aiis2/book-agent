# Book Hermes Agent — Coding Standards

## Purpose

These standards apply to every file in `host-python/`, `engine-node/`, `ui-web/`, and `shared/`.
They are enforced at code-review time and, where possible, by linters or pre-commit hooks.

---

## 1. File-length limit

**Hard limit: 1 000 lines per file.**

- Files that reach 800 lines are a soft warning and a signal to extract sub-modules.
- Files that exceed 1 000 lines must be split before the PR can merge.
- Vendored upstream files (`vendor/`) are exempt from this limit but must not be modified.
- Generated files (e.g., `dist/`, `*.gen.mjs`) are exempt.

Rationale: single-responsibility, easier reviews, lower merge-conflict surface.

---

## 2. Component and module decomposition

### Frontend (React / TypeScript)

- One React component per file.
- Component files live under `src/components/<domain>/`.
- Shared hooks live under `src/hooks/`.
- Shared constants live in `src/constants.ts`.
- Shared types live in `src/types.ts`.
- No inline logic in JSX that could be a named function.
- No deeply nested ternary expressions in JSX — extract a named helper or sub-component.

### Backend Node (engine-node)

- One adapter responsibility per file under `src/adapters/`.
- Pure helper functions should live in `src/utils/` (create the directory when needed).
- Domain operations that grow beyond 600 lines must be split by sub-domain.

### Backend Python (host-python)

- One class or one cohesive group of functions per module.
- Agent loop logic lives in `agent_loop.py`; CLI concerns live in `cli.py`.
- Plugins live in `plugins/<plugin-name>/plugin.py`.

---

## 3. Naming conventions

| Context | Convention | Example |
|---|---|---|
| React component | PascalCase | `BookListPanel` |
| React hook | camelCase, `use` prefix | `useBookCatalog` |
| TypeScript type/interface | PascalCase | `BookSummary` |
| TypeScript constant | SCREAMING_SNAKE | `ACCENT_COLOR` |
| Node module | kebab-case filename | `book-operations.mjs` |
| Python module | snake_case | `agent_loop.py` |
| Python class | PascalCase | `AgentLoop` |

---

## 4. Import discipline

- Barrel `index` exports are allowed only at the `components/` level (one `index.ts` per domain folder).
- No circular imports.
- In TypeScript, use `import type` for type-only imports.
- In Node ESM modules, always use explicit `.mjs` extensions in relative imports.

---

## 5. Error handling

- Never swallow errors silently.
- All async functions that can fail must either return a typed error union or `throw`.
- User-facing errors must carry a human-readable `message` field.
- At system boundaries (HTTP handlers, bridge entry), log and re-wrap with context.

---

## 6. Environment and secrets

- API keys and secrets must only be read from environment variables.
- Never hard-code a key, token, or password in source.
- All environment variables must be documented in `.env.example`.
- Do not commit `.env`.

---

## 7. Testing

- Every new adapter or handler must have at least a smoke-level test.
- Test files live in `tests/` at the same depth as the source they test.
- For Node: use `node --test` with `*.test.mjs` naming.
- For Python: use `pytest` with `test_*.py` naming.
- No test file should import production modules from another runtime (host-python must not import engine-node source directly).

---

## 8. Commit messages

- Written in English only.
- Follow the `<type>: <subject>` pattern (e.g., `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`).
- Subject is imperative mood, ≤ 72 characters.
- Body (if present) explains *why*, not *what*.

---

## 9. Code review checklist

Before requesting review:

- [ ] No file exceeds 1 000 lines
- [ ] All new code has at least a smoke test
- [ ] No secrets in source
- [ ] Imports are clean (no unused, no circular)
- [ ] TypeScript compiles with zero errors (`tsc --noEmit`)
- [ ] Node unit tests pass (`node --test engine-node/tests/*.test.mjs`)
- [ ] Python tests pass (`python -m unittest discover -s host-python/tests`)

---

## 10. License

All new code in this repository is licensed under **AGPL-3.0** unless a file header states otherwise.
Vendored upstream code retains its original license headers.
