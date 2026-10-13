/* The clause page (W4-B; decisions §9 D13). Shown once, before the first-bid terms page, when GET /terms carries a
   clause this phone has not agreed to; a bid's 409 clause_required brings it back. The words are the Worker's, in the
   platform face at 17 pt (the one justified read, like a document: DOCTRINE §4 rule 9); nothing of ours around them.
   Reaching the end unlocks the one cloud, Agree (a medium impact as the lock opens, the body's "you got there");
   "Not now" sits faint top left, last in the reading order. It arrives as the terms page does: a fade on the sky. */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '../components/Cloud';
import { CloudButton } from '../components/CloudButton';
import { Sky } from '../components/Sky';
import type { Clause } from '../clause';
import { feel } from '../feel';
import { EASE_OUT, ms } from '../motion';
import { theme } from '../theme';

const END_SLACK = 24;   // pt short of the very end still counts as the end: a thumb never has to hit the last pixel

export function ClausePage({ clause, onAgree, onCancel }: { clause: Clause; onAgree: (version: string) => void | Promise<boolean>; onCancel: () => void }) {
  const insets = useSafeAreaInsets();
  const [atEnd, setAtEnd] = useState(!clause.requiresScrollToEnd);
  const [busy, setBusy] = useState(false);
  const layoutH = useRef(0);
  const reached = useRef(atEnd);
  const k = useSharedValue(0);
  useEffect(() => { feel.settle(); k.value = withTiming(1, { duration: ms.sheetFade, easing: EASE_OUT }); }, []);
  const st = useAnimatedStyle(() => ({ opacity: k.value }));
  const reach = () => {
    if (reached.current) return;
    reached.current = true; setAtEnd(true); feel.holdDone();   // the lock opens: a medium impact, no sound, no sentence
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - END_SLACK) reach();
  };
  const agree = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await onAgree(clause.version);
    if (ok === false) setBusy(false);   // the Worker did not take it: the cloud is still there, nothing said
  };
  return (
    <Animated.View style={[StyleSheet.absoluteFill, st]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.sky, paddingTop: insets.top, paddingBottom: insets.bottom + theme.space.m }]}>
        <Sky />
        <Feather />
        <View style={s.page}>
          <ScrollView onScroll={onScroll} scrollEventThrottle={48} contentContainerStyle={s.body} showsVerticalScrollIndicator
            onLayout={e => { layoutH.current = e.nativeEvent.layout.height; }}
            onContentSizeChange={(_, h) => { if (layoutH.current && h <= layoutH.current + END_SLACK) reach(); }}>
            <Text style={s.text}>{clause.text}</Text>
          </ScrollView>
          <View style={s.foot}>
            <CloudButton label="Agree" onPress={atEnd && !busy ? agree : undefined} disabled={!atEnd} accessibilityLabel="Agree" accessibilityHint={atEnd ? undefined : 'Read to the end first'} />
          </View>
        </View>
        <Pressable onPress={onCancel} hitSlop={12} style={[s.later, { top: insets.top + theme.space.s }]} accessibilityRole="button" accessibilityLabel="Not now">
          <Text style={s.laterText}>Not now</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: theme.space.m, paddingTop: theme.space.xl },
  body: { paddingTop: theme.space.s, paddingBottom: theme.space.l },
  // the document's own face at arm's length: 17 pt, inkSoft on the sky (8.6:1), 25 pt leading; no Bodoni, no money here
  text: { ...theme.type.sans, fontSize: 17, lineHeight: 25, color: theme.color.inkSoft },
  foot: { paddingTop: theme.space.s },
  later: { position: 'absolute', left: theme.space.m, zIndex: 2 },
  laterText: { ...theme.type.sans, fontSize: 17, color: theme.color.faint },
});
