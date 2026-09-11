/**
 * Demo simulator (brief §10: "a no-API simulation mode must also work; do not mislabel a scripted
 * simulator as an actual model conversation"). Deterministic by dial index and seed: outcomes cycle
 * connected / no_answer / connected / voicemail / connected / gatekeeper / …; a connected call plays
 * a synthetic transcript on a fixed schedule (prospect turns ~2.5–4 s apart). Nothing here dials.
 */
import type { ScriptBranch, ScriptNode } from '../schemas/scripts';
import type { Transcript, TranscriptTurn } from '../schemas/transcript';
import type { DialResult, QueueItem } from '../schemas/dialer';

export const OUTCOME_CYCLE: readonly DialResult[] = ['connected', 'no_answer', 'connected', 'voicemail', 'connected', 'gatekeeper'];

export interface SimulatedDial {
  result: DialResult;
  /** How long the far end rings before the result lands. */
  ring_ms: number;
}

/** Deterministic outcome for the n-th dial (0-based) of a session. */
export function simulateDial(dialIndex: number): SimulatedDial {
  const result = OUTCOME_CYCLE[((dialIndex % OUTCOME_CYCLE.length) + OUTCOME_CYCLE.length) % OUTCOME_CYCLE.length]!;
  const ring: Record<DialResult, number> = { connected: 1800 + (dialIndex % 3) * 400, no_answer: 4200, voicemail: 3200, gatekeeper: 1600, failed: 800 };
  return { result, ring_ms: ring[result] };
}

/** Small deterministic PRNG (mulberry32) so schedules are reproducible per seed. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Transcript for a connected demo call: the contact's own synthetic call when one exists, otherwise
 * a fixture chosen by dial index from the transcripts that are not tied to a contact (never the opt-out call).
 */
export function pickTranscript(item: Pick<QueueItem, 'call_id'>, dialIndex: number, transcripts: readonly Transcript[]): Transcript | null {
  if (item.call_id) {
    const own = transcripts.find((t) => t.call_id === item.call_id);
    if (own) return own;
  }
  const pool = transcripts.filter((t) => t.call_id.startsWith('syn-l-') && !/opt-out|revision-retracts|touch-base/.test(t.call_id));
  if (pool.length === 0) return transcripts[0] ?? null;
  return pool[dialIndex % pool.length] ?? null;
}

export interface ScheduledTurn {
  /** Index into `turnsInOrder(transcript)`. */
  turn_index: number;
  /** Milliseconds after connection when this event arrives. Non-decreasing. */
  at_ms: number;
}

/** Turns in arrival order (by started_at, then provider sequence) — the raw seed may be scrambled on purpose. */
export function turnsInOrder(transcript: Transcript): TranscriptTurn[] {
  return [...transcript.turns].sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at) || a.provider_sequence - b.provider_sequence || a.revision - b.revision);
}

/** Bounds of the gap before a prospect turn (ms). */
export const PROSPECT_GAP_MS: readonly [number, number] = [2500, 4000];
/** Bounds of the gap before a representative turn (Jason speaks right after). */
export const REP_GAP_MS: readonly [number, number] = [900, 1500];

/**
 * Playback schedule: turn → arrival ms. Prospect turns arrive 2.5–4 s apart; representative turns
 * follow within ~1–1.5 s; an interim event lands 700 ms before its final; a duplicate/revision of
 * the same utterance arrives 400 ms after it. Monotonic, deterministic per transcript.
 */
export function playbackSchedule(transcript: Transcript, seed: number = hashString(transcript.call_id)): ScheduledTurn[] {
  const turns = turnsInOrder(transcript);
  const next = rng(seed);
  const out: ScheduledTurn[] = [];
  let at = 600;
  let prevUtterance: string | null = null;
  turns.forEach((t, i) => {
    if (i > 0) {
      if (t.utterance_id === prevUtterance) {
        at += t.is_final ? 700 : 400;
      } else {
        const [lo, hi] = t.speaker_role === 'prospect' ? PROSPECT_GAP_MS : REP_GAP_MS;
        at += Math.round(lo + next() * (hi - lo));
      }
    }
    out.push({ turn_index: i, at_ms: at });
    prevUtterance = t.utterance_id;
  });
  return out;
}

/** Raw provider events that have arrived by `elapsedMs` (in arrival order) — feed these to the vocabulary/listener pipelines. */
export function playedTurns(transcript: Transcript, schedule: readonly ScheduledTurn[], elapsedMs: number): TranscriptTurn[] {
  const ordered = turnsInOrder(transcript);
  return schedule.filter((s) => s.at_ms <= elapsedMs).map((s) => ordered[s.turn_index]!).filter(Boolean);
}

/** Total playback length in ms. */
export function scheduleLength(schedule: readonly ScheduledTurn[]): number {
  return schedule.length === 0 ? 0 : schedule[schedule.length - 1]!.at_ms;
}

// ---------------------------------------------------------------------------------------------
// Next-script-node hint: which branch of the current node best matches what the prospect just said.
// A hint only — the representative advances the line; nothing auto-applies.
// ---------------------------------------------------------------------------------------------

const CATEGORY_PATTERNS: Record<string, RegExp> = {
  permission_granted: /\b(go ahead|go on|sure|you have a minute|a minute|sixty seconds|okay|ok\b|fine)\b/i,
  gatekeeper: /\b(not the right person|switchboard|who is calling|what is this about|take a message|he'?s not|she'?s not|not available|transfer)\b/i,
  bad_time: /\b(bad time|busy|call back later|later|not now|in a meeting|another time)\b/i,
  not_relevant: /\b(not relevant|don'?t need|no need|not interested|we'?re good|not looking)\b/i,
  opt_out: /\b(take me off|remove me|do not call|don'?t call|never call|stop calling|off your list)\b/i,
  confirmed: /\b(that'?s right|correct|yes|yeah|yep|exactly|right)\b/i,
  doesnt_recall: /\b(don'?t remember|don'?t recall|not sure I did|did I)\b/i,
  wrong_person: /\b(wrong person|wrong number|who\?|no idea who)\b/i,
  declined: /\b(rather not|no thanks|not going to|won'?t say|decline)\b/i,
  unknown: /\b(don'?t know|no idea|not sure)\b/i,
  described: /\b(comes in|hits the crm|picks it up|assign|first|then|whoever)\b/i,
  tangible_given: /\b(profit|revenue|units|leads|hours|time|deals|retention|efficiency|gross|net|fewer|more)\b/i,
  no_goal: /\b(just exploring|just looking|curious|no goal|nothing specific)\b/i,
};

export interface NodeHint {
  branch: ScriptBranch;
  next_node_id: string | null;
  /** strong = category pattern matched; weak = only label-word overlap. */
  confidence: 'strong' | 'weak';
}

const STOP = new Set(['the', 'a', 'an', 'to', 'of', 'and', 'or', 'not', 'no', 'is', 'it', 'in', 'on', 'for', 'with', 'this', 'that', 'be', 'us', 'we', 'i', 'you']);

/**
 * The current node's branch that best matches the prospect's last turn, or null when nothing
 * matches (abstaining is the normal answer). Never picks `opt_out` unless its pattern matched.
 */
export function nextScriptNodeHint(node: Pick<ScriptNode, 'branches'>, prospectText: string | null | undefined): NodeHint | null {
  if (!prospectText || node.branches.length === 0) return null;
  const text = prospectText.toLowerCase();
  // 1) explicit category patterns, opt-out first (safety), then in branch order
  const optOut = node.branches.find((b) => b.answer_category === 'opt_out');
  if (optOut && CATEGORY_PATTERNS['opt_out']!.test(text)) return { branch: optOut, next_node_id: optOut.next_node_id, confidence: 'strong' };
  for (const b of node.branches) {
    const re = CATEGORY_PATTERNS[b.answer_category];
    if (re && b.answer_category !== 'opt_out' && re.test(text)) return { branch: b, next_node_id: b.next_node_id, confidence: 'strong' };
  }
  // 2) label-word overlap (weak)
  const words = new Set(text.split(/[^a-z']+/).filter((w) => w.length > 2 && !STOP.has(w)));
  let best: { b: ScriptBranch; score: number } | null = null;
  for (const b of node.branches) {
    if (b.answer_category === 'opt_out') continue;
    const labelWords = b.label.toLowerCase().split(/[^a-z']+/).filter((w) => w.length > 2 && !STOP.has(w));
    const score = labelWords.filter((w) => words.has(w)).length;
    if (score > 0 && (!best || score > best.score)) best = { b, score };
  }
  return best ? { branch: best.b, next_node_id: best.b.next_node_id, confidence: 'weak' } : null;
}
