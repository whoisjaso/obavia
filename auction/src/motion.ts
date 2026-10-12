/* The motion vocabulary. Curves and springs come from animate-expo's tables,
   never approximated; everything else in the app imports from here.
   Springs are written in Apple's two designer parameters (duration, damping
   ratio). A finger was involved: spring. No finger: timing. */
import { Easing, ReduceMotion } from 'react-native-reanimated';

export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);        // entering, exiting, press
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);    // moving on screen
export const EASE_SHEET = Easing.bezier(0.32, 0.72, 0, 1);      // iOS sheet curve
export const BREATH = Easing.inOut(Easing.sin);                 // a loop that breathes

export const spring = {
  /** Sheet, drawer: carries the finger's velocity, never passes the bottom edge. */
  sheet: { duration: 300, dampingRatio: 0.8, overshootClamping: true },
  /** Snap back after a drag: the gesture had momentum, a little give is right. */
  snap: { duration: 400, dampingRatio: 0.8 },
  /** Press, lift, settle: no overshoot. */
  settle: { duration: 200, dampingRatio: 1 },
  /** A value that moved (the bars): the default settle. */
  value: { duration: 400, dampingRatio: 1 },
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
} as const;
