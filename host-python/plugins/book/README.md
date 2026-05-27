# book plugin

This directory will host the Python-side Book Hermes plugin.

## Responsibilities

- expose the Book Hermes tool surface to the Hermes host
- translate host requests into engine-node adapter calls
- normalize response and error envelopes
- avoid leaking engine internals upward

## First implementation boundary

The first bridge should only expose a narrow v1 operation set and should not embed InkOS UI, CLI, or TUI concerns.
