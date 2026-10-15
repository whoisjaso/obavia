# Publishing Obavia

The public site is Cloudflare Pages project `obavia`, output `obavia-co/`. The separate `obavia-waitlist` Worker continues to handle `/api/waitlist` and `/email-assets/` through its existing routes. Publishing static Pages assets does not redeploy that Worker or change its bindings, emails or cron.

Run `deploy/site/build.sh`, then `npx wrangler@4 pages deploy deploy/site/dist --project-name obavia --branch main` from the repository root. Verify both obavia.co and www.obavia.co after publishing. Preserve blog articles, robots.txt, sitemap.xml, security headers and full-name signup behavior in every release.

The GitHub deployment workflow requires `CLOUDFLARE_API_TOKEN` with Pages write permission and `CLOUDFLARE_ACCOUNT_ID`. Local authenticated Wrangler is also supported. Never put tokens or private Worker code in this public repository.

Pages Functions live in the repository-root `functions/` directory. Wrangler picks them up because the deploy command runs from the repo root, while static files come from `deploy/site/dist`. `functions/api/wallet.js` serves `/api/wallet` once `PASS_TYPE_ID`, `TEAM_ID`, `PASS_CERT`, and `PASS_KEY` are set on the Pages project. Those values are signing secrets. Keep them in the Cloudflare dashboard, never in git. See `docs/apple-wallet-pass.md`.

The application frontend deploys separately: build `app/`, publish `app/dist` to Pages project `obavia-app`, then attach app.obavia.co. It currently uses example data and browser-local state.
