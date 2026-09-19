# Obavia

Transaction platform for Texas independent used-car dealerships and the people who buy from them. Buyers are always free; dealers pay for the operating Workspace.

Start with `START_HERE.md`, then `CLAUDE.md`, `docs/INDEX.md`, and `docs/delivery/STATE.md`.

## Run it
```
npm install
npm run dev          # http://localhost:3000 → /en/dealer
npm run typecheck && npm test && npm run lint:claims && npm run build
PW_CHROMIUM=/path/to/chrome npm run test:e2e   # omit PW_CHROMIUM after `npx playwright install`
```
Front end first (ADR-0009): data lives in an in-memory store that resets on restart. Supabase replaces it behind the same functions. The rental-membership site that previously lived here was removed per ADR-0007 (2026-09-18); it remains in git history before commit 923de8f.
