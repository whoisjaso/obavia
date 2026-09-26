# Deploying obavia.co

obavia.co is served by the Cloudflare Worker `obavia-waitlist`. It runs the waitlist API (`/api/waitlist`), its D1 database, the confirmation emails and their cron. The site ships as a new version of that same Worker, so none of that changes.

- `live-worker.js` is the waitlist Worker's code as deployed. `deploy.mjs` downloads it from Cloudflare on every run. It isn't committed, because this repo is public and the code holds a private address.
- `worker.js` serves the site:
  - the pages, clean URLs and old-link redirects;
  - a 404 page;
  - long caching for the images and films.

  It hands `/api/waitlist`, `/email-assets/` and the cron to `live-worker.js`.
- `build.sh` stages `obavia-co/` into `dist/`, leaving out host config and working files.
- `deploy.mjs` does the deploy:
  1. reads the live Worker's bindings and current version;
  2. pulls the email images from the live site;
  3. uploads the assets and the Worker, keeping every secret in place;
  4. checks the live site: the pages, the assets, a redirect, the 404, and the waitlist API rejecting an invalid email (nothing is stored);
  5. if any check fails, rolls back to the previous version.

## Run it

GitHub Actions → **Deploy obavia.co**. It runs on every push to `main` that touches the site, or by hand; tick *dry run* to only read and stage.

It needs two repository secrets:
- `CLOUDFLARE_API_TOKEN`, an API token with **Account › Workers Scripts › Edit**;
- `CLOUDFLARE_ACCOUNT_ID`, which is optional.

If the waitlist Worker is ever redeployed from its own source, the site goes back to the old one. Run this workflow again to put it back.

## Test it locally

`DRY_RUN=1 node deploy/site/deploy.mjs`, with a token set, writes `live-worker.js`. Then:

```bash
deploy/site/build.sh
npx wrangler@4 dev -c deploy/site/wrangler.local.jsonc --local-protocol https
```
