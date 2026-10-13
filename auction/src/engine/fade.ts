/* The release fade for hold to hear (./hear): the gains, step by step, from under 1 down to 0; the last step is
   the pause. Pure, so the test needs no audio module. */
export const FADE_MS = 180, FADE_STEPS = 6;
export function fadeGains(steps = FADE_STEPS): number[] {
  return Array.from({ length: steps }, (_, i) => Number(((steps - 1 - i) / steps).toFixed(3)));
}
