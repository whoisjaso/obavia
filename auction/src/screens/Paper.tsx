/* A document on the glass. The one justified read: the law requires it. The
   page scrolls; reaching the end unlocks the pad (medium impact). The Desk's
   own render of each document (Buyers Guide, bill of sale, title assignment)
   drops into the page body; until it is wired the body is the page's shape.
   With `url` and a Worker, the body is the real PDF through the Worker's
   viewer (/view?u=&token=): a WebView on the phone, an iframe on the web, and
   only the viewer's "end" unlocks the pad. */
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Sheet } from '../components/Sheet';
import { Button, Label } from '../components/Type';
import { feel } from '../feel';
import { AUCTION_URL, buyerToken } from '../store';
import { theme } from '../theme';

export type Signature = string;   // an SVG path

/* The Worker's viewer for a document: `u` is the document's path on the Worker
   (/documents/<lot>/<name>.pdf); the viewer appends the token itself. */
function viewerUrl(url: string): string {
  let path = url;
  try { path = new URL(url).pathname; } catch {}
  return `${AUCTION_URL}/view?u=${encodeURIComponent(path)}&token=${encodeURIComponent(buyerToken() ?? '')}`;
}

export function Paper({ title, subtitle, onClose, sign, reuse, url }: {
  title: string; subtitle?: string; onClose: () => void;
  url?: string;                              // the document's absolute URL on the Worker, without token
  sign?: (sig: Signature) => void;           // present: this document needs a signature
  reuse?: Signature;                         // a signature already given today: one tap reuses it, consent logged
}) {
  const [atEnd, setAtEnd] = useState(false);
  const [path, setPath] = useState('');
  const pts = useRef<string[]>([]);
  const layoutH = useRef(0);
  const view = url && AUCTION_URL ? viewerUrl(url) : null;   // the real document; else the page's shape
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
  const file = (sig: Signature) => { feel.done(); sign?.(sig); };

  return (
    <Sheet detents={[0.5, 1]} initial={1} onClose={onClose} header={<View style={s.head}><Text style={s.title}>{title}</Text>{subtitle && <Text style={s.sub}>{subtitle}</Text>}</View>}>
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
        {sign && (
          <View style={[s.padWrap, !atEnd && { opacity: 0.35 }]} pointerEvents={atEnd ? 'auto' : 'none'}>
            {reuse && !path ? (
              <Pressable onPress={() => file(reuse)} style={s.reuse} accessibilityRole="button" accessibilityLabel="Use the same signature">
                <Svg width={160} height={58} viewBox="0 0 300 110"><Path d={reuse} stroke={theme.color.ink} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                <Label>Use the same signature</Label>
              </Pressable>
            ) : (
              <>
                <GestureDetector gesture={draw}>
                  <View style={s.pad} accessibilityLabel="Signature pad" accessibilityHint="Draw your signature">
                    <Svg width="100%" height="100%" viewBox="0 0 300 110" preserveAspectRatio="none"><Path d={path} stroke={theme.color.ink} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    <View style={s.baseline} />
                  </View>
                </GestureDetector>
                <Button label="Sign" onPress={() => file(path)} disabled={!path} />
              </>
            )}
          </View>
        )}
      </ScrollView>
    </Sheet>
  );
}

// the document fills most of the sheet; the sheet still scrolls to the pad below it
const docH = Math.max(480, Math.round(Dimensions.get('window').height * 0.72));

const s = StyleSheet.create({
  head: { paddingHorizontal: 18, paddingBottom: theme.space.s, alignItems: 'center' },
  title: { fontFamily: theme.font.price, fontSize: 28, color: theme.color.ink, textAlign: 'center' },
  sub: { ...theme.type.sans, fontSize: 11, color: theme.color.warn, marginTop: 4, letterSpacing: 1.6, textAlign: 'center' },
  page: { paddingHorizontal: 18, paddingBottom: 40 },
  doc: { backgroundColor: theme.color.cloud, borderRadius: 6, overflow: 'hidden' },
  web: { flex: 1, backgroundColor: theme.color.cloud },
  paper: { backgroundColor: theme.color.cloud, borderRadius: 6, padding: 22 },
  line: { height: 7, borderRadius: 3, backgroundColor: theme.color.well },
  field: { marginTop: 26, borderBottomWidth: 1, borderColor: theme.color.ink, paddingBottom: 4 },
  fieldLabel: { ...theme.type.sans, fontSize: 11, color: theme.color.muted },
  padWrap: { marginTop: 16, gap: 10 },
  pad: { height: 150, backgroundColor: theme.color.cloud, borderRadius: 12, overflow: 'hidden' },
  baseline: { position: 'absolute', left: 20, right: 20, bottom: 30, height: 1, backgroundColor: theme.color.line },
  btn: { height: 52, borderRadius: 26, backgroundColor: theme.color.accent, alignItems: 'center', justifyContent: 'center' },
  btnOff: { opacity: 0.4 },
  btnText: { ...theme.type.sansBold, fontSize: 17, color: theme.color.cloud },
  reuse: { alignItems: 'center', gap: 6, paddingVertical: theme.space.s },
  reuseText: { ...theme.type.sansBold, fontSize: 15, color: theme.color.accent },
});
