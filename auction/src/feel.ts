/* The sensory layer. Every positive event fires sound and touch inside the same
   frame; neutral and negative events get nothing, except the one rejection the
   doctrine keeps (a bid after close), which gets the warning. Asymmetry is the
   point: silence is the punishment. */
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

const sources = {
  tick: require('../assets/sfx/tick.wav'),
  select: require('../assets/sfx/select.wav'),
  thud: require('../assets/sfx/thud.wav'),
  air: require('../assets/sfx/air.wav'),
  warn: require('../assets/sfx/warn.wav'),
  chime: require('../assets/sfx/chime.wav'),
  refill: require('../assets/sfx/refill.wav'),
  lead: require('../assets/sfx/lead.wav'),
  ding: require('../assets/sfx/ding.wav'),   // one short E6 with a bell's first partial, 220 ms: a Won step done
  // the cloud kit (docs/design/cloud-system.md §3): filtered noise, one room, every file peaks at -18 dBFS,
  // so the players stay at volume 1 and the kit never rises above that; it is texture under ordinary touches
  puff: require('../assets/sfx/cloud/cloud-touch.wav'),
  rise: require('../assets/sfx/cloud/cloud-rise.wav'),
  settle: require('../assets/sfx/cloud/cloud-settle.wav'),
  swell: require('../assets/sfx/cloud/cloud-landed.wav'),
} as const;
const CLOUD_GAIN = 1;   // the WAVs are mastered to -18 dBFS peak; gain 1 keeps that peak
type Sound = keyof typeof sources;

const pools: Partial<Record<Sound, AudioPlayer[]>> = {};
let ready = false;

/** Warm the players once so the first tick is not late. Safe to call twice. */
export async function warm() {
  if (ready) return; ready = true;
  try { await setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }); } catch {}
  for (const k of Object.keys(sources) as Sound[]) {
    const n = k === 'tick' || k === 'puff' || k === 'rise' ? 4 : 2;   // ticks and quick taps overlap
    try {
      pools[k] = Array.from({ length: n }, () => createAudioPlayer(sources[k]));
      if (k === 'puff' || k === 'rise' || k === 'settle' || k === 'swell') pools[k]!.forEach(p => { p.volume = CLOUD_GAIN; });
    } catch { pools[k] = []; }
  }
  try { driftPlayer = createAudioPlayer(require('../assets/sfx/cloud/cloud-drift.wav')); driftPlayer.loop = true; driftPlayer.volume = 0; } catch { driftPlayer = null; }
}

/* cloud-drift: one looped player, its gain following the sheet's speed under the finger (in steps, never
   per frame), paused the moment the finger lets go. */
let driftPlayer: AudioPlayer | null = null;
let airOn = false;
function drift(gain: number) {
  if (!driftPlayer) return; const air = driftPlayer;
  try {
    if (gain <= 0) { if (airOn) { air.volume = 0; air.pause(); airOn = false; } return; }
    air.volume = Math.min(1, gain) * CLOUD_GAIN;
    if (!airOn) { air.seekTo(0); air.play(); airOn = true; }
  } catch {}
}

/* Completion listeners: a surface that was just pressed breathes once (the landed swell) on the same
   call that plays the chime and the success haptic. Called synchronously inside feel.done. */
const doneListeners = new Set<() => void>();
let lastMoment = 0;   // the last chime, thud or lead: a settle inside its shadow is swallowed
let lastSettle = 0;
let lastRise = 0;     // a page that arrives from a tap already has its air: the rise

const cursor: Partial<Record<Sound, number>> = {};
function play(k: Sound) {
  const pool = pools[k]; if (!pool || pool.length === 0) return;
  const i = ((cursor[k] ?? 0) + 1) % pool.length; cursor[k] = i;
  const p = pool[i];
  try { p.seekTo(0); p.play(); } catch {}
}

const native = Platform.OS === 'ios' || Platform.OS === 'android';
const impact = (s: Haptics.ImpactFeedbackStyle) => { if (native) Haptics.impactAsync(s).catch(() => {}); };
const notify = (t: Haptics.NotificationFeedbackType) => { if (native) Haptics.notificationAsync(t).catch(() => {}); };
const selection = () => { if (native) Haptics.selectionAsync().catch(() => {}); };

let lastLead = 0;

/** The vocabulary. Each is one unified event: sound and touch in the same call. */
export const feel = {
  /** One increment on the wheel: 392 Hz, 6 ms, light impact. */
  tick() { play('tick'); impact(Haptics.ImpactFeedbackStyle.Light); },
  /** A chip or a detent chosen. */
  select() { play('select'); selection(); },
  /** The lane snapped to the next car: soft air, selection tick at rest. */
  snap() { play('air'); selection(); },
  /** The thumb touched the price: it lifts; a light impact, no sound. */
  touch() { impact(Haptics.ImpactFeedbackStyle.Light); },
  /** The server acked the bid: deep thud, one heavy impact. Fires on the ack, never before. */
  landed() { lastMoment = Date.now(); play('thud'); impact(Haptics.ImpactFeedbackStyle.Heavy); },
  /** You are the high bidder: two rising notes and the success haptic, 90 ms after the thud (inside the
      100 ms window), on the same frame the leading mark appears. Once per moment: the Bid sheet and the
      Lane both see the lead change, and the second caller inside 1.5 s is swallowed. */
  lead() {
    const t = Date.now(); if (t - lastLead < 1500) return; lastLead = t;
    lastMoment = t; play('lead'); notify(Haptics.NotificationFeedbackType.Success);
  },
  /** The ring refilled in the last two minutes: medium impact, the same every time. */
  refill() { play('refill'); impact(Haptics.ImpactFeedbackStyle.Medium); },
  /** The one rejection the doctrine keeps. */
  rejected() { play('warn'); notify(Haptics.NotificationFeedbackType.Warning); },
  /** Won, a hold completed, the car started at pickup: the chime, the air swell under it (cloud-landed), the success haptic, and
      the landed swell on whatever surface was just pressed, all in this one call. */
  done() {
    lastMoment = Date.now();
    play('chime'); play('swell'); notify(Haptics.NotificationFeedbackType.Success);
    doneListeners.forEach(f => { try { f(); } catch {} });
  },
  /** A Won step done (ID, Insure, each signature): a short ding and a light impact, and the pressed surface
      breathes once. Lighter than done, so the win's chime keeps its meaning (native-patterns §6 item 6). */
  step() {
    lastMoment = Date.now();
    play('ding'); impact(Haptics.ImpactFeedbackStyle.Light);
    doneListeners.forEach(f => { try { f(); } catch {} });
  },
  /** Watching a car (the double tap): the puff and a light impact, on the frame the mark blooms. */
  watch() { play('puff'); impact(Haptics.ImpactFeedbackStyle.Light); },
  /** The deposit came back held from Whop: the success haptic and the air swell (cloud-landed), on the frame
      the held line lands. The bid's thud follows on its own ack. */
  held() { lastMoment = Date.now(); play('swell'); notify(Haptics.NotificationFeedbackType.Success); },
  /** The condition badge seen the first time: six light impacts, 60 ms apart, one per row, `each` lighting its
      dot on the same tick. Touch only. */
  six(each?: (i: number) => void) { for (let i = 0; i < 6; i++) setTimeout(() => { impact(Haptics.ImpactFeedbackStyle.Light); each?.(i); }, i * 60); },
  /** Subscribe to completion: returns the unsubscribe. */
  onDone(f: () => void) { doneListeners.add(f); return () => { doneListeners.delete(f); }; },
  /** A cloud surface touched down: the puff. Sound only; a press is not worth a haptic. */
  puff() { play('puff'); },
  /** The 3D cloud button touched down: the puff and the light impact, one call, one frame. */
  press() { play('puff'); impact(Haptics.ImpactFeedbackStyle.Light); },
  /** A cloud button's action landed: the air swell (cloud-landed) and, unless the caller's moment already
      carries one (the bid's thud), the heavy impact. */
  swell(haptic: boolean = true) { play('swell'); if (haptic) impact(Haptics.ImpactFeedbackStyle.Heavy); },
  /** The surface rose back after a completed press: the breath in. A cancelled press rises silently. */
  rise() { lastRise = Date.now(); play('rise'); },
  /** A sheet or a page settled into place: the air leaving. Once per 300 ms, and never inside the
      600 ms that belong to a chime, a thud or the lead, nor on top of the rise of the tap that caused it. */
  settle() {
    const t = Date.now(); if (t - lastSettle < 300 || t - lastMoment < 600 || t - lastRise < 250) return;
    lastSettle = t; play('settle');
  },
  /** A sheet moving under the finger: the drift loop at this gain (0 to 1); 0 stops it. */
  drift,
  /** The 600 ms hold filling: a medium impact at the end only. */
  holdDone() { impact(Haptics.ImpactFeedbackStyle.Medium); },
  /** Welcome back, arrival, mailed: thump-thump, 200 ms apart. Touch only. */
  heartbeat() { impact(Haptics.ImpactFeedbackStyle.Medium); setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Light), 200); },
  /** Nothing. Here so call sites can say so. */
  silence() {},
};
