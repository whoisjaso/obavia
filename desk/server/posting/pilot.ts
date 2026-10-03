/* The posting pilot: run the real posting agent from a terminal against one
   dealership's own accounts (Triple J Auto Investment is the first).

   Dry run by default: prints exactly what each channel would receive and
   posts nothing. Add --publish to post for real.

     npx tsx server/posting/pilot.ts --car car.json --photos ./photos [--caption caption.txt] [--dealer dealer.json] [--publish]

   car.json:     { "id", "stock", "vin", "year", "make", "model", "bodyStyle", "price", "mileage", "color", "titleStatus" }
   dealer.json:  { "dba", "legalName", "phone", "city" }   (kept out of the repository)
   photos:       JPEG or PNG files, posted in name order; the first is the cover

   Read from the environment, never from a file in the repository:
     META_PAGE_TOKEN   a Page access token for the dealer's Facebook Page
     META_PAGE_ID      that Page's id
     META_IG_USER_ID   the Instagram business account linked to the Page (optional) */
import { readFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { draftCaption, renditions, type Post } from '../../src/lib/post';
import type { Vehicle } from '../../src/lib/sale';
import { PostingAgent } from './service';
import { FacebookPagePublisher, InstagramPublisher } from './meta';
import { FacebookPhotoHost } from './fbhost';
import { MemoryPostStore } from './fake';

const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };
const publish = process.argv.includes('--publish');
const car = JSON.parse(readFileSync(arg('car') ?? 'car.json', 'utf8')) as Vehicle;
const dealer = arg('dealer') ? JSON.parse(readFileSync(arg('dealer')!, 'utf8')) : { dba: '', legalName: '', phone: '', city: '' };
const dir = arg('photos') ?? 'photos';
const photos = readdirSync(dir).filter(f => /\.(jpe?g|png)$/i.test(f)).sort().map(f =>
  `data:image/${extname(f).toLowerCase() === '.png' ? 'png' : 'jpeg'};base64,${readFileSync(join(dir, f)).toString('base64')}`);
const caption = arg('caption') ? readFileSync(arg('caption')!, 'utf8').trim() : draftCaption(car, dealer);

const { META_PAGE_TOKEN: token, META_PAGE_ID: pageId, META_IG_USER_ID: igUserId } = process.env;
const channels = ['facebook-page', ...(igUserId ? ['instagram'] : [])];
const post: Post = { id: `pilot-${car.stock || car.vin.slice(-6)}-${Date.now().toString(36)}`, vehicleId: car.id, createdAt: new Date().toISOString(), photos, caption, channels, deliveries: [] };

console.log(`\n${car.year} ${car.make} ${car.model} · ${photos.length} photos · ${channels.join(', ')}\n`);
for (const r of renditions(post, car)) console.log(`── ${r.channel}: ${r.photos.length} photos${r.notes.length ? ` (${r.notes.join(' ')})` : ''}\n${r.caption}\n`);

if (!publish) { console.log('Dry run: nothing was posted. Add --publish to post for real.'); process.exit(0); }
if (!token || !pageId) { console.error('META_PAGE_TOKEN and META_PAGE_ID must be set in the environment.'); process.exit(1); }
if (!photos.length) { console.error('No photos found.'); process.exit(1); }

const store = new MemoryPostStore();
store.accounts.set(`pilot:facebook-page`, { channel: 'facebook-page', token, pageId });
if (igUserId) store.accounts.set(`pilot:instagram`, { channel: 'instagram', token, igUserId });
const agent = new PostingAgent(store, new FacebookPhotoHost(pageId, token), [new FacebookPagePublisher(), new InstagramPublisher()]);
const r = await agent.run('pilot', post, car);
for (const s of r.steps) console.log(`${s.channel ? `[${s.channel}] ` : ''}${s.text}`);
for (const d of r.post.deliveries) console.log(`${d.channel}: ${d.state}${d.url ? ` ${d.url}` : ''}${d.reason ? ` (${d.reason})` : ''}`);
