/* The 3D cloud button (cloud-system §2, §8; the owner: "genuinely make the 3d graphics from scratch and the 3d
   buttons as well, and animations after clicking them, and sfx").

   The body is a rendered cloud. Three tiers, chosen once per set and never mixed:
     3d     the Blender contract (assets/cloud-3d via scripts/cloud3d.mjs): a 24-frame sprite sheet, 0 to 5 the
            press, 6 to 23 the re-inflation, played on the UI thread by a shared value. One image, clipped to a
            frame-sized window and translated by the frame's rect: one transform per frame, no JS, no decode.
     photo  the photographic sprites (assets/cloud-button): rest and pressed, crossfaded by the same frame value.
     ink    the squared ink bar (Cloud.tsx InkBody), if neither set is bundled or an image fails to load.

   One press, every channel in the same frame:
     down     frames 0 to 5 in 100 ms, the sink (+2.5 pt, 0.985), the shadow shortening, cloud-touch and the
              light impact.
     hold     past 400 ms it stays down and breathes (1 %, 1.2 s sine) over the drift loop at low gain.
     release  frames 6 to 23 on the 0.65 spring with the body; cloud-rise; seven wisps (peak 0.45) shed from its top edge
              and drift up and out over 600 ms; the label dips 1 pt and comes back; the shadow lengthens as the
              cloud lifts off it, then settles.
     cancel   back to rest at damping 1.0, silent, nothing shed.
     landed   the one swell (1, 1.03, 1 over 420 ms) and a soft air ring behind it (1 to 1.4, peak 0.22 at
              120 ms), with cloud-landed and the heavy impact.
   Disabled never sinks. Reduced motion: no transform, no wisps, no ring, no breath; the press is an opacity
   and the frames jump rest, pressed, rest; sounds and haptics stay. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PixelRatio, Platform, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing, ReduceMotion, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { feel } from '../feel';
import { BREATH, EASE_OUT, cloud, ms, press3d, spring } from '../motion';
import { theme } from '../theme';
import { InkBody } from './Cloud';
import { BUTTON_3D, type Rect } from './cloud3d';
import { useReduceMotion } from './Sky';

type Tone = 'light' | 'dark';
type SetKey = '320' | '440';
type Tier = '3d' | 'photo' | 'ink';

/** One width's sprites, in the sprite's own pixels (@2x). */
type Sprites = {
  tier: Tier; frameW: number; frameH: number; safe: Rect; shadowW: number; shadowH: number;
  rest?: number; pressed?: number; shadowRest?: number; shadowPressed?: number;
  sheet?: number; sheetW?: number; sheetH?: number; frames?: Rect[];
};

/* The photographic set (assets/cloud-button/README.md): 112 css px tall at every width, the shadow sprite 40 css
   px larger on every side, the label's safe zone x 12 to 88 %, y 40 to 85 %. The dark set has one state. */
const photo = (w: number, rest: number, pressed: number, shadowRest: number, shadowPressed: number): Sprites => ({
  tier: 'photo', frameW: w * 2, frameH: 224, shadowW: (w + 80) * 2, shadowH: 384,
  safe: { x: w * 2 * 0.12, y: 224 * 0.4, w: w * 2 * 0.76, h: 224 * 0.45 }, rest, pressed, shadowRest, shadowPressed,
});
const PHOTO: Record<Tone, Record<SetKey, Sprites>> = {
  light: {
    '320': photo(320, require('../../assets/cloud-button/320/rest-2x.png'), require('../../assets/cloud-button/320/pressed-2x.png'), require('../../assets/cloud-button/320/shadow-rest-2x.png'), require('../../assets/cloud-button/320/shadow-pressed-2x.png')),
    '440': photo(440, require('../../assets/cloud-button/440/rest-2x.png'), require('../../assets/cloud-button/440/pressed-2x.png'), require('../../assets/cloud-button/440/shadow-rest-2x.png'), require('../../assets/cloud-button/440/shadow-pressed-2x.png')),
  },
  dark: {
    '320': photo(320, require('../../assets/cloud-button/320/dark-2x.png'), require('../../assets/cloud-button/320/dark-2x.png'), require('../../assets/cloud-button/320/dark-shadow-2x.png'), require('../../assets/cloud-button/320/dark-shadow-2x.png')),
    '440': photo(440, require('../../assets/cloud-button/440/dark-2x.png'), require('../../assets/cloud-button/440/dark-2x.png'), require('../../assets/cloud-button/440/dark-shadow-2x.png'), require('../../assets/cloud-button/440/dark-shadow-2x.png')),
  },
};
/* The web preview's measurement switch: ?player=stack plays the 24 stacked frames instead of the sheet. Never
   set in a native build (there is no location there). */
const PLAYER: 'sheet' | 'stack' = Platform.OS === 'web' && typeof location !== 'undefined' && /[?&]player=stack/.test(location.search) ? 'stack' : 'sheet';
const WISP = require('../../assets/cloud-button/wisp.png');
const RING = require('../../assets/cloud-button/ring.png');

function sprites(tone: Tone, set: SetKey): Sprites {
  const s = BUTTON_3D[tone][set];
  if (s) {
    const frame0 = s.frames[0];
    return {
      tier: '3d', frameW: s.frameW, frameH: s.frameH, safe: s.safe,
      // a missing shadow pair borrows the photographic one, scaled to this frame
      shadowW: s.shadowW ?? s.frameW * (PHOTO[tone][set].shadowW / PHOTO[tone][set].frameW),
      shadowH: s.shadowH ?? s.frameH * (PHOTO[tone][set].shadowH / PHOTO[tone][set].frameH),
      shadowRest: s.shadowRest ?? PHOTO[tone][set].shadowRest, shadowPressed: s.shadowPressed ?? PHOTO[tone][set].shadowPressed,
      sheet: s.sheet, sheetW: s.sheetW, sheetH: s.sheetH, frames: s.frames.length ? s.frames : [frame0],
    };
  }
  return PHOTO[tone][set];
}

/** The set whose drawn width is nearest: the 320 cloud for a narrow column, the 440 for the phone's full one. */
const setFor = (w: number): SetKey => (w <= 330 ? '320' : '440');

/** The ink fallback's height: the house's squared bar. */
const INK_H = 54;

/* The seven wisps: where on the top edge each leaves from (x share of the width), how big, how far it goes. The
   tallest lobes are central, so the central wisps start higher. Fixed, not random: the same press looks the
   same every time. */
const WISPS = [
  { x: 0.16, size: 22, up: 13, out: -10 },
  { x: 0.28, size: 28, up: 17, out: -7 },
  { x: 0.40, size: 20, up: 20, out: -3 },
  { x: 0.51, size: 32, up: 18, out: 1 },
  { x: 0.62, size: 24, up: 20, out: 4 },
  { x: 0.74, size: 28, up: 15, out: 8 },
  { x: 0.85, size: 20, up: 12, out: 11 },
].slice(0, press3d.wisps);

const frameOf = (v: number) => { 'worklet'; return Math.max(0, Math.min(press3d.frames - 1, v >= press3d.frames - 1.5 ? press3d.frames - 1 : Math.round(v))); };
/** How pressed a frame looks, 0 to 1: up over the press frames, down over the release frames. */
const pressedness = (v: number) => {
  'worklet';
  const last = press3d.frames - 1;
  return v <= press3d.downLast ? v / press3d.downLast : Math.max(0, (last - v) / (last - press3d.upFirst));
};

export type CloudButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  tone?: Tone;
  /** a hold commits after this many ms (the Bid over 2x); a quiet ink rule fills under the label meanwhile */
  holdMs?: number;
  /** replaces the label (the Bid's ring in flight, its tick on the ack) */
  content?: React.ReactNode;
  /** changes to a new truthy value when the action lands: the swell, the ring, the sound */
  landedKey?: number;
  /** what the landed moment plays: everything, the air only (the caller's moment already carries the heavy
      impact, as the bid's ack does), or nothing */
  landedFeel?: 'full' | 'sound' | 'none';
  /** breathe once when feel.done fires within 1.5 s of a press (done plays the air itself) */
  swellOnDone?: boolean;
  /** the frame player: one translated sheet, or 24 stacked frames; measured, the sheet won (see the report) */
  player?: 'sheet' | 'stack';
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

export function CloudButton({
  label, onPress, disabled, tone = 'light', holdMs, content, landedKey, landedFeel = 'full', swellOnDone = true,
  player = PLAYER, accessibilityLabel, accessibilityHint, style,
}: CloudButtonProps) {
  const reduce = useReduceMotion();
  const { width: screenW } = useWindowDimensions();
  const [w, setW] = useState(Math.max(200, screenW - theme.space.m * 2));
  const [broken, setBroken] = useState(false);   // an image failed: the ink bar
  const sp = useMemo(() => sprites(tone, setFor(w)), [tone, w]);
  const tier: Tier = broken ? 'ink' : sp.tier;
  const sc = w / sp.frameW;                      // pt per sprite pixel
  const h = tier === 'ink' ? INK_H : Math.round(sp.frameH * sc);
  const off = !!disabled || !onPress;   // no gesture; only `disabled` also fades it (in flight, the cloud stays whole)

  const f = useSharedValue(0);       // the frame, 0 to 23
  const k = useSharedValue(0);       // the sink, 0 at rest, 1 down
  const sw = useSharedValue(1);      // the landed swell
  const br = useSharedValue(0);      // the hold's breath
  const hb = useSharedValue(0);      // the hold timer
  const holding = useSharedValue(0);
  const sl = useSharedValue(0);      // the shadow lengthening after release
  const ld = useSharedValue(0);      // the label's dip
  const wp = useSharedValue(0);      // the wisps, 0 to 1
  const ro = useSharedValue(0);      // the ring's opacity
  const rs = useSharedValue(1);      // the ring's scale
  const fill = useSharedValue(0);    // the hold-to-commit fill
  const pressedAt = useRef(0);

  const fire = () => { pressedAt.current = Date.now(); onPress?.(); };
  const holdOn = () => feel.drift(press3d.holdGain);
  const holdOff = () => feel.drift(0);
  useEffect(() => () => { if (holding.value) feel.drift(0); }, []);

  const land = (mode: 'full' | 'sound' | 'none') => {
    if (mode !== 'none') feel.swell(mode === 'full');
    if (reduce) return;
    sw.value = withSequence(withTiming(cloud.swell, { duration: ms.swell / 2, easing: BREATH }), withTiming(1, { duration: ms.swell / 2, easing: BREATH }));
    rs.value = 1; rs.value = withTiming(press3d.ringScale, { duration: press3d.ringMs, easing: EASE_OUT });
    ro.value = withSequence(withTiming(press3d.ringPeak, { duration: press3d.ringPeakAt, easing: EASE_OUT }), withTiming(0, { duration: press3d.ringMs - press3d.ringPeakAt, easing: BREATH }));
  };
  const lastLanded = useRef(landedKey);
  useEffect(() => {
    if (!landedKey || landedKey === lastLanded.current) return;
    lastLanded.current = landedKey; land(landedFeel);
  }, [landedKey]);
  useEffect(() => feel.onDone(() => {
    if (!swellOnDone || Date.now() - pressedAt.current > 1500) return;
    land('none');
  }), [swellOnDone, reduce]);

  // ---- the gesture: everything below runs on the UI thread; the RN runtime hears once per phase
  const down = () => {
    'worklet';
    if (reduce) { f.value = press3d.downLast; k.value = withTiming(1, { duration: ms.sink, easing: EASE_OUT }); }
    else {
      f.value = 0;
      f.value = withTiming(press3d.downLast, { duration: ms.sink, easing: Easing.linear });   // the frames are the curve
      k.value = withTiming(1, { duration: ms.sink, easing: EASE_OUT });
    }
    scheduleOnRN(feel.press);
  };
  const up = (ok: boolean) => {
    'worklet';
    if (reduce) { f.value = 0; k.value = withTiming(0, { duration: ms.press, easing: EASE_OUT }); }
    else {
      const sp2 = ok ? spring.rise : spring.cancel;
      f.value = press3d.upFirst; f.value = withSpring(press3d.frames - 1, sp2);
      k.value = withSpring(0, sp2);
      if (ok) {
        wp.value = 0; wp.value = withTiming(1, { duration: press3d.wispMs, easing: Easing.linear });   // time; the travel eases itself
        ld.value = withSequence(withTiming(1, { duration: 80, easing: EASE_OUT }), withSpring(0, spring.rise));
        sl.value = withSequence(withTiming(1, { duration: 120, easing: EASE_OUT }), withTiming(0, { duration: 360, easing: BREATH }));
      }
    }
    if (ok) scheduleOnRN(feel.rise);
  };
  const startHold = () => {
    'worklet';
    holding.value = 0;
    hb.value = 0;
    // a clock, not a motion: Reanimated would finish it at once under reduced motion, and every tap would hold
    hb.value = withDelay(press3d.holdAfter, withTiming(1, { duration: 1, reduceMotion: ReduceMotion.Never }, done => {
      if (!done) return;
      holding.value = 1; scheduleOnRN(holdOn);
      if (!reduce) br.value = withRepeat(withTiming(1, { duration: press3d.breath / 2, easing: BREATH }), -1, true);
    }), ReduceMotion.Never);
  };
  const endHold = () => {
    'worklet';
    cancelAnimation(hb);
    if (holding.value) { holding.value = 0; scheduleOnRN(holdOff); }
    cancelAnimation(br); br.value = withTiming(0, { duration: ms.press, easing: EASE_OUT });
  };
  const commitHold = () => { feel.holdDone(); fire(); };
  const g = holdMs
    // over 2x: the fill runs from touch-down and commits when full; letting go drains it fast
    ? Gesture.LongPress().minDuration(holdMs + 50).maxDistance(24)
      .onBegin(() => { down(); fill.value = withTiming(1, { duration: holdMs, easing: Easing.linear, reduceMotion: ReduceMotion.Never }, d => { if (d) scheduleOnRN(commitHold); }); })
      .onFinalize((_e, ok) => { up(ok); cancelAnimation(fill); fill.value = withTiming(0, { duration: ms.press, easing: EASE_OUT }); })
    // feedback on press-in, commit on release
    : Gesture.Tap().maxDuration(60_000).maxDistance(24)
      .onBegin(() => { down(); startHold(); })
      .onFinalize((_e, ok) => { endHold(); up(ok); })
      .onEnd(() => { scheduleOnRN(fire); });

  // ---- styles
  const body = useAnimatedStyle(() => reduce
    ? { opacity: 1 - 0.18 * k.value }
    : { transform: [{ translateY: cloud.sinkY * k.value }, { scale: (1 - (1 - cloud.sinkScale) * k.value) * (1 - press3d.breathAmp * br.value) * sw.value }] });
  const labelSt = useAnimatedStyle(() => ({ transform: [{ translateY: reduce ? 0 : ld.value }] }));
  const shadowSt = useAnimatedStyle(() => reduce ? {} : ({ transform: [{ scaleX: 1 - 0.06 * k.value + press3d.shadowLong * sl.value }] }));
  const shadowDown = useAnimatedStyle(() => ({ opacity: tier === '3d' ? pressedness(f.value) : k.value }));
  const pressedSt = useAnimatedStyle(() => ({ opacity: pressedness(f.value) }));
  const ringSt = useAnimatedStyle(() => ({ opacity: ro.value, transform: [{ scaleX: rs.value }, { scaleY: rs.value }] }));
  const fillSt = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));

  const safe = tier === 'ink' ? { left: 0, top: 0, width: w, height: h } : { left: sp.safe.x * sc, top: sp.safe.y * sc, width: sp.safe.w * sc, height: sp.safe.h * sc };
  const shW = sp.shadowW * sc, shH = sp.shadowH * sc;
  const ink = tier === 'ink' ? theme.color.cloud : theme.color.ink;
  const failed = () => setBroken(true);

  return (
    <View style={[{ alignSelf: 'stretch', height: h }, style]} onLayout={e => { const n = Math.round(e.nativeEvent.layout.width); if (n > 0 && n !== w) setW(n); }}>
      {/* behind: the air ring, then the contact shadow, which stays on the page while the cloud sinks into it */}
      {tier !== 'ink' && !reduce && (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: w * 0.04, top: h * 0.1, width: w * 0.92, height: h * 0.9 }, ringSt]}>
          <Image source={RING} style={StyleSheet.absoluteFill} contentFit="fill" />
        </Animated.View>
      )}
      {tier !== 'ink' && !disabled && sp.shadowRest != null && (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: (w - shW) / 2, top: (h - shH) / 2, width: shW, height: shH }, shadowSt]}>
          <Image source={sp.shadowRest} style={StyleSheet.absoluteFill} contentFit="fill" onError={failed} />
          {sp.shadowPressed != null && <Animated.View style={[StyleSheet.absoluteFill, shadowDown]}><Image source={sp.shadowPressed} style={StyleSheet.absoluteFill} contentFit="fill" /></Animated.View>}
        </Animated.View>
      )}
      <GestureDetector gesture={g.enabled(!off)}>
        <Animated.View style={[{ width: w, height: h }, tier === 'ink' && s.ink, disabled && s.off, body]}
          accessible accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityHint={accessibilityHint}
          accessibilityState={{ disabled: off }} accessibilityActions={off ? undefined : [{ name: 'activate' }]}
          onAccessibilityAction={e => { if (e.nativeEvent.actionName === 'activate') fire(); }}>
          {tier === 'ink' && <InkBody />}
          {tier === 'photo' && (
            <>
              <Image source={sp.rest} style={StyleSheet.absoluteFill} contentFit="fill" onError={failed} />
              {sp.pressed !== sp.rest && <Animated.View style={[StyleSheet.absoluteFill, pressedSt]}><Image source={sp.pressed} style={StyleSheet.absoluteFill} contentFit="fill" /></Animated.View>}
            </>
          )}
          {tier === '3d' && (player === 'stack'
            ? <Stack sp={sp} sc={sc} f={f} onError={failed} />
            : <SheetPlayer sp={sp} sc={sc} f={f} onError={failed} />)}
          <Animated.View pointerEvents="none" style={[s.safe, safe, labelSt]}>
            {content ?? <Text style={[s.label, { color: ink }]} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>}
            {holdMs != null && <Animated.View style={[s.fill, { backgroundColor: ink }, fillSt]} />}
          </Animated.View>
        </Animated.View>
      </GestureDetector>
      {/* in front: the wisps the release sheds from the top edge */}
      {tier !== 'ink' && !reduce && WISPS.map((p, i) => <Wisp key={i} p={p} w={w} h={h} t={wp} />)}
    </View>
  );
}

/** The sheet player: one image of all 24 frames inside a frame-sized window, moved to the frame's rect. The
    offsets snap to device pixels, so a neighbour frame never bleeds into the edge. */
function SheetPlayer({ sp, sc, f, onError }: { sp: Sprites; sc: number; f: SharedValue<number>; onError: () => void }) {
  const pr = PixelRatio.get();
  const xs = (sp.frames ?? []).map(r => Math.round(-r.x * sc * pr) / pr);
  const ys = (sp.frames ?? []).map(r => Math.round(-r.y * sc * pr) / pr);
  const st = useAnimatedStyle(() => {
    const i = Math.min(frameOf(f.value), xs.length - 1);
    return { transform: [{ translateX: xs[i] }, { translateY: ys[i] }] };
  });
  // the contract's frames touch: at a scale that is not a whole number the filter samples the opaque base of the
  // frame above into this one's top row. A frame's top is empty sky, so the window drops its top 2 device px.
  const inset = 2 / pr;
  return (
    <View style={[StyleSheet.absoluteFill, { top: inset, overflow: 'hidden' }]}>
      <Animated.View testID="cloud-sheet" style={[{ marginTop: -inset, width: (sp.sheetW ?? 0) * sc, height: (sp.sheetH ?? 0) * sc }, st]}>
        <Image source={sp.sheet} style={StyleSheet.absoluteFill} contentFit="fill" cachePolicy="memory" onError={onError} />
      </Animated.View>
    </View>
  );
}

/** The stack player, kept for the measurement: 24 windows on the same sheet, one visible at a time. */
function Stack({ sp, sc, f, onError }: { sp: Sprites; sc: number; f: SharedValue<number>; onError: () => void }) {
  return <>{(sp.frames ?? []).map((r, i) => <StackFrame key={i} i={i} r={r} sp={sp} sc={sc} f={f} onError={onError} />)}</>;
}
function StackFrame({ i, r, sp, sc, f, onError }: { i: number; r: Rect; sp: Sprites; sc: number; f: SharedValue<number>; onError: () => void }) {
  const st = useAnimatedStyle(() => ({ opacity: frameOf(f.value) === i ? 1 : 0 }));
  return (
    <Animated.View testID={`cloud-frame-${i}`} style={[StyleSheet.absoluteFill, { overflow: 'hidden' }, st]}>
      <View style={{ position: 'absolute', left: -r.x * sc, top: -r.y * sc, width: (sp.sheetW ?? 0) * sc, height: (sp.sheetH ?? 0) * sc }}>
        <Image source={sp.sheet} style={StyleSheet.absoluteFill} contentFit="fill" cachePolicy="memory" onError={onError} />
      </View>
    </Animated.View>
  );
}

/** One wisp: leaves the top edge, drifts up and out, swells a little as it thins, gone at 600 ms. */
function Wisp({ p, w, h, t }: { p: typeof WISPS[number]; w: number; h: number; t: SharedValue<number> }) {
  // just above the lobe line: the central lobes are the tallest
  const y0 = h * (0.08 + 0.2 * Math.abs(p.x - 0.5) * 2) - p.size * 0.25;
  const st = useAnimatedStyle(() => {
    const v = t.value;                       // linear time, 0 to 1 over 600 ms
    const go = 1 - (1 - v) * (1 - v);        // the travel: out fast, settling, like air leaving
    const peak = press3d.wispPeakAt / press3d.wispMs;
    const o = v <= 0 || v >= 1 ? 0 : v < peak ? (v / peak) * press3d.wispOpacity : ((1 - v) / (1 - peak)) * press3d.wispOpacity;
    return { opacity: o, transform: [{ translateX: p.out * go }, { translateY: -p.up * go }, { scale: 0.7 + 0.6 * go }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: w * p.x - p.size / 2, top: y0 - p.size / 2, width: p.size, height: p.size }, st]}>
      <Image source={WISP} style={StyleSheet.absoluteFill} contentFit="fill" />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  ink: { borderRadius: 4, backgroundColor: theme.color.ink, overflow: 'hidden' },
  off: { opacity: 0.4 },
  safe: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  label: { ...theme.type.sansBold, fontSize: 13, letterSpacing: 3.1, textTransform: 'uppercase', textAlign: 'center' },
  fill: { position: 'absolute', left: '22%', right: '22%', bottom: 4, height: 2, opacity: 0.5, transformOrigin: 'left' },
});
