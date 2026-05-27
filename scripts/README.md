# scripts

This directory is reserved for helper scripts used during migration.

Expected future script categories:
- upstream copy helpers
- vendor diff helpers
- contract verification helpers
- repository validation helpers

Current helpers:
- bridge_smoke_server.py: local HTTP harness for browser-based bridge verification
- bridge_smoke.html: disposable browser page that drives the host-python to engine-node smoke workflow
- goal_driver.py: repository-local replacement for unavailable goal_system tools; persists the active execution goal in docs/plans/active-goal.json with open/status/update/next/close commands
