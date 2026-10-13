/* The hammer moment (DOCTRINE §5: "the hammer moment (Sold, Won)"; cloud-system §2, landed: "a single soft swell
   and settle in the same frame as the sound and the haptic"). The gavel falls into the house cumulus and the cloud
   puffs, rendered in Cycles (tools/scene-3d, assets/scene-3d/hammer), light on the sky, played by the moment
   player (Moment.tsx). Frames 0 to 5 the fall (100 ms), 6 the strike, 6 to 23 the puff opening and freezing
   (300 ms); 23 is the still and holds. The strike is the frame's own callback: the chime and the haptic fire when
   the head meets the cloud, not on a timer beside it, so the three channels land in one frame. Reduced motion:
   nothing, then the still on the strike, with the sound and the haptic. */
import React from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { type SharedValue } from 'react-native-reanimated';
import { Moment, play, startFrame as momentStart } from './Moment';
import { MOMENT_3D } from './scene3d';

/** The light set, the one Won draws on the sky; null when no render ships. */
export const HAMMER = MOMENT_3D.hammer?.light ?? null;

/** Where the cloud's shade ends in the cell (the content sits in the middle 74 percent): what is placed under the
    hammer starts here, touching the shade, not the cell's transparent foot. */
export const HAMMER_FOOT = 0.86;

/** The frame clock's rest value: a hammer that has not begun shows its first frame (raised); reduced motion and
    the absence of a render show nothing until the strike. */
export const startFrame = (reduce: boolean) => momentStart(HAMMER, reduce);

/** Begin the fall: the frames to the contact, `strike` on that frame, then the puff to the still. Reduced motion
    or no render: the still (or nothing) and the strike at once. */
export const fall = (f: SharedValue<number>, reduce: boolean, strike: () => void) => play(HAMMER, f, reduce, strike);

export function Hammer({ f, height, onReady, style }: {
  f: SharedValue<number>;
  /** the cell's height in points; the cell is square */
  height: number;
  /** the sheet is on the glass (or failed): the fall may begin */
  onReady?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return <Moment m={HAMMER} f={f} height={height} onReady={onReady} style={style} testID="hammer-sheet" />;
}
