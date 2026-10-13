/* The time ring. Ice while the auction runs; blue in the last two minutes,
   where it refills to full on every bid, exactly the same way every time.
   Between ticks it runs linearly (constant motion); a refill is the one eased
   move. Amber when the county kicks the plates back. */
import React, { useEffect, useRef } from 'react';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming, useReducedMotion, Easing } from 'react-native-reanimated';
import { EASE_OUT } from '../motion';
import { theme } from '../theme';

const ACircle = Animated.createAnimatedComponent(Circle);
const TICK_MS = 250;   // the store's clock is 4 Hz: each step runs linearly into the next

export function Ring({ size = 44, stroke = theme.size.ringStroke, progress, blue, refillKey, grey, warn }: {
  size?: number; stroke?: number;
  progress: number;          // 0..1 remaining
  blue: boolean;             // last two minutes
  refillKey?: number;        // changes on every bid in the last two minutes
  grey?: boolean;            // offline / closed
  warn?: boolean;            // a kickback: amber
}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const p = useSharedValue(progress);
  const reduce = useReducedMotion();
  const lastKey = useRef(refillKey);
  useEffect(() => {
    const refill = blue && refillKey !== undefined && refillKey !== lastKey.current;
    lastKey.current = refillKey;
    if (refill) {
      // the refill: a quick fill to full, then the clock runs again. State, so it lands under reduced motion too.
      p.value = reduce ? 1 : withTiming(1, { duration: 220, easing: EASE_OUT });
    } else if (Math.abs(progress - p.value) > 0.05) {
      p.value = reduce ? progress : withTiming(progress, { duration: 260, easing: EASE_OUT });   // a jump (a stage, a new lot)
    } else {
      p.value = withTiming(progress, { duration: TICK_MS, easing: Easing.linear });             // the clock
    }
  }, [progress, refillKey, blue]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - Math.max(0, Math.min(1, p.value))) }));
  const colour = grey ? theme.color.faint : warn ? theme.color.warn : blue ? theme.color.blue : theme.color.ice;
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.color.cloud} strokeOpacity={0.22} strokeWidth={stroke} fill="none" />
      <ACircle cx={size / 2} cy={size / 2} r={r} stroke={colour} strokeWidth={stroke} strokeLinecap="round" fill="none"
        strokeDasharray={`${c} ${c}`} animatedProps={props} />
    </Svg>
  );
}
