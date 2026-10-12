/* A document on the glass. The one justified read: the law requires it. The
   page scrolls; reaching the end unlocks the pad (medium impact). The Desk's
   own render of each document (Buyers Guide, bill of sale, title assignment)
   drops into the page body; until it is wired the body is the page's shape. */
import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Sheet } from '../components/Sheet';
import { feel } from '../feel';
import { theme } from '../theme';

export type Signature = string;   // an SVG path

export function Paper({ title, subtitle, onClose, sign, reuse }: {
  title: string; subtitle?: string; onClose: () => void;
  sign?: (sig: Signature) => void;           // present: this document needs a signature
  reuse?: Signature;                         // a signature already given today: one tap reuses it, consent logged
}) {
  const [atEnd, setAtEnd] = useState(false);
  const [path, setPath] = useState('');
  const pts = useRef<string[]>([]);
  const layoutH = useRef(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (!atEnd && layoutMeasurement.height + contentOffset.y >= contentSize.height - 24) {
      setAtEnd(true);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  };
  const draw = Gesture.Pan().minDistance(0).runOnJS(true)
    .onBegin(e => { pts.current.push(`M${e.x.toFixed(1)} ${e.y.toFixed(1)}`); setPath(pts.current.join(' ')); })
    .onUpdate(e => { pts.current.push(`L${e.x.toFixed(1)} ${e.y.toFixed(1)}`); setPath(pts.current.join(' ')); });
  const file = (sig: Signature) => { feel.done(); sign?.(sig); };

  return (
    <Sheet detents={[0.5, 1]} initial={1} onClose={onClose} header={<View style={s.head}><Text style={s.title}>{title}</Text>{subtitle && <Text style={s.sub}>{subtitle}</Text>}</View>}>
      <ScrollView onScroll={onScroll} scrollEventThrottle={48} contentContainerStyle={s.page} showsVerticalScrollIndicator
        onLayout={e => { layoutH.current = e.nativeEvent.layout.height; }}
        onContentSizeChange={(_, h) => { if (layoutH.current && h <= layoutH.current + 24) setAtEnd(true); }}>
        <View style={s.paper}>
          {Array.from({ length: 64 }, (_, i) => (
            <View key={i} style={[s.line, { width: `${i % 7 === 6 ? 46 : 70 + ((i * 37) % 30)}%`, marginTop: i % 7 === 0 ? 18 : 8 }]} />
          ))}
          <View style={s.field}><Text style={s.fieldLabel}>Buyer</Text></View>
          <View style={s.field}><Text style={s.fieldLabel}>Date</Text></View>
        </View>
        {sign && (
          <View style={[s.padWrap, !atEnd && { opacity: 0.35 }]} pointerEvents={atEnd ? 'auto' : 'none'}>
            {reuse && !path ? (
              <Pressable onPress={() => file(reuse)} style={s.reuse} accessibilityRole="button">
                <Svg width={120} height={44} viewBox="0 0 300 110"><Path d={reuse} stroke={theme.color.ink} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                <Text style={s.reuseText}>Use the same signature</Text>
              </Pressable>
            ) : (
              <>
                <GestureDetector gesture={draw}>
                  <View style={s.pad} accessibilityLabel="Signature pad" accessibilityHint="Draw your signature">
                    <Svg width="100%" height="100%" viewBox="0 0 300 110" preserveAspectRatio="none"><Path d={path} stroke={theme.color.ink} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    <View style={s.baseline} />
                  </View>
                </GestureDetector>
                <Pressable disabled={!path} onPress={() => file(path)} style={[s.btn, !path && s.btnOff]} accessibilityRole="button"><Text style={s.btnText}>Sign</Text></Pressable>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </Sheet>
  );
}

const s = StyleSheet.create({
  head: { paddingHorizontal: 18, paddingBottom: 10 },
  title: { fontFamily: theme.font.sansBold, fontSize: 18, color: theme.color.ink },
  sub: { fontFamily: theme.font.sansBold, fontSize: 12, color: theme.color.warn, marginTop: 2, letterSpacing: 0.4 },
  page: { paddingHorizontal: 18, paddingBottom: 40 },
  paper: { backgroundColor: theme.color.cloud, borderRadius: 6, padding: 22, borderWidth: 1, borderColor: theme.color.line },
  line: { height: 7, borderRadius: 3, backgroundColor: theme.color.well },
  field: { marginTop: 26, borderBottomWidth: 1, borderColor: theme.color.ink, paddingBottom: 4 },
  fieldLabel: { fontFamily: theme.font.sans, fontSize: 11, color: theme.color.muted },
  padWrap: { marginTop: 16, gap: 10 },
  pad: { height: 140, backgroundColor: theme.color.cloud, borderRadius: 12, borderWidth: 1.5, borderColor: theme.color.line, overflow: 'hidden' },
  baseline: { position: 'absolute', left: 20, right: 20, bottom: 30, height: 1, backgroundColor: theme.color.line },
  btn: { height: 52, borderRadius: 26, backgroundColor: theme.color.accent, alignItems: 'center', justifyContent: 'center' },
  btnOff: { opacity: 0.4 },
  btnText: { fontFamily: theme.font.sansBold, fontSize: 17, color: theme.color.cloud },
  reuse: { height: 64, borderRadius: 16, backgroundColor: theme.color.cloud, borderWidth: 1.5, borderColor: theme.color.accent, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 12 },
  reuseText: { fontFamily: theme.font.sansBold, fontSize: 15, color: theme.color.accent },
});
