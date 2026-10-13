# Obavia

Know why deals are lost. And fix it by Friday.

| Folder | What |
|---|---|
| `obavia-co/` | Marketing site, static. Deploy with `obavia-co/` as the output directory. |
| `app/` | The product: `cd app && npm install && npm run dev` |
| `films/` | Remotion ads |
| `docs/` | Spec, sales doctrine, positioning, market language |

Start with `docs/obavia-spec.md`.

- `desk/`: Obavia Desk, the dealership sale desk (Handle A Sale). See `desk/README.md`.
- `tools/walkthrough/`: the Phase 0 exit walk, `tools/walkthrough/run.sh` (Lane to Won to Plates at 393 by 852, the reads against `baseline.json`). See `tools/walkthrough/README.md`.

## CI
`.github/workflows/test.yml` runs on every push and pull request, any branch, Node 22, four jobs in parallel, no secrets and no deploy:
- `app`: `auction/`, typecheck and vitest.
- `worker`: `auction/worker/`, typecheck and vitest in the real Workers runtime, migrations applied (installs `auction/` first: the Worker imports its engine).
- `desk`: `desk/`, typecheck, vitest and the build (the prebuild copies `assets/cloud-3d`).
- `site`: `node --test deploy/site/live-worker.test.mjs`.

A newer push to the same branch cancels the run in progress.
