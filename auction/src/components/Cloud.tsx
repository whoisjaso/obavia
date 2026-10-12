/* The cloud material and the cloud press (docs/design/cloud-system.md §1, §2, §5).
   A sky surface is a mass lit from above: a feathered top highlight instead of an edge, a body that
   deepens from cloud to sky, light cloud layers drifting inside it, and a 3 % grain so it is never
   vector-flat. A pressable cloud sinks under the thumb on the UI thread and rises back on a spring;
   its shade shortens while it is down. Nothing here animates layout, blur or shadow radius: every
   moving part is a transform or an opacity over a static image. */
import React, { useEffect, useId, useRef } from 'react';
import { Image as RNImage, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withSpring, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { feel } from '../feel';
import { BREATH, EASE_OUT, cloud, drift, ms, spring } from '../motion';
import { theme } from '../theme';

const GRAIN = require('../../assets/clouds/grain.png');
const LIGHT = {
  far: require('../../assets/clouds/light-far.png'),
  mid: require('../../assets/clouds/light-mid.png'),
  near: require('../../assets/clouds/light-near.png'),
};
const DARK = {
  far: require('../../assets/clouds/dark-far.png'),   // masses in its top third: behind the ring and the mark
  mid: require('../../assets/clouds/dark-mid.png'),   // a band across its middle: behind the price
};
const LIGHT_RATIO = 1200 / 700, DARK_RATIO = 960 / 540;

/** The material's tokens (cloud-system §5). */
export const cloudInk = {
  top: 'rgba(255,255,255,0.85)',
  topClear: 'rgba(255,255,255,0)',
  body: ['#F4F7FE', '#E9EFFE'] as const,
  shade: '#1C2436',
  inkBody: ['#28324A', '#1C2436'] as const,   // the ink button: the same mass in negative
  inkTop: 'rgba(233,239,254,0.20)',
  inkTopClear: 'rgba(233,239,254,0)',
};

const cleanId = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '');

/** A drift clock: 0 -> 1 -> 0 on a sine, forever. Still under reduced motion. */
export function useDrift(period: number) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0.5);
  useEffect(() => {
    if (reduce) { t.value = 0.5; return; }
    t.value = 0;
    t.value = withRepeat(withTiming(1, { duration: period / 2, easing: BREATH }), -1, true);
  }, [reduce]);
  return t;
}

/** A soft ellipse of shade or light, drawn once as a radial gradient; only its wrapper ever moves. */
export function Glow({ color = cloudInk.shade, opacity, style }: { color?: string; opacity: number; style?: StyleProp<ViewStyle> }) {
  const id = cleanId(`g${useId()}`);
  return (
    <View pointerEvents="none" style={style}>
      <Svg width="100%" height="100%" viewBox="0 0 100 20" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset="0.55" stopColor={color} stopOpacity={opacity * 0.45} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={50} cy={10} rx={50} ry={10} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/** The grain: a 512 px noise tile, repeated, at 3 %. */
export function Grain({ opacity = 0.03 }: { opacity?: number }) {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}><RNImage source={GRAIN} resizeMode="repeat" style={{ opacity, width: "100%", height: "100%" }} /></View>;
}

/** One drifting layer: a static image at its own aspect, translated by its clock (transform only). */
function Layer({ source, t, px, opacity, ratio, style, dir = 1, mirror }: { source: number; t: SharedValue<number>; px: number; opacity: number; ratio: number; style?: StyleProp<ViewStyle>; dir?: 1 | -1; mirror?: boolean }) {
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: dir * (t.value - 0.5) * px }, { translateY: (0.5 - t.value) * px * 0.2 }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -16, right: -16, aspectRatio: ratio }, style, st]}>
      <Image source={source} style={{ width: '100%', height: '100%', opacity, transform: mirror ? [{ scaleX: -1 }] : undefined }} contentFit="fill" cachePolicy="memory" />
    </Animated.View>
  );
}

/** The sky behind a sheet's content: body, three light layers drifting at their depths, grain, and the
    feathered top light. Absolute, behind everything, never touched. `low`: a short sheet (the Bid sheet)
    keeps only the bank along its bottom, so no cloud ever sits behind the money. */
export function Sky({ radius = 0, layers = true, low = false }: { radius?: number; layers?: boolean; low?: boolean }) {
  const far = useDrift(drift.far.period), mid = useDrift(drift.mid.period), near = useDrift(drift.near.period);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderTopLeftRadius: radius, borderTopRightRadius: radius, overflow: 'hidden' }]}>
      <LinearGradient colors={cloudInk.body} style={StyleSheet.absoluteFill} />
      {layers && (
        <>
          {/* far rides high, mid crosses the lower middle, near banks along the bottom: three depths */}
          {!low && <Layer source={LIGHT.far} t={far} px={drift.far.px} opacity={0.38} ratio={LIGHT_RATIO} style={{ top: -12 }} />}
          {!low && <Layer source={LIGHT.mid} t={mid} px={drift.mid.px} opacity={0.26} ratio={LIGHT_RATIO} style={{ top: '46%' }} dir={-1} mirror />}
          <Layer source={LIGHT.near} t={near} px={drift.near.px} opacity={low ? 0.5 : 0.6} ratio={LIGHT_RATIO} style={{ bottom: low ? -40 : -6 }} />
        </>
      )}
      <Grain />
      <LinearGradient colors={[cloudInk.top, cloudInk.topClear]} style={s.topLight} />
    </View>
  );
}

/** The mist above a sheet's top edge: where the density falls to zero instead of a line. Sits outside
    the sheet's clip, behind its body. */
export function Feather() {
  return <Glow color={theme.color.sky} opacity={0.32} style={s.feather} />;
}

/** The ink body of a primary: the same mass in negative, lit from above. */
export function InkBody() {
  return (
    <>
      <LinearGradient pointerEvents="none" colors={cloudInk.inkBody} style={StyleSheet.absoluteFill} />
      <LinearGradient pointerEvents="none" colors={[cloudInk.inkTop, cloudInk.inkTopClear]} style={s.inkTop} />
    </>
  );
}

/** The underside of a pressable cloud: the soft shade (10 % ink, blurred, 6 pt below) and the contact
    shadow (6 %, tight), as one static drawing whose opacity and width give a little on press. */
export function Underside({ k, reduce }: { k: SharedValue<number>; reduce: boolean }) {
  const st = useAnimatedStyle(() => reduce ? {} : ({
    opacity: 1 - cloud.shadeDown * Math.max(0, k.value),
    transform: [{ translateY: -1.5 * k.value }, { scaleX: 1 - 0.05 * k.value }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[s.under, st]}>
      <Glow opacity={0.16} style={s.shade} />
      <Glow opacity={0.12} style={s.ao} />
    </Animated.View>
  );
}

/** The cloud press. Sinks on touch-down on the UI thread (2.5 pt, 0.985, the shade gives), rises on a
    0.65 spring when the press completes, rises without overshoot when it is dragged off. A disabled
    cloud does not sink. The puff on touch-down, the breath on a completed release; a cancel is silent.
    `swell`: 'pressed' breathes once when feel.done fires within 1.5 s of this press; 'any' breathes on
    every feel.done while mounted (the pass, whose completion comes from the dealer's scan). */
export function PressCloud({ onPress, disabled, shade, children, style, bodyStyle, hitSlop = 8, swell = 'pressed', accessibilityLabel, accessibilityRole = 'button', accessibilityState, accessibilityHint, sound = true, holdMs }: {
  onPress?: () => void; disabled?: boolean; shade?: boolean; children: React.ReactNode; holdMs?: number;
  style?: StyleProp<ViewStyle>; bodyStyle?: StyleProp<ViewStyle>; hitSlop?: number; swell?: 'pressed' | 'any' | 'none';
  accessibilityLabel?: string; accessibilityRole?: 'button' | 'imagebutton'; accessibilityState?: { disabled?: boolean; selected?: boolean }; accessibilityHint?: string;
  sound?: boolean;
}) {
  const reduce = useReducedMotion();
  const k = useSharedValue(0);          // 0 at rest, 1 sunk
  const sw = useSharedValue(1);         // the landed swell
  const pressedAt = useRef(0);
  const off = disabled || !onPress;
  const fire = () => { pressedAt.current = Date.now(); onPress?.(); };
  useEffect(() => feel.onDone(() => {
    if (reduce || swell === 'none') return;
    if (swell === 'pressed' && Date.now() - pressedAt.current > 1500) return;
    sw.value = withSequence(withTiming(cloud.swell, { duration: ms.swell / 2, easing: BREATH }), withTiming(1, { duration: ms.swell / 2, easing: BREATH }));
  }), [reduce, swell]);
  // a tap, or (holdMs) a hold that commits when it has been held that long; the cloud is down either way
  const base = holdMs ? Gesture.LongPress().minDuration(holdMs).maxDistance(24) : Gesture.Tap().maxDuration(60_000).maxDistance(24);
  const tap = base.hitSlop(hitSlop).enabled(!off)
    .onBegin(() => {
      k.value = withTiming(1, { duration: ms.sink, easing: EASE_OUT });
      if (sound) scheduleOnRN(feel.puff);
    })
    .onFinalize((_e, ok) => {
      k.value = withSpring(0, ok ? spring.rise : spring.cancel);
      if (ok && sound) scheduleOnRN(feel.rise);
    })
    .onStart(() => { if (holdMs) scheduleOnRN(fire); })
    .onEnd(() => { if (!holdMs) scheduleOnRN(fire); });
  const body = useAnimatedStyle(() => reduce
    ? { opacity: 1 - 0.18 * Math.max(0, k.value) }
    : { transform: [{ translateY: cloud.sinkY * k.value }, { scale: (1 - (1 - cloud.sinkScale) * k.value) * sw.value }] });
  return (
    <View style={style}>
      {shade && !off && <Underside k={k} reduce={reduce} />}
      <GestureDetector gesture={tap}>
        <Animated.View style={[bodyStyle, body]} accessible accessibilityRole={accessibilityRole} accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint}
          accessibilityState={{ disabled: !!off, ...accessibilityState }}
          accessibilityActions={off ? undefined : [{ name: 'activate' }]} onAccessibilityAction={e => { if (e.nativeEvent.actionName === 'activate') fire(); }}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/** The cloud scrim on the ink Lane: two ice layers drifting behind the ring and behind the price, at low
    opacity, never across the middle of the frame where the car's face is. One clock per lane, shared by
    every page, so a swipe never restarts the drift. */
export function LaneClouds({ width, height, far, mid }: { width: number; height: number; far: SharedValue<number>; mid: SharedValue<number> }) {
  const w = width + 40, h = w / DARK_RATIO;
  const top = useAnimatedStyle(() => ({ transform: [{ translateX: (far.value - 0.5) * drift.far.px }] }));
  const low = useAnimatedStyle(() => ({ transform: [{ translateX: (0.5 - mid.value) * drift.mid.px }, { translateY: (mid.value - 0.5) * 3 }] }));
  // the far layer's masses sit in its top third, so its box hangs from the top edge (ring and mark);
  // the mid layer's band sits at 45 to 60 % of its box, placed so the band runs behind the price
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[{ position: 'absolute', left: -20, top: -h * 0.04, width: w, height: h }, top]}>
        <Image source={DARK.far} style={{ width: '100%', height: '100%', opacity: 0.9 }} contentFit="fill" cachePolicy="memory" />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: -20, top: height * 0.82 - h * 0.53, width: w, height: h }, low]}>
        <Image source={DARK.mid} style={{ width: '100%', height: '100%', opacity: 0.85 }} contentFit="fill" cachePolicy="memory" />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  topLight: { position: 'absolute', left: 0, right: 0, top: 0, height: 18 },
  feather: { position: 'absolute', left: '-10%', right: '-10%', top: -22, height: 48 },
  inkTop: { position: 'absolute', left: 0, right: 0, top: 0, height: 12 },
  under: { position: 'absolute', left: 0, right: 0, bottom: -16, height: 28 },
  shade: { position: 'absolute', left: '6%', right: '6%', top: 2, height: 26 },
  ao: { position: 'absolute', left: '2%', right: '2%', top: 8, height: 8 },
});
