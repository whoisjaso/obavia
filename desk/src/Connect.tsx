/* Connect Facebook and Instagram: one tap for the dealer. Facebook's own
   login does the rest; the Desk only ever sees Page names, never a token. */
import { useEffect, useState } from 'react';
import { metaChoose, metaConnectUrl, metaStatus, type MetaPage } from './lib/api';
import { Back, Choice, Ic, feel, go } from './ui';

const SAY: Record<string, string> = {
  offline: 'Connecting turns on when the Desk is online.',
  not_set_up: 'Connecting isn’t switched on yet. We’re finishing it.',
  denied: 'Facebook was closed before you finished. Try again when you’re ready.',
  expired: 'That took a while, so it timed out. Try again.',
  bad_state: 'That link didn’t come from this Desk. Try again from here.',
  no_pages: 'That Facebook account doesn’t manage a Page. Sign in as the person who runs the dealership’s Page.',
  meta_error: 'Facebook didn’t answer. Try again in a minute.',
};

/** Tap: off to Facebook. */
export async function startConnect(setSay: (s: string) => void) {
  feel.next();
  const r = await metaConnectUrl();
  if (r.ok) location.href = r.url; else setSay(SAY[r.reason] ?? SAY.meta_error);
}

export function ConnectMeta({ reason }: { reason?: string }) {
  const [say, setSay] = useState(reason ? SAY[reason] ?? SAY.meta_error : '');
  const [busy, setBusy] = useState(false);
  return (
    <main className="wrap center"><div className="top"><Back to="#/reach" label="Reach" /></div>
      <section className="enter" key="connect">
        <span className="connect-logos">
          <span className="clogo lg"><img src="./systems/facebook.png" alt="" /></span><span className="clogo lg"><img src="./reach/instagram.svg" alt="" /></span>
        </span>
        <h1 className="q">Connect Facebook And Instagram.</h1>
        <p className="note">{say || 'Sign in with Facebook and pick your dealership’s Page. Its Instagram comes with it. That’s all.'}</p>
      </section>
      <div className="dock"><div className="in">
        <button className="btn primary block" disabled={busy} onClick={async () => { setBusy(true); await startConnect(setSay); setBusy(false); }}>{busy ? 'Opening Facebook…' : reason ? 'Try Again' : 'Continue With Facebook'}</button>
      </div></div>
    </main>
  );
}

export function PickPage({ list }: { list: string }) {
  const pages = (() => { try { return JSON.parse(decodeURIComponent(atob(list))) as MetaPage[]; } catch { return []; } })();
  const [say, setSay] = useState('');
  if (!pages.length) return <ConnectMeta reason="expired" />;
  return (
    <main className="wrap center"><div className="top"><Back to="#/reach" label="Reach" /></div>
      <section className="enter" key="pick">
        <h1 className="q">Which Page?</h1>
        <p className="note">{say || 'The one your cars should post to.'}</p>
        <div className="choices">{pages.map(p => (
          <Choice key={p.pageId} label={p.name} gloss={p.igUsername ? `Instagram @${p.igUsername}` : 'No Instagram linked'}
            onPick={async () => { const r = await metaChoose(p.pageId); if (r.ok) go('/reach/connected'); else setSay(SAY[r.reason] ?? SAY.expired); }} />))}</div>
      </section>
    </main>
  );
}

export function Connected() {
  const [list, setList] = useState<{ channel: string; handle: string | null }[] | null>(null);
  const [off, setOff] = useState('');
  useEffect(() => { metaStatus().then(r => { if (r.ok) setList(r.connected); else setOff(SAY[r.reason] ?? SAY.meta_error); }); }, []);
  if (off) return <ConnectMeta reason={off === SAY.offline ? 'offline' : 'meta_error'} />;
  const fb = list?.find(x => x.channel === 'facebook-page'), ig = list?.find(x => x.channel === 'instagram');
  return (
    <main className="wrap center"><div className="top"><Back to="#/reach" label="Reach" /></div>
      <section className="enter" key="connected">
        <span className="done-mark pop"><Ic n="check" s={38} w={3} /></span>
        <h1 className="q">Connected.</h1>
        <p className="note">{list === null ? 'Checking…' : [fb?.handle && `Facebook: ${fb.handle}`, ig?.handle && `Instagram: @${ig.handle}`].filter(Boolean).join(' · ') || 'Nothing is connected yet.'}</p>
      </section>
      <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.next(); go('/reach/post'); }}><Ic n="sparkle" s={20} />Post A Car</button></div></div>
    </main>
  );
}
