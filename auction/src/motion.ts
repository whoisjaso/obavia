/* The motion vocabulary. Curves and springs come from animate-expo's tables,
   never approximated; everything else in the app imports from here.
   Springs are written in Apple's two designer parameters (duration, damping
   ratio). A finger was involved: spring. No finger: timing. */
import { Easing, ReduceMotion } from 'react-native-reanimated';

export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);        // entering, exiting, press
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);    // moving on screen
export const EASE_SHEET = Easing.bezier(0.32, 0.72, 0, 1);      // iOS sheet curve
export const BREATH = Easing.inOut(Easing.sin);                 // a loop that breathes; cloud drift
export const CLOUD_OUT = Easing.bezier(0.2, 0.7, 0.2, 1);       // the house --out: pages settling (cloud-system §4)

export const spring = {
  /** Sheet, drawer: carries the finger's velocity, never passes the bottom edge. */
  sheet: { duration: 300, dampingRatio: 0.8, overshootClamping: true },
  /** Snap back after a drag: the gesture had momentum, a little give is right. */
  snap: { duration: 400, dampingRatio: 0.8 },
  /** Press, lift, settle: no overshoot. */
  settle: { duration: 200, dampingRatio: 1 },
  /** A value that moved (the bars): the default settle. */
  value: { duration: 400, dampingRatio: 1 },
  /** A cloud re-inflating after a press (cloud-system §2): ratio 0.65, response 300 ms. Overshoot on a
      2.5 pt sink is under 0.2 pt; it never rings twice. */
  rise: { duration: 300, dampingRatio: 0.65 },
  /** A press dragged off: the same rise without the overshoot. */
  cancel: { duration: 300, dampingRatio: 1 },
  /** A sheet forming from the bottom (cloud-system §4): ratio 0.75. The ~3 % over-rise lands inside the
      40 pt the sheet keeps below the glass, so no edge ever lifts off the bottom. */
  form: { duration: 420, dampingRatio: 0.75 },
} as const;

/** The cloud press (cloud-system §2): how far a surface sinks and how much its shade gives. */
export const cloud = {
  sinkY: 2.5,          // pt toward the page
  sinkScale: 0.985,    // the body compresses a hair
  shadeDown: 0.45,     // the shade's opacity falls by this much (its blur reads 40 % shorter)
  swell: 1.03,         // the one landed swell, 1 -> 1.03 -> 1
  settleY: -8,         // a page settles down from 8 pt above
  stagger: 40,         // ms between a page's children settling
} as const;

/** Decoration that the system's reduce-motion setting removes; state still lands. */
export const decor = { reduceMotion: ReduceMotion.System } as const;

export const ms = {
  press: 120,      // press feedback
  punch: 90,       // the ack punch up
  settle: 180,     // the ack punch down
  stamp: 160,      // the rejection stamp
  land: 200,       // the deposit line landing
  exit: 200,       // a sheet leaving without a finger
  lead: 90,        // thud to lead: inside the 100 ms window
  pause: 200,      // Won: nothing, then the burst
  green: 240,      // the pass turns green
  sink: 100,       // a cloud surface sinking under the thumb
  swell: 420,      // the landed swell, both legs
  page: 420,       // a page settling
  sheetFade: 200,  // reduced motion: a sheet fades instead of rising
} as const;

/** Cloud drift (cloud-system §1, §4): never still, never jumping. Far layers are slower. */
export const drift = {
  far: { period: 120_000, px: 8 },
  mid: { period: 90_000, px: 10 },
  near: { period: 64_000, px: 12 },
} as const;
