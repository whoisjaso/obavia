/* Soft, short tones. Only ever after a tap, never on their own. */
let ac: AudioContext | null = null;
const ctx = () => { try { ac ??= new AudioContext(); if (ac.state === 'suspended') ac.resume(); return ac; } catch { return null; } };

export function chime(freqs: number[] = [880], gain = 0.035, gap = 0.09) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const a = ctx(); if (!a) return;
  freqs.forEach((f, i) => {
    const t0 = a.currentTime + 0.01 + i * gap, o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
    o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + 1);
  });
}
export const sounds = {
  tap: () => chime([1318.5], 0.018),
  done: () => chime([987.77, 1318.5], 0.03),
  reveal: () => chime([659.25, 987.77, 1318.5, 1760], 0.03, 0.12),
};
