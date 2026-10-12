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
} as const;
type Sound = keyof typeof sources;

const pools: Partial<Record<Sound, AudioPlayer[]>> = {};
let ready = false;

/** Warm the players once so the first tick is not late. Safe to call twice. */
export async function warm() {
  if (ready) return; ready = true;
  try { await setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }); } catch {}
  for (const k of Object.keys(sources) as Sound[]) {
    const n = k === 'tick' ? 4 : 2;   // ticks overlap at drag speed
    try { pools[k] = Array.from({ length: n }, () => createAudioPlayer(sources[k])); } catch { pools[k] = []; }
  }
}

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
  landed() { play('thud'); impact(Haptics.ImpactFeedbackStyle.Heavy); },
  /** You are the high bidder: two rising notes and the success haptic, 150 ms after the thud. */
  lead() { play('lead'); notify(Haptics.NotificationFeedbackType.Success); },
  /** The ring refilled in the last two minutes: medium impact, the same every time. */
  refill() { play('refill'); impact(Haptics.ImpactFeedbackStyle.Medium); },
  /** The one rejection the doctrine keeps. */
  rejected() { play('warn'); notify(Haptics.NotificationFeedbackType.Warning); },
  /** Won, or a hold completed. */
  done() { play('chime'); notify(Haptics.NotificationFeedbackType.Success); },
  /** The 600 ms hold filling: a medium impact at the end only. */
  holdDone() { impact(Haptics.ImpactFeedbackStyle.Medium); },
  /** Welcome back, arrival, mailed: thump-thump, 200 ms apart. Touch only. */
  heartbeat() { impact(Haptics.ImpactFeedbackStyle.Medium); setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Light), 200); },
  /** Nothing. Here so call sites can say so. */
  silence() {},
};
