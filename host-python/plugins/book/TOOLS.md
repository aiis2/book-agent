# Book Hermes v1 Tools

## Tool surface to expose first

- develop_book
- create_book
- run_interaction
- write_next
- revise_chapter
- rename_entity
- update_author_intent
- update_current_focus
- edit_truth_file
- export_book
- short_fiction_run
- generate_cover

## Tools not to expose in v1

- InkOS Studio launch
- InkOS TUI launch
- Hermes gateway controls
- Hermes ACP controls
- InkOS analytics, radar, detect, eval full command surfaces

## Design rule

If a capability is not required for the first book workflow loop, keep it behind the adapter or leave it unported.
