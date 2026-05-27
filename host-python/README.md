# host-python

This directory is the Hermes-derived host runtime for Book Hermes Agent.

## Owns

- host-side agent entry
- plugin registration
- tool registration and dispatch
- Python-side session, memory, and smoke tests
- CLI session state for the active book workflow

## Current executable entrypoints

- python -m book_hermes_host.cli list-tools
- python -m book_hermes_host.cli create-book --title <title>
- python -m book_hermes_host.cli write-next --title <title> [--book-id <bookId>]
- python -m book_hermes_host.cli chat --prompt <text> [--book-id <bookId>]
- python -m book_hermes_host.cli session-status

The CLI stores active-book session state in .book-hermes-session.json in the current working directory so follow-up commands can omit --book-id.

## First migration targets from Hermes

Copy or adapt concepts from these upstream areas first:
- run_agent.py
- tools/registry.py
- hermes_cli/plugins.py
- hermes_state.py

## Do not pull first

- gateway/
- acp_adapter/
- web/
- tui_gateway/
- messaging platform adapters

## Near-term subdirectories

- plugins/book: Book Hermes plugin boundary
- tests: host smoke and contract tests
- book_hermes_host/session_state.py: local active-book session storage
- book_hermes_host/plugin_loader.py and tool_registry.py: Hermes-inspired plugin and tool dispatch surface
