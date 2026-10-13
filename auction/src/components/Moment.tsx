/* A moment (DOCTRINE §5: "each is a still and a short frame sequence for its moment"): one of the car objects
   doing its one thing, rendered in Cycles (tools/scene-3d, assets/scene-3d/<name>) and shipped as a 24-frame
   sheet through scripts/scene3d.mjs. The hammer falls into its cloud on Won; the clock's arc sweeps to its mark
   beside the pay-by on Pay; the coin comes back and settles face up beside the $250 as the deposit captures.
   Played the way the cloud button plays its sheet: one image clipped to a cell-sized window and moved to the
   frame's rect by a shared value on the UI thread, one transform per frame, no JS, no decode. The frames run
   0 to `contact` and `contact` to `rest` at the sheet's fps (400 ms in all); `rest` is the still and holds.
   The contact is the frame's own callback: whatever the moment's body proof is (the hammer's chime and haptic)
   fires when the object lands, not on a timer beside it. Reduced motion: nothing, then the still at the contact,
   with the callback (cloud-system §4: reduced motion is about motion, not silence). Silent to a screen reader:
   the number or the verb beside it already says it. No render shipped: the box keeps its size and the callback
   still fires. */
import React, { useCallback, useMemo, useRef } from 'react';
import { PixelRatio, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { HIDDEN, UNDER, clock, frameOf, offsets, sheetFor } from './hammer';
import type { Moment3D } from './scene3d';

/** The longest a moment waits for its sheet to be on the glass before it plays anyway (never a callback over an
    empty box for longer than this). */
export const MOMENT_WAIT = 400;

/** The frame clock's rest value: a moment that has not begun shows its first frame (the hammer raised), or
    nothing when the object is not yet on the glass at all (`from: 'hidden'`, the coin before the deposit exists:
    lego §4.7, absence); reduced motion and the absence of a render show nothing until the contact. */
export const startFrame = (m: Moment3D | null, reduce: boolean, from: 'first' | 'hidden' = 'first') => (m && !reduce && from === 'first' ? 0 : HIDDEN);

/** Play once: the frames to the contact, `onContact` on that frame, then on to the still. Reduced motion or no
    render: the still (or nothing) and the contact at once. */
export function play(m: Moment3D | null, f: SharedValue<number>, reduce: boolean, onContact?: () => void) {
  if (!m || reduce) { f.value = m ? m.rest : HIDDEN; onContact?.(); return; }
  const c = clock(m);
  f.value = 0;
  f.value = withSequence(
    withTiming(m.contact, { duration: c.contactMs, easing: Easing.linear, reduceMotion: ReduceMotion.Never }, done => { if (done && onContact) scheduleOnRN(onContact); }),
    withTiming(m.rest + UNDER, { duration: c.puffMs, easing: Easing.linear, reduceMotion: ReduceMotion.Never }),
  );
}

/** A moment's clock and its readiness in one place: `f` for the player, `onReady` for the player's sheet, and
    `begin`, which plays once the sheet is on the glass (at most MOMENT_WAIT later) and returns its cleanup. */
export function useMoment(m: Moment3D | null, reduce: boolean, from: 'first' | 'hidden' = 'first') {
  const f = useSharedValue(startFrame(m, reduce, from));
  const ready = useRef(!m), waiting = useRef<null | (() => void)>(null);
  const onReady = useCallback(() => { ready.current = true; const go = waiting.current; waiting.current = null; go?.(); }, []);
  const begin = useCallback((onContact?: () => void) => {
    let begun = false;
    const go = () => { if (begun) return; begun = true; play(m, f, reduce, onContact); };
    if (ready.current || !m || reduce) { go(); return () => {}; }
    waiting.current = go;
    const cap = setTimeout(go, MOMENT_WAIT);
    return () => { clearTimeout(cap); if (waiting.current === go) waiting.current = null; };
  }, [m, reduce]);
  return { f, onReady, begin };
}

export function Moment({ m, f, height, onReady, style, testID }: {
  m: Moment3D | null;
  f: SharedValue<number>;
  /** the cell's height in points; the cell is square */
  height: number;
  /** the sheet is on the glass (or failed): the moment may begin */
  onReady?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const pr = PixelRatio.get();
  const sh = m ? sheetFor(m, pr) : null;
  const geo = useMemo(() => (sh ? offsets(sh, height, pr) : null), [sh, height, pr]);
  const rest = m?.rest ?? 0;
  const xs = geo?.xs ?? [0], ys = geo?.ys ?? [0];
  const st = useAnimatedStyle(() => {
    const i = frameOf(f.value, rest);
    if (i < 0) return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }] };
    return { opacity: 1, transform: [{ translateX: xs[Math.min(i, xs.length - 1)] }, { translateY: ys[Math.min(i, ys.length - 1)] }] };
  });
  return (
    <View style={[{ width: height, height, overflow: 'hidden' }, style]} pointerEvents="none"
      aria-hidden importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {sh && geo && (
        <Animated.View testID={testID} style={[{ width: geo.sheetW, height: geo.sheetH }, st]}>
          <Image source={sh.src} style={StyleSheet.absoluteFill} contentFit="fill" cachePolicy="memory" transition={0} onLoad={onReady} onError={onReady} />
        </Animated.View>
      )}
    </View>
  );
}
