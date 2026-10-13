/* A document on the glass. The one justified read: the law requires it. The
   page scrolls; reaching the end unlocks the pad (medium impact). The Desk's
   own render of each document (Buyers Guide, bill of sale, title assignment)
   drops into the page body; until it is wired the body is the page's shape.
   With `url` and a Worker, the body is the real PDF through the Worker's
   viewer (/view?u=&token=): a WebView on the phone, an iframe on the web, and
   only the viewer's "end" unlocks the pad. Signing sends the drawing to the
   Worker (SignDocs: POST /sales/:lot/sign), which stamps it into the Desk's
   bytes; `signed` is then the signed copy's viewer path and the page shows
   that copy (the same bytes plus the stamp), with no pad: the one thing left
   is Done. The consent sits under the verb it is given by. */
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Sheet } from '../components/Sheet';
import { Object3D } from '../components/Object3D';
import { Button, Label } from '../components/Type';
import { feel } from '../feel';
import { AUCTION_URL, buyerToken } from '../store';
import { theme } from '../theme';

/** A drawing as SVG markup (`<svg viewBox="0 0 w h"><path d="…"/></svg>`, the pad's own units). In the sale,
    once the Worker stamped it, the signed copy's viewer path (/sales/<lot>/view/<doc>) stands in its place:
    the phone keeps no signature after the Worker has it. */
export type Signature = string;

/** The consent the Sign press gives, and its version: the Worker's and the Desk's (worker/src/sign.ts,
    desk/src/lib/sign.ts). Bus. & Com. Code §322.005(b). */
export const CONSENT_VERSION = '2026-10-13';
export const CONSENT_TEXT = 'I agree to sign electronically.';

/** The drawing's path data and box, read back from the markup (the reuse preview). */
export function inkOf(sig: Signature): { d: string; w: number; h: number } {
  const d = sig.match(/\sd="([^"]*)"/)?.[1] ?? (sig.startsWith('<') ? '' : sig);
  const vb = sig.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  return { d, w: vb ? Number(vb[1]) : 300, h: vb ? Number(vb[2]) : 110 };
}
/** The pad's drawing as the markup the Worker reads. */
export const markup = (d: string, w: number, h: number): Signature =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.round(w)} ${Math.round(h)}"><path d="${d}" fill="none" stroke="#1C2436" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* The Worker's viewer for a document: `u` is the document's path on the Worker
   (/documents/<lot>/<name>.pdf); the viewer appends the token itself. A signed
   copy has its own viewer path (/sales/<lot>/view/<doc>), read by its buyer only. */
function viewerUrl(url: string): string {
  let path = url;
  try { path = new URL(url).pathname; } catch {}
  return `${AUCTION_URL}/view?u=${encodeURIComponent(path)}&token=${encodeURIComponent(buyerToken() ?? '')}`;
}
const signedViewerUrl = (path: string) => `${AUCTION_URL}${path}?token=${encodeURIComponent(buyerToken() ?? '')}`;
/** A sale's stored value is a signed copy's viewer path once the Worker stamped it. */
export const isSignedPath = (v: string | undefined): v is string => !!v && v.startsWith('/sales/');

export function Paper({ title, subtitle, onClose, sign, reuse, url, signed }: {
  title: string; subtitle?: string; onClose: () => void;
  url?: string;                              // the document's absolute URL on the Worker, without token
  signed?: string;                           // the signed copy's viewer path: shown instead of the original, and no pad
  /** present: this document needs a signature. A promise is the Worker's answer: false keeps the pad, with one line. */
  sign?: (sig: Signature, reused: boolean) => void | Promise<boolean>;
  reuse?: Signature;                         // a signature already given today: one tap reuses it, consent logged
}) {
  const [atEnd, setAtEnd] = useState(false);
  const [path, setPath] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const pts = useRef<string[]>([]);
  const layoutH = useRef(0);
  const [pad, setPad] = useState({ w: 300, h: 110 });   // the pad's size: the ink is drawn and sent in these units
  const view = signed && AUCTION_URL ? signedViewerUrl(signed) : url && AUCTION_URL ? viewerUrl(url) : null;   // the real document; else the page's shape
  const needsSign = !!sign && !signed;
  const reached = useRef(false);
  const reach = () => {
    if (reached.current) return;
    reached.current = true; setAtEnd(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (view) return;                        // the viewer's "end" decides, not the sheet
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (!atEnd && layoutMeasurement.height + contentOffset.y >= contentSize.height - 24) reach();
  };
  const frame = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    if (!view || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const on = (e: MessageEvent) => {
      if (frame.current && e.source !== frame.current.contentWindow) return;
      if (e.data === 'end') reach();
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, [view]);
  const onMessage = (e: WebViewMessageEvent) => { if (e.nativeEvent.data === 'end') reach(); };
  const draw = Gesture.Pan().minDistance(0).runOnJS(true)
    .onBegin(e => { pts.current.push(`M${e.x.toFixed(1)} ${e.y.toFixed(1)}`); setPath(pts.current.join(' ')); })
    .onUpdate(e => { pts.current.push(`L${e.x.toFixed(1)} ${e.y.toFixed(1)}`); setPath(pts.current.join(' ')); });
  // a step, not the win: the ding and a light impact once the Worker has it (at once without a Worker)
  const file = async (sig: Signature, reused: boolean) => {
    if (busy || !sign) return;
    setBusy(true); setFailed(false);
    const ok = await Promise.resolve(sign(sig, reused)).catch(() => false);
    setBusy(false);
    if (ok === false) { setFailed(true); return; }
    feel.step();
  };
  const seen = reuse ? inkOf(reuse) : null;

  return (
    <Sheet detents={[0.5, 1]} initial={1} onClose={onClose} header={<View style={s.head}>
      {/* the title, the paper itself, touching the document's name (lego §4.1); no caption */}
      <View style={s.named}><Object3D name="title" height={48} style={s.paperObj} /><Text style={s.title}>{title}</Text></View>
      {subtitle && <Text style={s.sub}>{subtitle}</Text>}
    </View>}>
      <ScrollView onScroll={onScroll} scrollEventThrottle={48} contentContainerStyle={s.page} showsVerticalScrollIndicator
        onLayout={e => { layoutH.current = e.nativeEvent.layout.height; }}
        onContentSizeChange={(_, h) => { if (!view && layoutH.current && h <= layoutH.current + 24) setAtEnd(true); }}>
        {view ? (
          <View style={[s.doc, { height: docH }]}>
            {Platform.OS === 'web'
              ? React.createElement('iframe', { ref: frame, src: view, title, style: { border: 0, width: '100%', height: '100%', display: 'block' } })
              : <WebView source={{ uri: view }} onMessage={onMessage} originWhitelist={['*']} nestedScrollEnabled style={s.web} />}
          </View>
        ) : <View style={s.paper}>
          {Array.from({ length: 64 }, (_, i) => (
            <View key={i} style={[s.line, { width: `${i % 7 === 6 ? 46 : 70 + ((i * 37) % 30)}%`, marginTop: i % 7 === 0 ? 18 : 8 }]} />
          ))}
          <View style={s.field}><Text style={s.fieldLabel}>Buyer</Text></View>
          <View style={s.field}><Text style={s.fieldLabel}>Date</Text></View>
        </View>}
        {needsSign && (
          <View style={[s.padWrap, !atEnd && { opacity: 0.35 }]} pointerEvents={atEnd && !busy ? 'auto' : 'none'}>
            {reuse && seen && !path ? (
              <Pressable onPress={() => file(reuse, true)} style={s.reuse} accessibilityRole="button" accessibilityLabel="Use the same signature">
                <Svg width={160} height={58} viewBox={`0 0 ${seen.w} ${seen.h}`}><Path d={seen.d} stroke={theme.color.ink} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                <Label>Use the same signature</Label>
              </Pressable>
            ) : (
              <>
                <GestureDetector gesture={draw}>
                  <View style={s.pad} accessibilityLabel="Signature pad" accessibilityHint="Draw your signature"
                    onLayout={e => { const { width, height } = e.nativeEvent.layout; if (width > 0 && height > 0) setPad({ w: width, h: height }); }}>
                    {/* the ink in the pad's own points, so the line sits under the finger and the Worker gets what was drawn */}
                    <Svg width="100%" height="100%" viewBox={`0 0 ${pad.w} ${pad.h}`}><Path d={path} stroke={theme.color.ink} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    <View style={s.baseline} />
                  </View>
                </GestureDetector>
                <Button label="Sign" onPress={() => file(markup(path, pad.w, pad.h), false)} disabled={!path || busy} />
              </>
            )}
            <Text style={s.consent}>{failed ? 'Not sent. Try again.' : CONSENT_TEXT}</Text>
          </View>
        )}
        {signed && <View style={s.padWrap}><Button label="Done" onPress={onClose} /></View>}
      </ScrollView>
    </Sheet>
  );
}

// the document fills most of the sheet; the sheet still scrolls to the pad below it
const docH = Math.max(480, Math.round(Dimensions.get('window').height * 0.72));

const s = StyleSheet.create({
  head: { paddingHorizontal: 18, paddingBottom: theme.space.s, alignItems: 'center' },
  named: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, maxWidth: '100%' },
  paperObj: { marginLeft: -6 },
  title: { flexShrink: 1, fontFamily: theme.font.price, fontSize: 28, color: theme.color.ink, textAlign: 'center' },
  sub: { ...theme.type.sansBold, fontSize: 17, color: theme.color.warn, marginTop: 4, letterSpacing: 1, textAlign: 'center' },
  page: { paddingHorizontal: 18, paddingBottom: 40 },
  doc: { backgroundColor: theme.color.cloud, borderRadius: 6, overflow: 'hidden' },
  web: { flex: 1, backgroundColor: theme.color.cloud },
  paper: { backgroundColor: theme.color.cloud, borderRadius: 6, padding: 22 },
  line: { height: 7, borderRadius: 3, backgroundColor: theme.color.well },
  field: { marginTop: 26, borderBottomWidth: 1, borderColor: theme.color.ink, paddingBottom: 4 },
  fieldLabel: { ...theme.type.sans, fontSize: 17, color: theme.color.muted },
  padWrap: { marginTop: 16, gap: 10 },
  pad: { height: 150, backgroundColor: theme.color.cloud, borderRadius: 12, overflow: 'hidden' },
  baseline: { position: 'absolute', left: 20, right: 20, bottom: 30, height: 1, backgroundColor: theme.color.line },
  btn: { height: 52, borderRadius: 26, backgroundColor: theme.color.accent, alignItems: 'center', justifyContent: 'center' },
  btnOff: { opacity: 0.4 },
  btnText: { ...theme.type.sansBold, fontSize: 17, color: theme.color.cloud },
  reuse: { alignItems: 'center', gap: 6, paddingVertical: theme.space.s },
  reuseText: { ...theme.type.sansBold, fontSize: 17, color: theme.color.accent },
  consent: { ...theme.type.sans, fontSize: 17, color: theme.color.muted, textAlign: 'center' },
});
