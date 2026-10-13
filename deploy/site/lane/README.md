# The dealer application backend (POST /api/waitlist with a step)

Written October 13, 2026 by systems. This folder is the committed source for the part of the `obavia-waitlist` Worker that answers the dealer application on obavia.co (`obavia-co/index.html` `#apply`, `obavia-co/lane-apply.js`, plan `docs/plan/growth/application.md`). The Worker's own source is private and its built bundle, `deploy/site/live-worker.js`, is gitignored, so the code lives here and is copied into the bundle.

## Files

| File | What it is |
| --- | --- |
| `lane.mjs` | The four steps (`createLane`), the request handler (`handleLaneStep`), the TxDMV list reader (`createDealerBook`), the Telnyx Verify client (`createTelnyxVerify`), the fake verifier (`fakeVerify`), provider selection (`laneProvider`) and the key issuer (`laneKeyIssuer`). No imports. |
| `template-v9.mjs` | The dealer confirmation email, template version `waitlist-confirmation-v9`, and `renderLaneConfirmation`. No imports. v2 to v8 stay where they are. |
| `template-v10.mjs` | The buyer confirmation email, template version `waitlist-confirmation-v10` (`renderWaitlistV10`), and `waitlistTemplateVersion`, the one rule that picks the template for every body. No imports. |
| `assets.mjs` | `serveSiteAsset` and `siteAssetType`: the asset folders below the top level (`/sky/`, `/audio/`, `/logos/`, `/connections/`, `/assets/cloud-3d/`). No imports. |
| `0001_lane_application.sql` | The D1 migration for `WAITLIST_DB`. Additive only. |
| `sync-bundle.mjs` | Writes the four modules (`template-v9.mjs`, `template-v10.mjs`, `lane.mjs`, `assets.mjs`) into `live-worker.js` between `// lane:begin <module>` and `// lane:end <module>`. `--check` exits 1 if the bundle differs. |
| `../live-worker.test.mjs` | `node --test deploy/site/live-worker.test.mjs`. The lane cases run against these modules in any checkout; the bundle cases run only when `live-worker.js` is present and are skipped with a printed reason otherwise. |

The bundle's sections are verbatim copies of the modules. The only change is that a leading `export ` is dropped, because the bundle is one module with its own export list. A test checks that they match.

## The contract

All bodies are JSON, posted to `/api/waitlist` from obavia.co or www.obavia.co. Origin, method, content type and body size are checked before any step runs. Step bodies may be up to 4096 bytes; the legacy body keeps its 2048-byte limit.

| Body | 200 answer | Other answers |
| --- | --- | --- |
| `{step:"lookup", gdn}` | `{status:"match", name, city, phoneLast4}` or `{status:"no_match"}` | 422 `invalid_gdn`; 429 `rate_limited` (120 per client per hour); 503 `lookup_unavailable` (no R2 list: the page falls back to checking the GDN's shape) |
| `{step:"code", gdn}` | `{status:"code_sent", phoneLast4}` | 422 `no_match`; 409 `no_phone`; 503 `code_unavailable` (no provider: the page skips the code page); 429 `rate_limited` with `Retry-After` (one per GDN per 30 s, five per GDN per hour, 10 per client per hour, 100 in total per hour); 502 `code_not_sent` |
| `{step:"verify", gdn, code}` | `{status:"verified"}` or `{status:"wrong_code"}` | 422 `invalid_code` (six digits only); 410 `code_expired` (10 minutes); 429 `too_many_attempts` (five per code; a new code resets them); 502 `verify_unavailable` |
| `{step:"apply", fullName, email, website, application}` | `{status:"accepted"}` or `{status:"accepted", key}` | 422 `invalid_email`, `invalid_full_name`, `invalid_application`; 429 `rate_limited` (the waitlist's own limits); 503 |
| `{email}` (the buyer page, `obavia-co/waitlist.html`) | `{status:"accepted"}` | Unchanged; the confirmation is now v10 |
| `{fullName, email, website}` (legacy) | `{status:"accepted"}` | Unchanged |

## Which confirmation a body gets

One function decides, `waitlistTemplateVersion(body, env.WAITLIST_TEMPLATE_VERSION)` in `template-v10.mjs`, and both joins in the worker call it:

1. The body has an `application` (the apply step): v9, the dealer email.
2. The body has no `application` and no `fullName` (the buyer page sends `{email}` only): v10, the buyer email.
3. Anything else (a `fullName` body from the legacy page or the dealer fallback in `lane-apply.js`): `WAITLIST_TEMPLATE_VERSION`, as before.

A `{email, firstName}` body has neither key, so it gets v10 too. No page in `obavia-co/` sends `firstName` today.

v10 copy: subject "You're on the lane"; the three pairs from the buyer page (a $250 deposit to bid, back if you lose; a Texas driver's license; a price, a time, a name); one link, "See the lane", to https://obavia.co/waitlist.html#deposit. `waitlist.html` has no `#how`; `#deposit` is where its three pairs start. No fee, no outcome, no saving, no refund timing (content.md S06 is open).

An email already on the list gets no second email whichever template the second body would pick: the outbox row is keyed by the entry.

## Asset folders

The bundle's asset branch serves top-level files and `/assets/` paths made of `[\w./-]` only. These pages need more, so `serveSiteAsset` runs first and answers for:

| Folder | Referenced by | Types |
| --- | --- | --- |
| `/sky/` | `obavia-co/cloud.css` lines 8, 20 to 23 (`sky/clouds/*.webp`); `shell.css` 29, 33 (`sky/paper.png`, `sky/grain.png`); `404.html` 26 to 42 and legacy `about.html`, `product.html`, `team.html` (`sky/w0.webp` to `w7.webp`) | webp, png |
| `/audio/` | `obavia-co/site.js` 99, 114 (`audio/cloud/cloud-<name>.wav`) | wav |
| `/logos/` | No page today; `obavia-co/logos/` holds 65 svg files | svg |
| `/connections/` | No page today and no top-level folder; the marks are in `obavia-co/assets/connections/`, already served | svg, png |
| `/assets/cloud-3d/` | `obavia-co/cloud3d.js` 17, `cloud3d-engine.js` 440, 444, 467 to 473 (`far@2x.webp`, `rest@2x.png`, `sheet.json`): the `@` fails the existing `/assets/` pattern | webp, png, json |

The type table is one map for all five: webp, png, svg, wav, woff2, json. Each folder may sit under `/obavia/`. GET and HEAD only; a segment may not start with a dot; any other extension, method or shape in these folders is 404 with `private, no-store`. Headers follow the existing branch: the `ASSETS` response's own (its `Cache-Control` included), plus `nosniff` and `no-referrer`, with `Content-Type` set from the extension on a 200. A path outside the folders returns `null` and the existing branches run unchanged. `audio/manifest.json` (legacy `landing.js` 151) is served as json.

How the steps work:
- **Lookup.** The list comes from R2: `tx/index.json` decides which licences are active and `tx/contacts.json` supplies the phone. Only the last four digits ever leave the worker.
- **Apply storage.** Apply uses the waitlist's own `join` (same rate limits, same entry, same outbox) with template v9. The cleaned-up answers are stored as JSON in `waitlist_entries.application`. The stored record carries the worker's own `gdnMatched` and `phoneVerified`, never the page's claim.
- **Same email twice.** An email already on the list keeps its entry and gets no second email; only the answers are attached.
- **Key.** Issued only when all of these hold: `ISSUE_KEYS=1`, the GDN matched, a Telnyx code was verified by the same client (HMAC of the IP) within 30 minutes, and that verification has not been used yet. The key comes from auction/worker `POST /dealers/mint` with `MINT_SECRET`, sent the GDN with the legal name and city from the TxDMV list. That secret can mint a dealer key and do nothing else: it cannot list, suspend or read anything, and auction/worker refuses it on every admin route. One verification gives one key. If minting fails, the answer is accepted without a key. auction/worker answers the same GDN twice within 30 minutes with 409 `already_minted` and no key, and mints at most 20 an hour in all; both come back here as accepted without a key. A mint whose response is lost on the way back cannot be repeated for 30 minutes, so that dealer gets the key from the admin.
- **Logging.** Nothing logs a phone number or a code. Telnyx holds the code; D1 holds neither.

## Env vars

New:
- `DEALERS`: R2 binding to the bucket the nightly job writes (`obavia-dealers`, `vars.DEALERS_R2_BUCKET`).
- `MESSAGING_PROVIDER`: `fake` for preview only (every code is 000000). A fake verification never earns a key.
- `TELNYX_API_KEY`, `TELNYX_VERIFY_PROFILE_ID`: secrets. Both must be set, or the code step answers 503.
- `ISSUE_KEYS`: `1` turns key issuance on. Off by default. Keys stay admin-only until the plan's gate.
- `AUCTION_API_URL`: https base URL of auction/worker.
- `MINT_SECRET`: secret, at least 32 characters. The same value as auction/worker's `MINT_SECRET`, and never its `DEALER_SECRET` (auction/worker answers 503 if the two are equal). `DEALER_SECRET` does not go on this worker.

None new for v10 or the asset folders. `WAITLIST_TEMPLATE_VERSION` now applies only to rule 3 above (bodies with a `fullName` and no `application`); `ASSETS` now also serves the asset folders.

Unchanged: `PUBLIC_ORIGIN`, `SECONDARY_ORIGIN`, `ABUSE_HMAC_KEY`, `WAITLIST_DB`, `WAITLIST_TEMPLATE_VERSION`, `ASSETS`, `CONFIRMATION_ENABLED`, `CONFIRMATION_ACTIVATION_AFTER_MS`, `CONFIRMATION_TEST_RECIPIENT`, `CONFIRMATION_EMAIL`, `WAITLIST_EMAIL_PROVIDER`, `WAITLIST_EMAIL_FROM`, `RESEND_API_KEY`, `OWNER_CONFIRMATION_TEST_*`.

## Porting into the private source

1. Copy `lane.mjs`, `template-v9.mjs`, `template-v10.mjs` and `assets.mjs` into the worker source unchanged, next to `worker.mjs` and `templates/`.
2. `endpoint.ts`:
   - Import `handleLaneStep` and `LANE_MAX_BYTES`.
   - Read up to `dependencies.lane ? LANE_MAX_BYTES : MAX_BYTES`.
   - After parsing, an object body with a `step` key goes to `handleLaneStep(payload, dependencies.lane, headers, respond, { emailOf, normalizeFullName })`.
   - Any other body larger than `MAX_BYTES` answers 413 `body_too_large`, as before. Invalid JSON larger than `MAX_BYTES` also answers 413.
3. `store.mjs`:
   - Accept `waitlist-confirmation-v9` and treat it like v8: full-named, personal, greeting from `coalesce(full_name, first_name)`.
   - Accept `waitlist-confirmation-v10`. It is not full-named, not named and not personal (like v1 to v5): the entry stores only the email, and the outbox row carries no greeting.
   - `join` takes `application` (a JSON string, at most 4096 characters). After the entry insert, add one `UPDATE waitlist_entries SET application=?, application_at=?`, guarded by the same limit checks as the insert, and only when `application` is given.
4. `delivery.mjs`: `confirmationEmail` accepts v9 and renders it with `renderWaitlistV9(job.greetingName)`; it accepts v10 and renders it with `renderWaitlistV10()`. `claim` returns `greetingName` for v9 and not for v10.
5. `worker.mjs`: on `/api/waitlist`, when `WAITLIST_DB` is bound, pass `lane: createLane({...})` built from:
   - `createDealerBook(env.DEALERS)`
   - `laneProvider(env, fetch)`
   - `laneKeyIssuer(env, fetch)`
   - a memoised `clientIdentity`
   - a `join` that uses the store with `templateVersion: waitlistTemplateVersion({ application, fullName }, env.WAITLIST_TEMPLATE_VERSION)`

   The legacy `join` passed to `handleWaitlist` uses `templateVersion: waitlistTemplateVersion({ fullName }, env.WAITLIST_TEMPLATE_VERSION)` in place of `env.WAITLIST_TEMPLATE_VERSION`. `handleWaitlist` itself is unchanged: it already calls `join(email)` for an `{email}` body.

   Before the existing asset branch (the `const asset = /^\/(?:obavia\/)?(?:assets...` test), add `const siteAsset = await serveSiteAsset(request, env, url); if (siteAsset) return siteAsset;`.

   Export `renderWaitlistV10`, `waitlistTemplateVersion` and `serveSiteAsset` from the bundle beside `renderLaneConfirmation`; the tests compare them with the modules.

   The bundle shows each of these steps exactly. Diff it against the pre-change copy.
6. Run `node --test deploy/site/live-worker.test.mjs` against the new build placed at `deploy/site/live-worker.js`.

## Order of release

v10 and the asset folders need no migration and no new binding or secret: port, run the tests, deploy. The steps below are for the dealer application.

1. Apply `0001_lane_application.sql` to `WAITLIST_DB`: `npx wrangler@4 d1 execute <waitlist database> --remote --file deploy/site/lane/0001_lane_application.sql`. The legacy path never reads the new columns or tables, so the old worker runs fine on the migrated database.
2. Bind `DEALERS` and set the Telnyx secrets. Set the GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` so the nightly job writes `tx/index.json` and `tx/contacts.json`. Until they exist, lookup answers 503 and the page checks the GDN's shape only.
3. Deploy the worker with `ISSUE_KEYS` unset.
4. Set `MINT_SECRET` on both workers (`npx wrangler secret put MINT_SECRET` in auction/worker and on `obavia-waitlist`), apply auction/worker migration `0007_dealer_mints.sql`, and set `ISSUE_KEYS=1` only once the plan's gate is met.

## Open items

- **The worker's routes decide whether the asset folders matter.** `deploy/site/README.md` says the Pages project `obavia` serves the site and this worker owns `/api/waitlist` and `/email-assets/`. The fix only changes production for paths this worker's routes actually receive.
- **Buyer sign-ups made before v10 deploys got the legacy email.** Nothing re-sends them; the outbox does not send twice.

- **The jsDelivr copy still carries last fours until the next nightly run.** `desk/ingest/txdmv.lib.mjs` `buildIndex` no longer writes `phoneLast4`; the public index carries `hasPhone` (1 or 0) instead, and the phone lives only in `tx/contacts.json` in R2. The bundled `desk/public/dealers/tx.index.json` was rewritten without the field. The `data-txdmv` branch is force-pushed with one commit each night, so the old copy is gone from the branch on the first run after this lands; jsDelivr is purged by that run. Earlier commits of `desk/public/dealers/tx.index.json` on `main` still hold the last fours in history.
- **Cold-start CPU is not measured.** The first lookup on a fresh isolate parses the 2.5 MB index plus the contacts file. That can exceed a 10 ms CPU limit if the Worker is on the free plan. The parsed list is cached for 15 minutes per isolate. If that is too slow, the nightly job should write one small object per GDN instead.
- **Telnyx profile settings.** The Telnyx Verify profile must be set to 6 digits and a 10-minute expiry. The worker enforces 10 minutes and five attempts on its side either way.
- **The email carries no key.** Application.md wants a copy of the key in the email. v9 does not include or promise one.
