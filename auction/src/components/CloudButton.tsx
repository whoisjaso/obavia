/* The 3D cloud button (cloud-system §2, §8; the owner: "genuinely make the 3d graphics from scratch and the 3d
   buttons as well, and animations after clicking them, and sfx").

   The body is a rendered cloud. Three tiers, chosen once per set and never mixed:
     3d     the Blender contract (assets/cloud-3d via scripts/cloud3d.mjs): a 24-frame sprite sheet (3 by 8, a 4 px
            gap between frames), 0 to 5 the press, 6 to 23 the re-inflation baked in, 23 the rest; played linearly
            at the contract's 60 fps on the UI thread by a shared value; only the sink springs. One image, clipped to a
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
   and the frames jump rest, pressed, rest; sounds and haptics stay.

   The label is carved into the cloud, not printed on it (the owner: "etched into the clouds, real and clean
   blended"). On the 3D tier it is the Cycles carve itself (IMPRINT, tools/cloud-3d/render_labels.py): an imprint
   layer over the sheet frame. Without an imprint, three copies of the same glyphs stand in: the wall of the cut
   that faces away from the sun (a blue-grey shade, soft), the wall that catches it (ice), and the floor of the
   letter (ink with the cloud's blue in it, not quite opaque, so the material shows through). See ETCH. */
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
import { BUTTON_3D, LABELS_3D, type Label3D, type Rect } from './cloud3d';
import { useReduceMotion } from './Sky';

type Tone = 'light' | 'dark';
type SetKey = '320' | '440';
type Tier = '3d' | 'photo' | 'ink';

/** One width's sprites, in the sprite's own pixels (@2x). */
type Sprites = {
  tier: Tier; frameW: number; frameH: number; safe: Rect; shadowW: number; shadowH: number;
  rest?: number; pressed?: number; shadowRest?: number; shadowPressed?: number;
  sheet?: number; sheetW?: number; sheetH?: number; frames?: Rect[]; gap?: number;
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
      sheet: s.sheet, sheetW: s.sheetW, sheetH: s.sheetH, frames: s.frames.length ? s.frames : [frame0], gap: s.gap,
    };
  }
  return PHOTO[tone][set];
}

/** The set whose drawn width is nearest: the 320 cloud for a narrow column, the 440 for the phone's full one. */
const setFor = (w: number): SetKey => (w <= 330 ? '320' : '440');

/* The 3D frame is 2.5:1 with air above the crowns for the puff's wisps and below the belly for the shadow; the
   cloud takes its full height on the glass but gives back 10 percent of it above and below to the layout, so a
   sheet sized for the body is not pushed off the screen (the 440 frame at 345 pt is 138 pt, the body about 100). */
const SKY_TRIM = 0.1;

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

/* The etch, per material. The recipe follows what the label sits on, measured from the sprites' own pixels
   (scripts in the report): the light cloud's label zone is luminance 0.43 to 0.88, and the dark lane's cloud is
   also a pale blue mass there (0.34 to 0.58; ice letters on it would read 1.4:1), so both sprites take the
   pressed-ink recipe. Only the ink bar is dark under the label; there the floor is ice. The sun stays above
   left on every material: a cut reads as a cut only when its dark wall is on the lit side (swapped, the
   letters read raised, measured in the first captures).
     floor    the letter's body; under the press it darkens by `press` (opacity), the cut deepening as it squashes
     shade    the wall in its own shadow: offset `d` toward the sun, blurred `blur`; under the press `d` shrinks
              to `dIn`, the cloud closing over the cut
     light    the wall that catches the sun: offset `d` away from it, barely soft (`soft`); on landed it brightens
              by `land` with the swell
   Offsets are device pixels, not points: 0.7 pt is 1.4 px at 2x but 2.1 at 3x, where the lit wall came loose
   from the letter as a second outline. */
export const ETCH = {
  // ink #1C2436 turned toward the cloud's shade blue and a step deeper, at 88 %: the cloud shows through, and
  // the floor still holds 4.5:1 on the darkest pixel under the label (a lighter blue mix at 84 % measured 3.3:1)
  pressed: { floor: '#1A2540', floorO: 0.88, press: 0.08, shade: '#24304C', shadeO: 0.4, light: '#F8FAFF', lightO: 0.6, land: 0.3, d: 1.2, dIn: 0.6, blur: 1.2, soft: 0.4 },
  // the ink bar: an ice floor, a deeper ink wall in shadow above left, a faint ice wall below right
  ice: { floor: '#E9EFFE', floorO: 0.9, press: -0.08, shade: '#0A0E18', shadeO: 0.6, light: '#B8C8F1', lightO: 0.35, land: 0.35, d: 1.2, dIn: 0.6, blur: 1, soft: 0.6 },
} as const;
export type EtchRecipe = keyof typeof ETCH;
/** The recipe for what the label sits on: the ink bar is the only dark floor (see ETCH). */
export const etchFor = (tier: Tier): EtchRecipe => (tier === 'ink' ? 'ice' : 'pressed');

/* The true cut (tools/cloud-3d/render_labels.py): the label carved into the rest volume in Cycles, shipped as an
   imprint (the shadowed wall, the lit lip, the darkened floor, each with its alpha) cut to the safe rect, laid
   over whatever frame the sheet shows. Under the press a second copy deepens it by `press`; on landed the lip
   alone brightens by `land` with the swell. Labels with no imprint, and the photo and ink tiers, keep ETCH. */
export const IMPRINT = { press: 0.1, land: 0.5 } as const;
/** The imprint for a label on the 3D tier, with its rect in points inside the safe zone; null when none ships. */
const imprintFor = (tier: Tier, tone: Tone, w: number, label: string, sp: Sprites, sc: number) => {
  if (tier !== '3d') return null;
  const set = LABELS_3D[tone][setFor(w)];
  const im = set?.labels[label.toUpperCase()];
  if (!set || !im) return null;
  const r = set.rect;
  return { ...im, left: (r.x - sp.safe.x) * sc, top: (r.y - sp.safe.y) * sc, width: r.w * sc, height: r.h * sc };
};
type Imprint = Label3D & { left: number; top: number; width: number; height: number };

/* The frame clock: the shared value runs linearly from a frame to just under the next whole frame past the last
   one, and the frame shown is its floor, so each frame holds exactly 1000 / 60 ms (frames 0 to 5 in 100 ms, 6 to
   23 in 300 ms). Rest is 23, pressed 5 (the contract's sheet.json). */
const REST = press3d.frames - 1;
const FRAME_MS = 1000 / 60;
const UNDER = 0.999;
const frameOf = (v: number) => { 'worklet'; return Math.max(0, Math.min(REST, Math.floor(v))); };
/** How pressed a frame looks, 0 to 1: up over the press frames, down over the release frames. */
const pressedness = (v: number) => {
  'worklet';
  const last = press3d.frames - 1;
  return v < press3d.upFirst ? Math.min(1, v / press3d.downLast) : Math.max(0, (last - v) / (last - press3d.upFirst));
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

  const f = useSharedValue(REST);    // the frame clock, 0 to 23 (rest)
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
      f.value = withTiming(press3d.downLast + UNDER, { duration: (press3d.downLast + 1) * FRAME_MS, easing: Easing.linear });   // the frames are the curve
      k.value = withTiming(1, { duration: ms.sink, easing: EASE_OUT });
    }
    scheduleOnRN(feel.press);
  };
  const up = (ok: boolean) => {
    'worklet';
    if (reduce) { f.value = REST; k.value = withTiming(0, { duration: ms.press, easing: EASE_OUT }); }
    else {
      const sp2 = ok ? spring.rise : spring.cancel;
      // the re-inflation is baked into 6 to 23: linear at 60 fps; only the sink springs
      f.value = press3d.upFirst; f.value = withTiming(REST + UNDER, { duration: (REST - press3d.upFirst + 1) * FRAME_MS, easing: Easing.linear });
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
    <View style={[{ alignSelf: 'stretch', height: h }, tier === '3d' && { marginVertical: -h * SKY_TRIM }, style]} onLayout={e => { const n = Math.round(e.nativeEvent.layout.width); if (n > 0 && n !== w) setW(n); }}>
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
            {content ?? <Etch label={label} recipe={etchFor(tier)} imprint={imprintFor(tier, tone, w, label, sp, sc)} k={k} sw={sw} still={reduce} />}
            {holdMs != null && <Animated.View style={[s.fill, { backgroundColor: ink }, fillSt]} />}
          </Animated.View>
        </Animated.View>
      </GestureDetector>
      {/* in front: the wisps the release sheds from the top edge */}
      {tier !== 'ink' && !reduce && WISPS.map((p, i) => <Wisp key={i} p={p} w={w} h={h} t={wp} />)}
    </View>
  );
}

/** The label, pressed into the material: the shade wall, the lit wall, then the floor over both, three copies of
    the same glyphs so only the edges of the walls show. The floor sits in the flow and sizes the box; the walls
    are laid over it. Reduced motion: all three stay where they are. */
function Etch({ label, recipe, imprint, k, sw, still }: { label: string; recipe: EtchRecipe; imprint: Imprint | null; k: SharedValue<number>; sw: SharedValue<number>; still: boolean }) {
  const [lost, setLost] = useState(false);   // the imprint failed to load: the layered emboss
  if (imprint && !lost) return <Carved label={label} im={imprint} k={k} sw={sw} still={still} onError={() => setLost(true)} />;
  return <Layered label={label} recipe={recipe} k={k} sw={sw} still={still} />;
}

/** The carved label: the Cycles imprint over the sheet frame, the press deepening it, the landed swell lighting
    its lip. The words stay as text for the screen reader and for find, drawn transparent. */
function Carved({ label, im, k, sw, still, onError }: { label: string; im: Imprint; k: SharedValue<number>; sw: SharedValue<number>; still: boolean; onError: () => void }) {
  const at = { position: 'absolute' as const, left: im.left, top: im.top, width: im.width, height: im.height };
  const deepSt = useAnimatedStyle(() => ({ opacity: still ? 0 : IMPRINT.press * k.value }));
  const lipSt = useAnimatedStyle(() => ({ opacity: still ? 0 : IMPRINT.land * Math.max(0, Math.min(1, (sw.value - 1) / (cloud.swell - 1))) }));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Text numberOfLines={1} style={[s.label, s.unseen]}>{label}</Text>
      <Image testID="label-imprint" source={im.src} style={at} contentFit="fill" cachePolicy="memory" onError={onError} />
      <Animated.View style={[at, deepSt]}><Image source={im.src} style={StyleSheet.absoluteFill} contentFit="fill" cachePolicy="memory" /></Animated.View>
      {im.lip != null && <Animated.View style={[at, lipSt]}><Image source={im.lip} style={StyleSheet.absoluteFill} contentFit="fill" cachePolicy="memory" /></Animated.View>}
    </View>
  );
}

/** The fallback: three stacked copies of the glyphs (see ETCH). */
function Layered({ label, recipe, k, sw, still }: { label: string; recipe: EtchRecipe; k: SharedValue<number>; sw: SharedValue<number>; still: boolean }) {
  const e = ETCH[recipe];
  const pr = PixelRatio.get(), d = e.d / pr, dIn = e.dIn / pr;   // device pixels to points
  const lightSt = useAnimatedStyle(() => ({
    opacity: still ? e.lightO : Math.min(1, e.lightO + e.land * Math.max(0, (sw.value - 1) / (cloud.swell - 1))),
  }));
  const shadeSt = useAnimatedStyle(() => {
    const o = still ? d : d - (d - dIn) * k.value;
    return { transform: [{ translateX: -o }, { translateY: -o }] };
  });
  const floorSt = useAnimatedStyle(() => ({ opacity: still ? e.floorO : e.floorO + e.press * k.value }));
  const glyphs = { numberOfLines: 1, adjustsFontSizeToFit: true, selectable: false } as const;
  return (
    <View style={s.etch} accessible={false} importantForAccessibility="no-hide-descendants" aria-hidden>
      <Animated.Text {...glyphs} style={[s.label, s.wall, { color: e.light, textShadowColor: e.light, textShadowRadius: e.soft, textShadowOffset: { width: 0, height: 0 }, transform: [{ translateX: d }, { translateY: d }] }, lightSt]}>{label}</Animated.Text>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: e.shadeO }, shadeSt]}>
        <Text {...glyphs} style={[s.label, s.wall, { color: e.shade, textShadowColor: e.shade, textShadowRadius: e.blur, textShadowOffset: { width: 0, height: 0 } }]}>{label}</Text>
      </Animated.View>
      <Animated.Text {...glyphs} style={[s.label, { color: e.floor }, floorSt]}>{label}</Animated.Text>
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
  // frames that touch (no gap in the json): at a scale that is not a whole number the filter samples the opaque
  // base of the frame above into this one's top row, so the window drops its top 2 device px. The contract's 4 px
  // transparent gap makes that unnecessary.
  const inset = (sp.gap ?? 0) >= 2 ? 0 : 2 / pr;
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
  // 17 pt, the glass's floor (DOCTRINE §4.3); 3.1 pt tracking is 0.18 em. The imprints are carved at the same size
  // (tools/cloud-3d/labels.json: 17 pt on a 345 pt cloud); the two long labels are fitted to the safe rect there.
  label: { ...theme.type.sansBold, fontSize: 17, letterSpacing: 3.1, textTransform: 'uppercase', textAlign: 'center' },
  etch: { alignSelf: 'center' },
  wall: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  unseen: { position: 'absolute', left: 0, right: 0, top: 0, color: 'transparent' },
  fill: { position: 'absolute', left: '22%', right: '22%', bottom: 4, height: 2, opacity: 0.5, transformOrigin: 'left' },
});
