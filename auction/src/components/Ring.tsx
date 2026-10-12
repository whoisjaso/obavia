/* The time ring. Ice while the auction runs; blue in the last two minutes,
   where it refills to full on every bid, exactly the same way every time. */
import React, { useEffect } from 'react';
import Svg, { Circle } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withSequence, withTiming, useReducedMotion } from 'react-native-reanimated';
import { theme } from '../theme';

const ACircle = Animated.createAnimatedComponent(Circle);

export function Ring({ size = 44, stroke = theme.size.ringStroke, progress, blue, refillKey, grey }: {
  size?: number; stroke?: number;
  progress: number;          // 0..1 remaining
  blue: boolean;             // last two minutes
  refillKey?: number;        // changes on every bid in the last two minutes
  grey?: boolean;            // offline / closed
}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const p = useSharedValue(progress);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (refillKey !== undefined && blue) {
      // the refill: a quick fill to full, then the clock runs again
      p.value = reduce ? 1 : withSequence(withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }));
    } else {
      p.value = withTiming(progress, { duration: reduce ? 0 : 260, easing: Easing.out(Easing.quad) });
    }
  }, [progress, refillKey, blue]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - Math.max(0, Math.min(1, p.value))) }));
  const colour = grey ? theme.color.faint : blue ? theme.color.blue : theme.color.ice;
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.color.cloud} strokeOpacity={0.22} strokeWidth={stroke} fill="none" />
      <ACircle cx={size / 2} cy={size / 2} r={r} stroke={colour} strokeWidth={stroke} strokeLinecap="round" fill="none"
        strokeDasharray={`${c} ${c}`} animatedProps={props} />
    </Svg>
  );
}
