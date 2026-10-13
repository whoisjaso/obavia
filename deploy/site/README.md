# Publishing Obavia

The public site is Cloudflare Pages project `obavia`, output `obavia-co/`. The separate `obavia-waitlist` Worker continues to handle `/api/waitlist` and `/email-assets/` through its existing routes. Publishing static Pages assets does not redeploy that Worker or change its bindings, emails or cron.

Run `deploy/site/build.sh`, then `npx wrangler@4 pages deploy deploy/site/dist --project-name obavia --branch main` from the repository root. Verify both obavia.co and www.obavia.co after publishing. Preserve blog articles, robots.txt, sitemap.xml, security headers and full-name signup behavior in every release.

The dealer application's backend (the `step` bodies on `POST /api/waitlist`) and the `Lead` event to Meta's Conversions API live in `deploy/site/lane/` (its README has the contract, the env names `META_PIXEL_ID`, `META_CAPI_TOKEN`, `META_TEST_EVENT_CODE`, and the porting steps); `node --test deploy/site/live-worker.test.mjs` covers them. No pixel script is loaded on any page: both dealer events pass through a worker.

The pages the `obavia-waitlist` Worker passes through to Pages assets are a fixed set in its private source (the `pages` set in the bundle's `worker.mjs` section: the agency pages, `/`, `/waitlist.html`, `/privacy.html`, each also without `.html` and under `/obavia/`); anything else is 404. `obavia-co/results.html` (the public results page, growth plan CP5) was added to that set on October 13, 2026 in the local bundle; the private source must carry the same two entries (`/results.html`, `/obavia/results.html`) before the next Worker deploy, and `node --test deploy/site/live-worker.test.mjs` checks the bundle serves them. The page reads `GET /results` on the auction Worker (`auction/worker/README.md`) from its `data-worker` attribute, a placeholder until that Worker is deployed; `obavia-co/_headers` sends `connect-src 'self'`, so the Worker's origin must be added there for the read to run in a browser.

The GitHub deployment workflow requires `CLOUDFLARE_API_TOKEN` with Pages write permission and `CLOUDFLARE_ACCOUNT_ID`. Local authenticated Wrangler is also supported. Never put tokens or private Worker code in this public repository.

The application frontend deploys separately: build `app/`, publish `app/dist` to Pages project `obavia-app`, then attach app.obavia.co. It currently uses example data and browser-local state.
