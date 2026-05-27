# ui-web

This directory contains the React + Vite + Ant Design v6 management console for Book Hermes Agent.

## What it covers

- multi-novel catalog browsing
- book metadata editing
- chapter preview and revision
- character profile maintenance
- bloodline and relationship maintenance
- Zep-style temporal graph editing
- export actions

## Local development

1. Start the engine API:
   - `cd ..\engine-node`
   - `npm run api`
2. Start the web app:
   - `cd ..\ui-web`
   - `npm run dev`

The Vite dev server proxies `/api` requests to `http://127.0.0.1:4319`.

## Verification

- `npm run build`
- `npm run lint`
- `npx vite preview --host 127.0.0.1 --port 4173`
