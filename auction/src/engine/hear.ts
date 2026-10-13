/* Hold to hear (W4-B): the engine's idle the Desk recorded, played while the thumb holds the lane photo. One
   expo-audio player per car page, made when the page has a recording and released with it; the Worker's stream
   (GET /lots/:id/audio) or the seeded file are the same source to the player. Start: from the top, at full volume,
   with the medium impact on the same frame (the one haptic of the hold). Stop: a 180 ms fade in six steps, then the
   pause; a release before the sound began is silent. No module loads on a page with no recording. */
import { useEffect, useMemo, useRef } from 'react';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import type { Media } from '../data/cars';
import { feel } from '../feel';
import { FADE_MS, fadeGains } from './fade';

export type Engine = { start: () => void; stop: () => void };

export function useEngine(source: Media | undefined): Engine {
  const player = useRef<AudioPlayer | null>(null);
  const fade = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (source === undefined) return;
    try { player.current = createAudioPlayer(source); } catch { player.current = null; }
    return () => {
      if (fade.current) clearInterval(fade.current);
      try { player.current?.remove(); } catch { /* already gone */ }
      player.current = null;
    };
  }, [source]);
  return useMemo<Engine>(() => ({
    start() {
      const p = player.current;
      if (!p) { feel.touch(); return; }   // no recording: the old light touch, the photo's settle is the whole hold
      if (fade.current) { clearInterval(fade.current); fade.current = null; }
      try { p.volume = 1; void p.seekTo(0); p.play(); } catch { return; }
      feel.holdDone();   // the medium impact, on the frame the engine turns over
    },
    stop() {
      const p = player.current;
      if (!p || fade.current) return;
      const gains = fadeGains();
      let i = 0;
      fade.current = setInterval(() => {
        const g = gains[i++];
        try { p.volume = g; if (g <= 0) p.pause(); } catch { /* the player is gone */ }
        if (g <= 0 && fade.current) { clearInterval(fade.current); fade.current = null; }
      }, FADE_MS / gains.length);
    },
  }), []);
}
