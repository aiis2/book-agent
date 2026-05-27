# engine-node adapters

This directory contains the stable adapter layer between the Python host and the Node book engine.

## Rules

- adapters expose stable operations, not raw vendored internals
- adapters normalize success and error envelopes
- adapters are allowed to evolve slower than vendored internals
- the host should depend on adapters, not on vendored modules directly
