# Publishing Obavia

The public site is Cloudflare Pages project `obavia`, output `obavia-co/`. The separate `obavia-waitlist` Worker continues to handle `/api/waitlist` and `/email-assets/` through its existing routes. Publishing static Pages assets does not redeploy that Worker or change its bindings, emails or cron.

Run `deploy/site/build.sh`, then `npx wrangler@4 pages deploy deploy/site/dist --project-name obavia --branch main` from the repository root. Verify both obavia.co and www.obavia.co after publishing. Preserve blog articles, robots.txt, sitemap.xml, security headers and full-name signup behavior in every release.

The GitHub deployment workflow requires `CLOUDFLARE_API_TOKEN` with Pages write permission and `CLOUDFLARE_ACCOUNT_ID`. Local authenticated Wrangler is also supported. Never put tokens or private Worker code in this public repository.

The application frontend deploys separately: build `app/`, publish `app/dist` to Pages project `obavia-app`, then attach app.obavia.co. It currently uses example data and browser-local state.
