/* Post A Car: one car, its photos and one caption, sent everywhere the dealer
   turned on. One question per page; then the posting agent's work, line by
   line, as it happens. Official-API channels are posted by the agent; the
   channels whose terms forbid automated posting are handed to the dealer's
   phone, ready, for them to post in two taps. */
import { useMemo, useState } from 'react';
import { MARKETPLACE_TERMS, consentIsCurrent } from './lib/consent';
import { POST_SPECS, draftCaption, laneLink, postSpec, postable, renditions, type Delivery, type Post } from './lib/post';
import { listingUrlOk, lotLinks, relistable, said, setListingUrl } from './lib/auction';
import { channelById } from './lib/reach';
import { postCar } from './lib/api';
import type { Vehicle } from './lib/sale';
import { savePost, useStore } from './store';
import { shrink } from './Paper';
import { Back, Choice, Ic, feel, go, transition } from './ui';

const PAGES = ['car', 'photos', 'caption', 'where', 'review'] as const;
type Page = (typeof PAGES)[number];
const MAX = 20;
const OPEN: Record<string, string> = {
  marketplace: 'https://www.facebook.com/marketplace/create/vehicle',
  craigslist: 'https://post.craigslist.org/',
  offerup: 'https://offerup.com/post',
};
const carName = (v: Vehicle) => `${v.year} ${v.make} ${v.model}`;
/** The car's lot on the lane now (a remembered lot the car has not left and that has not sold): its id, or null. The Marketplace
    text ends with its lane link (post.ts withLane), and the listing the dealer pastes after posting goes on it (deviation 6). */
export const laneLotFor = (vehicleId: string, links = lotLinks()) => links.find(l => l.vehicleId === vehicleId && !relistable(l) && !l.soldOn)?.lotId ?? null;
const Logo = ({ id }: { id: string }) => { const c = channelById(id); return <span className={`clogo sm${c?.wide ? ' wide' : ''}`}>{c?.logo ? <img src={c.logo} alt="" /> : <Ic n="globe" s={22} />}</span>; };

export function PostCar() {
  const { lot, dealer, reachWanted = [], consents } = useStore();
  const channels = postable(reachWanted, consentIsCurrent(consents?.marketplace, MARKETPLACE_TERMS));
  const [i, setI] = useState(0);
  const page: Page = PAGES[i];
  const [q, setQ] = useState('');
  const [car, setCar] = useState<Vehicle | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [caption, setCaption] = useState('');
  const [where, setWhere] = useState<string[]>(channels);
  const to = (n: number, d: 'fwd' | 'back' = 'fwd') => transition(() => { setI(n); scrollTo(0, 0); }, d);
  const found = useMemo(() => lot.filter(v => `${v.stock} ${v.year} ${v.make} ${v.model} ${v.vin}`.toLowerCase().includes(q.toLowerCase())), [lot, q]);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const more = await Promise.all([...files].slice(0, MAX - photos.length).map(f => shrink(f, 1600).catch(() => null)));
    setPhotos(p => [...p, ...more.filter((x): x is string => !!x)].slice(0, MAX)); setBusy(false); feel.next();
  };

  async function send() {
    if (!car) return;
    const onLane = laneLotFor(car.id);
    const post: Post = { id: `post-${Date.now().toString(36)}`, vehicleId: car.id, createdAt: new Date().toISOString(), photos, caption, channels: where, deliveries: [], ...(onLane ? { lane: laneLink(onLane) } : {}) };
    feel.done();
    const r = await postCar(post, car);
    // Offline (no API yet): nothing is published. API channels wait for their accounts; hand-offs are ready on this phone.
    const deliveries: Delivery[] = r.ok ? r.post.deliveries : renditions(post, car).map(x => ({ channel: x.channel, route: x.route, state: x.route === 'handoff' ? 'ready' : 'queued', at: post.createdAt }));
    const steps = r.ok ? r.steps : [
      { at: post.createdAt, text: `Wrote the post for ${where.length} ${where.length === 1 ? 'place' : 'places'}.` },
      ...renditions(post, car).map(x => ({ at: post.createdAt, channel: x.channel, text: x.route === 'handoff' ? `Listing prepared${x.title ? `: “${x.title}”` : ''}, ${x.photos.length} photos in order. Waiting on your tap.` : `Ready. It posts once ${postSpec(x.channel)?.name} is connected.` })),
    ];
    savePost({ ...post, deliveries, steps, preview: !r.ok } as Post);
    go(`/reach/post/${post.id}`);
  }

  const top = (
    <div className="top">
      {i > 0 ? <button className="back" onClick={() => { feel.tap(); to(i - 1, 'back'); }}><Ic n="chev" s={18} w={2.4} />Back</button> : <Back to="#/reach" label="Reach" />}
      <span className="progress">{i + 1} of {PAGES.length}</span>
    </div>
  );

  if (!channels.length) return (
    <main className="wrap center"><div className="top"><Back to="#/reach" label="Reach" /></div>
      <section className="enter" key="none">
        <h1 className="q">Pick Where Cars Go First.</h1>
        <p className="note">Turn on Facebook, Instagram, TikTok, Marketplace, Craigslist or OfferUp, then post here.</p>
        <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.next(); go('/reach'); }}>Choose Places</button></div></div>
      </section></main>
  );

  return (
    <main className="wrap center">
      {top}
      <div className="bar"><i style={{ width: `${((i + 1) / PAGES.length) * 100}%` }} /></div>

      {page === 'car' && <section className="enter" key="car">
        <h1 className="q">Which Car?</h1>
        <label className="field search"><Ic n="search" s={20} /><input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Stock, year, make, model or VIN" /></label>
        <div className="choices">{found.slice(0, 30).map(v => (
          <Choice key={v.id} label={carName(v)} gloss={[v.stock && `Stock ${v.stock}`, v.mileage != null && `${v.mileage.toLocaleString()} mi`].filter(Boolean).join(' · ')} on={car?.id === v.id}
            onPick={() => { setCar(v); setCaption(draftCaption(v, dealer)); to(1); }} />))}</div>
      </section>}

      {page === 'photos' && car && <section className="enter" key="photos">
        <h1 className="q">Add The Photos.</h1>
        <p className="note">{photos.length ? 'Tap a photo to make it the cover.' : 'The first one is the cover. Up to 20.'}</p>
        {photos.length > 0 && <div className="post-photos">{photos.map((p, n) => (
          <div key={n} className={'ph' + (n === 0 ? ' lead' : '')}>
            <button className="pick" aria-label={n === 0 ? 'Cover photo' : 'Make this the cover'} onClick={() => { feel.tap(); setPhotos(l => [l[n], ...l.filter((_, k) => k !== n)]); }}><img src={p} alt="" /></button>
            {n === 0 && <span className="tag">Cover</span>}
            <button className="x" aria-label="Remove" onClick={() => { feel.tap(); setPhotos(l => l.filter((_, k) => k !== n)); }}><span style={{ display: "grid", transform: "rotate(45deg)" }}><Ic n="plus" s={14} w={2.6} /></span></button>
          </div>))}</div>}
        {photos.length < MAX && <div className="choices">
          <label className="choice" style={{ cursor: 'pointer' }}><span className="art"><Ic n="upload" s={24} /></span><span className="t"><b>{busy ? 'Adding…' : photos.length ? 'Add More' : 'Choose Photos'}</b><small>{photos.length ? `${photos.length} of ${MAX}` : 'From your camera roll'}</small></span>
            <input type="file" accept="image/*" multiple hidden onChange={e => { add(e.target.files); e.target.value = ''; }} /></label>
        </div>}
      </section>}

      {page === 'caption' && car && <section className="enter" key="caption">
        <h1 className="q">The Caption.</h1>
        <p className="note">Written from the car’s record. Change anything.</p>
        <label className="field"><textarea className="input post-caption" value={caption} onChange={e => setCaption(e.target.value)} rows={8} maxLength={4000} aria-label="Caption" /></label>
        <p className="hint">{[...caption].length.toLocaleString()} characters</p>
      </section>}

      {page === 'where' && <section className="enter" key="where">
        <h1 className="q">Where Does It Go?</h1>
        <div className="choices">{POST_SPECS.filter(s => channels.includes(s.id)).map(s => (
          <button key={s.id} className="choice" aria-pressed={where.includes(s.id)} onClick={() => { feel.tap(); setWhere(w => w.includes(s.id) ? w.filter(x => x !== s.id) : [...w, s.id]); }}>
            <Logo id={s.id} /><span className="t"><b>{s.name}</b><small>{s.route === 'api' ? 'Posted for you' : 'Ready on your phone. You tap Post'}</small></span>
            <span className="tick">{where.includes(s.id) && <Ic n="check" s={15} w={3} />}</span>
          </button>))}</div>
      </section>}

      {page === 'review' && car && <section className="enter" key="review">
        <h1 className="q">Ready To Post.</h1>
        <div className="post-review">
          {photos[0] && <img className="lead" src={photos[0]} alt="" />}
          <b>{carName(car)}</b><small>{photos.length} {photos.length === 1 ? 'photo' : 'photos'}</small>
        </div>
        <div className="choices">{renditions({ photos, caption, channels: where }, car).map(r => (
          <div key={r.channel} className="choice static"><Logo id={r.channel} />
            <span className="t"><b>{postSpec(r.channel)?.name}</b><small>{[r.route === 'api' ? 'Posted for you' : 'Ready on your phone', ...r.notes.filter(n => !/You tap Post/.test(n))].join(' · ')}</small></span></div>))}</div>
      </section>}

      <div className="dock"><div className="in">
        {page === 'photos' && <button className="btn primary block" disabled={!photos.length || busy} onClick={() => { feel.next(); to(2); }}>Continue</button>}
        {page === 'caption' && <button className="btn primary block" disabled={!caption.trim()} onClick={() => { feel.next(); to(3); }}>Continue</button>}
        {page === 'where' && <button className="btn primary block" disabled={!where.length} onClick={() => { feel.next(); to(4); }}>Continue</button>}
        {page === 'review' && <button className="btn primary block" onClick={send}>Post It</button>}
      </div></div>
    </main>
  );
}

type Saved = Post & { steps?: { at: string; channel?: string; text: string }[]; preview?: boolean };

/** The post after it went: the agent's work, line by line, and what is waiting on the dealer. */
export function PostStatus({ id }: { id: string }) {
  const { posts = [], lot } = useStore();
  const p = posts.find(x => x.id === id) as Saved | undefined;
  if (!p) return <PostCar />;
  const car = lot.find(v => v.id === p.vehicleId);
  const waiting = p.deliveries.filter(d => d.state === 'ready');
  return (
    <main className="wrap center"><div className="top"><Back to="#/reach" label="Reach" /></div>
      <section className="enter" key="status">
        <h1 className="q">{waiting.length ? 'Almost Everywhere.' : 'Posted.'}</h1>
        {car && <p className="note">{carName(car)}</p>}
        <ol className="agent-log">{(p.steps ?? []).map((s, n) => (
          <li key={n} style={{ ['--n' as string]: n }}>{s.channel ? <Logo id={s.channel} /> : <span className="dot" />}<span>{s.text}</span></li>))}</ol>
        {p.preview && <span className="example">Preview: nothing was posted. Posting turns on when the Desk is connected.</span>}
        {waiting.length > 0 && <div className="choices">{waiting.map(d => (
          <a key={d.channel} className="choice" href={`#/reach/post/${p.id}/${d.channel}`} onClick={feel.next}>
            <Logo id={d.channel} /><span className="t"><b>Post On {postSpec(d.channel)?.name}</b><small>Ready on this phone</small></span><span className="go"><Ic n="chev" s={18} w={2.4} /></span></a>))}</div>}
      </section>
      <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.done(); go('/reach'); }}>Done</button></div></div>
    </main>
  );
}

/** One hand-off: the text to copy, the photos to save, the app to open. Then "I Posted It". */
export function PostHandoff({ id, channel }: { id: string; channel: string }) {
  const { posts = [], lot } = useStore();
  const p = posts.find(x => x.id === id);
  const car = p && lot.find(v => v.id === p.vehicleId);
  const r = p && car ? renditions({ ...p, channels: [channel] }, car)[0] : undefined;
  const [copied, setCopied] = useState(false);
  /* Marketplace, with the car on the lane: after I Posted It, the listing's own link is asked once and sent to the lot
     (POST /lots/:id/car { listingUrl }), so Sold can open it to end the listing (deviation 6). "Later" posts without it. */
  const [asking, setAsking] = useState(false);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!p || !car || !r) return <PostStatus id={id} />;
  const name = postSpec(channel)?.name ?? channel;
  const lotOnLane = channel === 'marketplace' ? laneLotFor(car.id) : null;
  const text = [r.title, r.caption].filter(Boolean).join('\n\n');
  const savePhotos = async () => {
    feel.tap();
    const files = await Promise.all(r.photos.map(async (src, n) => new File([await (await fetch(src)).blob()], `${car.stock || 'car'}-${n + 1}.jpg`, { type: 'image/jpeg' })));
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.canShare?.({ files })) { await nav.share({ files }).catch(() => undefined); return; }
    files.forEach(f => { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); });
  };
  const posted = (url?: string) => { feel.done(); savePost({ ...p, deliveries: p.deliveries.map(d => d.channel === channel ? { ...d, state: 'posted', at: new Date().toISOString(), ...(url ? { url } : {}) } : d) }); go(`/reach/post/${id}`); };
  const keep = async () => {
    if (!lotOnLane) return;
    feel.next(); setBusy(true); setErr(null);
    const r2 = await setListingUrl(lotOnLane, link);
    setBusy(false);
    if (r2.ok) posted(link.trim()); else setErr(said(r2.reason));
  };
  if (asking) return (
    <main className="wrap center"><div className="top"><button className="back" onClick={() => { feel.tap(); setAsking(false); }}><Ic n="chev" s={18} w={2.4} />Back</button></div>
      <section className="enter" key="link">
        <h1 className="q">The Listing’s Link.</h1>
        <p className="note">Copy it from your listing. Sold ends it from here.</p>
        <label className="field"><input className="input" type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="done" autoFocus value={link} onChange={e => setLink(e.target.value)} placeholder="https://www.facebook.com/marketplace/item/…" maxLength={300} aria-label="Your Marketplace listing’s link" /></label>
        {err && <p className="note" role="alert">{err}</p>}
      </section>
      <div className="dock"><div className="in">
        <button className="btn primary block" disabled={busy || !listingUrlOk(link)} onClick={keep}>{busy ? 'Keeping…' : 'Keep It'}</button>
        <button className="textlink" onClick={() => posted()}>Later</button>
      </div></div>
    </main>
  );
  return (
    <main className="wrap center"><div className="top"><Back to={`#/reach/post/${id}`} label="Post" /></div>
      <section className="enter" key={channel}>
        <Logo id={channel} />
        <h1 className="q">Post It On {name}.</h1>
        <p className="note">Everything is ready. Three taps, in order.</p>
        <div className="choices">
          <Choice icon="copy" label={copied ? 'Copied' : 'Copy The Text'} gloss={r.title ?? `${[...r.caption].length} characters`} on={copied} onPick={async () => { await navigator.clipboard?.writeText(text).catch(() => undefined); setCopied(true); }} />
          <Choice icon="upload" label="Save The Photos" gloss={`${r.photos.length} in order, cover first`} onPick={savePhotos} />
          {OPEN[channel] && <a className="choice" href={OPEN[channel]} target="_blank" rel="noreferrer" onClick={feel.tap}><span className="art"><Ic n="link" s={24} /></span><span className="t"><b>Open {name}</b><small>Paste the text, add the photos, post</small></span></a>}
        </div>
      </section>
      <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { if (lotOnLane) { feel.next(); setAsking(true); } else posted(); }}>I Posted It</button></div></div>
    </main>
  );
}
