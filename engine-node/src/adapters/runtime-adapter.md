# Runtime Adapter Boundary

## Purpose

Define the first stable Node-facing adapter boundary for Book Hermes Agent.

## Inputs

The adapter should accept:
- operation name
- payload object
- optional session context
- optional active book id

## Outputs

The adapter should return:
- ok flag
- operation name
- normalized data payload on success
- normalized error object on failure
- optional telemetry fields for trace and diagnostics

## Operations for v1

- run_interaction
- create_book
- develop_book
- write_next
- revise_chapter
- rename_entity
- update_author_intent
- update_current_focus
- edit_truth_file
- export_book
- short_fiction_run
- generate_cover

## Non-goals for v1

- no UI rendering
- no Studio/TUI transport behavior
- no CLI-only formatting output
