# Draft (not deployed): obavia-waitlist Worker — store the waitlist answers

The public pages in `obavia-co/` already ask these questions. They send `sellChannel`, `callsPerWeek`, `topObjection`, optional `phone`, and `utm` only when `window.OBAVIA_WAITLIST_V2 === true`. That flag ships **false**. The live Worker rejects unknown keys with HTTP 422, so the flag stays false until this draft is applied and deployed. Role and team size are not collected.

Read-only pull of the live Worker (account "Obawemimo", script `obavia-waitlist`, D1 binding `WAITLIST_DB` = ecbbcfa5-eeef-4ef9-b136-086a31432c4b). Live bundle saved as `worker.original.js` (first ~21 KB; full bundle is 54.9 KB). Source modules per the bundle: `src/server/waitlist/endpoint.ts`, `store.mjs`, `worker.mjs` — not in whoisjaso/obavia, so apply this in that source tree, rebuild, and `wrangler deploy` only after Jason OKs.

Do not deploy this from the marketing-site pull request. Publishing `obavia-co/` does not change the Worker.

## Site gate

`obavia-co/waitlist.html` sets `window.OBAVIA_WAITLIST_V2 = false`.

| Flag | JSON body |
|---|---|
| `false` (default) | `fullName`, `email`, `website` only. Same keys the live Worker accepts. |
| `true` | Those three, plus `sellChannel` (`phone` \| `video` \| `both`), `callsPerWeek` (integer `0`–`999`), `topObjection` (required, ≤280; omitted only if somehow empty), optional `phone` (omitted when blank), and optional `utm` (a JSON string of `utm_*` query params, ≤512, omitted when there are none). |

Turn the flag on only after the migration and the Worker below are in production. The honeypot field remains `website`.

## 1. D1 migration (0009_waitlist_answers.sql)

```sql
ALTER TABLE waitlist_entries ADD COLUMN sell_channel TEXT;      -- 'phone' | 'video' | 'both'
ALTER TABLE waitlist_entries ADD COLUMN calls_per_week INTEGER; -- 0..999
ALTER TABLE waitlist_entries ADD COLUMN top_objection TEXT;     -- required free text, <=280 chars
ALTER TABLE waitlist_entries ADD COLUMN phone TEXT;             -- optional, omitted when blank
ALTER TABLE waitlist_entries ADD COLUMN utm TEXT;               -- optional JSON of utm_* params, <=512 chars
```

## 2. endpoint.ts — accept the new keys

```diff
- if (!email || Object.keys(data).some((k) => k !== "email" && k !== "website" && k !== "firstName" && k !== "fullName") || ...
+ const ALLOWED = new Set(["email","website","firstName","fullName","sellChannel","callsPerWeek","topObjection","phone","utm"]);
+ if (!email || Object.keys(data).some((k) => !ALLOWED.has(k)) || ...
+ const pick = (v, ok) => v === undefined ? null : (ok.includes(v) ? v : undefined);
+ const calls = Number.isInteger(data.callsPerWeek) && data.callsPerWeek >= 0 && data.callsPerWeek <= 999 ? data.callsPerWeek : (data.callsPerWeek === undefined ? null : undefined);
+ const phone = data.phone === undefined || data.phone === "" ? null : (typeof data.phone === "string" && data.phone.length <= 20 ? data.phone : undefined);
+ const answers = {
+   sellChannel: pick(data.sellChannel, ["phone","video","both"]),
+   callsPerWeek: calls,
+   topObjection: data.topObjection === undefined || data.topObjection === "" ? null : normalizeName(data.topObjection, 280),
+   phone,
+   utm: typeof data.utm === "string" && data.utm.length <= 512 ? data.utm : null,
+ };
+ if (Object.values(answers).some((v) => v === undefined)) return respond(422, "invalid_answers");
- await dependencies.join(email, void 0, fullName)
+ await dependencies.join(email, void 0, fullName, answers)   // thread through worker.mjs wiring
```

MAX_BYTES 2048 is enough (280+512 worst case); keep it.

## 3. store.mjs — join() writes them

```diff
- async join(value, { clientKey = null, firstName = void 0, fullName = void 0 } = {}) {
+ async join(value, { clientKey = null, firstName = void 0, fullName = void 0, answers = {} } = {}) {
...
- INSERT INTO waitlist_entries(id,email,created_at${named?",first_name":""}${fullNamed?",full_name":""})
+ INSERT INTO waitlist_entries(id,email,created_at,sell_channel,calls_per_week,top_objection,phone,utm${...same...})
  (bind answers.sellChannel ?? null, answers.callsPerWeek ?? null, answers.topObjection ?? null, answers.phone ?? null, answers.utm ?? null)
```

On duplicate email (existing ON CONFLICT path) optionally `UPDATE waitlist_entries SET sell_channel=COALESCE(?,sell_channel), calls_per_week=COALESCE(?,calls_per_week), top_objection=COALESCE(?,top_objection), phone=COALESCE(?,phone), utm=COALESCE(?,utm)` so repeat sign-ups refresh answers.

`/guide` posts `{ email, website }` only, with the same honeypot, and does not send the new keys. That shape already matches the live Worker.

## 4. Tests to add

- accepts payload with all answers / with none (back-compat with current form)
- rejects unknown enum values (422 invalid_answers) and unknown keys
- callsPerWeek outside 0–999, or not an integer, rejected
- phone longer than 20 characters rejected; blank phone stored as null
- topObjection > 280 chars rejected; control chars rejected
- answers persisted in D1 (miniflare)

## Deploy order (needs Jason)

1. `wrangler d1 migrations apply WAITLIST_DB --remote`
2. Deploy the Worker
3. Only then set `window.OBAVIA_WAITLIST_V2 = true` on the waitlist page and ship that change

The new waitlist page can ship earlier with the flag left false. It asks the questions and does not send the new keys.
