# Book Agent Workspace Rules

## Mission

This repository builds an independent Book Hermes Agent by combining Hermes as the host runtime and InkOS as the book-domain engine.

## Non-negotiable constraints

- Default project license assumption is AGPL because the intended migration strategy copies InkOS source.
- Prefer copy, vendor, and thin adapters over cross-language rewrites.
- Keep a strict boundary between host-python and engine-node.
- Do not migrate InkOS Studio or InkOS TUI in the first implementation phase.
- Do not migrate Hermes gateway, ACP, dashboard, or messaging adapters in the first phase.
- UI work is not a first-phase priority. After core copy is stable, prioritize antd v6 for any management UI.

## Repository structure intent

- host-python owns the Hermes-derived host runtime, plugin integration, and Python-side tests.
- engine-node owns the InkOS-derived engine runtime and Node-side adapters.
- shared/contracts owns cross-runtime request and response contracts.
- projects stores book workspaces and runtime artifacts.
- scripts stores helper automation for copy, sync, and validation.

## Implementation guidance

- Start from the smallest stable upstream seam.
- Prefer vendoring focused directories over copying whole repositories.
- Record every upstream copy source and trimming decision in docs.
- Keep first-class interfaces small and explicit.
- Do not leak vendored internals from engine-node into host-python.
- Avoid speculative abstractions until the first bridge is working.

## Testing guidance

- For Python host work, prefer pytest smoke tests and contract tests.
- For Node engine work, prefer vitest contract tests around adapter boundaries.
- Verify bridge behavior with structured request and response envelopes.
- Do not claim migration success without fresh verification.

## Documentation guidance

- Update DESIGN.md whenever the runtime boundary changes.
- Update docs/plans when migration batches change.
- Document copied upstream directories before or during each batch.

## Current phase policy

Current phase is architecture freeze and repository skeleton.
No production UI work should start in this phase.
