# Reach: the posting agent

October 2, 2026. This is the first step toward go-to-market agents inside Obavia Desk.

## Positioning

A Chrome extension fills in forms on the dealer's own computer. It can't think, it stops when the laptop closes, and it breaks whenever a page changes.

Obavia's Reach is an **agent with its own cloud computer**. It runs in our cloud, not on the dealer's machine. Given a car, it does the work a person would do for each channel:
- writes the post;
- sizes it for each place;
- uploads the photos;
- publishes;
- opens the live post to check it went up;
- writes down every step, so the dealer watches the work happen.

This is the same shape as the agent products the owner pointed to: agents that each have their own cloud computer, and go-to-market agents. It is applied to the one job a car lot does every day.

**What we don't do:** sign in as the dealer on platforms whose terms forbid automated posting.
- Facebook's terms forbid automated access without permission.
- Craigslist's terms forbid automated posting.
- Accounts get banned for both.

For those channels the agent does everything except the last tap. The listing is prepared, sized to the form and waiting on the dealer's phone: copy the text, save the photos, open the app, post. That keeps the dealer's accounts safe. It's also a selling point: **"we never risk your Marketplace account."**

## What's built (start small)

**One car, one set of photos and one caption, sent everywhere the dealer turned on.**

| Channel | How it posts | Limits (source) |
| --- | --- | --- |
| Facebook Page | Official Graph API. Each photo is uploaded unpublished, then one feed post carries them all | 10 photos per post (our cap) |
| Instagram | Official Graph API: a carousel of items, then publish | 2,200 characters, 30 hashtags, 20 @ tags, 10 photos (Meta IG User Media reference, v26.0) |
| TikTok | Content Posting API, photo post. **Planned:** the spec is in place, but the publisher isn't built yet | 90-character title, 4,000-character description, 35 images (TikTok photo post reference) |
| Facebook Marketplace | Hand-off to the dealer's phone | No posting API for dealer vehicles since January 30, 2023 |
| Craigslist | Hand-off to the dealer's phone | 70-character title, 24 photos |
| OfferUp | Hand-off to the dealer's phone | No public posting API |

**The caption is drafted from the car's record and nothing else:**
- year, make and model, and the price when one is set;
- miles, colour and body style;
- the title, but only when it's clean or a disclosed rebuilt;
- the VIN;
- the dealership's name, city and phone.

The dealer edits it before anything goes out. A limit we haven't confirmed cuts nothing.

**The agent (`desk/server/posting/`):**
- `service.ts` is the PostingAgent. Photos go up once. Each (post, channel) pair is claimed first, so a retry never posts the same car twice. It keeps a step log.
- `meta.ts` holds the Facebook Page and Instagram publishers, built against Graph API v26.0.
- `cloudflare.ts` covers storage and the browser:
  - posts and connected accounts in D1, with account tokens sealed with AES-GCM; never a password;
  - photos in R2 at a public address, so Meta can fetch them;
  - Cloudflare Browser Rendering as the agent's cloud browser. For now it is used only to open each published post and keep a screenshot as proof.
- `POST /api/posts` accepts the Desk's session token.

**In the Desk (`src/PostCar.tsx`), one question per page:**
1. Which Car?
2. Add The Photos (tap one to make it the cover).
3. The Caption.
4. Where Does It Go?
5. Ready To Post.

After that comes the agent's work, line by line. Each hand-off has its own page: Copy The Text, Save The Photos, Open the app, then I Posted It.

## Connecting a dealer's accounts: one tap

A dealer never handles a token. In Reach they tap **Connect Facebook And Instagram**. Facebook's own login opens (Facebook Login for Business, with Obavia's configuration), they tap Continue, and they choose their Page.

The Worker (`server/posting/connect.ts`, `GET /oauth/meta`) then does the rest:
1. It turns Facebook's one-time code into a long-lived login, using the app secret, which never leaves the Worker.
2. It reads the Pages the dealer manages, each with a Page token that doesn't expire, and the Instagram business account linked to each.
3. **One Page:** connected on the spot. **Several:** the Desk asks "Which Page?"

Tokens are sealed before they are stored. The Desk only ever sees Page names.

A login started by one dealer can't connect another:
- the state is signed and expires in 15 minutes;
- a cancelled, stale or forged login connects nothing and says why in plain words.

Until the photo bucket exists, photos are hosted on the dealer's own Page. So a connected dealer can post with nothing else set up.

## One-time setup (Obavia, never the dealer)

1. **Meta app.** One Business-type app, "Obavia".
   - Add Facebook Login for Business and create a configuration with the permissions in `META_SCOPES`: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `business_management`, `instagram_basic`, `instagram_content_publish`.
   - Redirect URI: `https://api.obavia.co/oauth/meta`.
2. **Pilot right away.** In Development mode, anyone with a role on the app can connect. Triple J's owner, as app admin, taps Connect and posts with no review.
3. **Every dealer after that** needs two things from Meta:
   - Business Verification for Obavia;
   - App Review for those permissions, which needs a screencast of the Connect flow and a post.

   Once approved, any dealer connects in one tap.
4. **Worker config.**
   - Vars: `META_APP_ID`, `META_CONFIG_ID`, `DESK_URL`.
   - Secret: `META_APP_SECRET`.
   - Apply the new tables in `server/schema.sql`.
   - Deploy with the owner's go-ahead.

## To turn on (owner and engineering)

- **Meta:**
  - a Meta app with `pages_manage_posts`, `pages_read_engagement`, `instagram_basic` and `instagram_content_publish`, through App Review;
  - the "Connect Facebook" login that stores each dealer's Page token.
- **Cloudflare:**
  - an R2 bucket with a public domain (`PHOTOS`, `PHOTOS_URL`);
  - the Browser Rendering binding (`BROWSER`);
  - apply the `post` and `post_account` tables in `server/schema.sql`.
- Deploy only with the owner's go-ahead.
- **TikTok:** an app approved for the Content Posting API, then the photo-post publisher.

## Next: go-to-market agents

The same agent shape can take on more of the lot's selling:
- **Reprice and repost** a car that hasn't sold in N days, with the dealer's approval.
- **Answer the first message** from a listing with the car's facts and a time to come in. This goes through the messaging layer's consent gate, and a human approves until the owner says otherwise.
- **A weekly "what's working" report:** which channel brought which buyer, read from the Desk's own sales.

Each one gets its own step log, works only through official APIs or the dealer's own hand, and has a stop button.
