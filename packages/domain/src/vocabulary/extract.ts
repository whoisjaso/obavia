/**
 * Candidate phrase extraction WITHOUT any model (brief §7, addendum v3).
 *
 * Rules, all plain text patterns on finalized (and, provisionally, interim) turns:
 *  - quoted terms, emphasis lead-ins ("what matters is", "the main thing is", "my goal is"),
 *  - "X, not Y" contrast → keep X, record that Y was rejected ("profit, not revenue", "net, not gross"),
 *  - negation ("I don't care about revenue") → rejected term,
 *  - prospect-supplied definitions ("gratification means …", "Satisfaction is a survey score"),
 *  - repeated domain n-grams per speaker, capitalized labels after "the" (the Prophet),
 *  - quoted-other-person sentences ("another owner told me his goal is …") → attribution quoted_other,
 *  - analogy domains (basketball …) → tentative DecisionLens "basketball analogy preferred/observed".
 *
 * A transcript revision that removes a term's defining text invalidates it (profit → prophet).
 */
import type { SpeakerRole } from '../schemas/transcript';
import type { DecisionLens, MeaningStatus, VocabularyEvent } from '../schemas/vocabulary';
import type { NormalizedTranscript, NormalizedTurn } from './normalize';
import { classifyProvenance, findOccurrences, type Occurrence } from './provenance';
import { STOPWORDS, normalizeKey, slug, splitSentences, wordCount } from './text';

export type SeedReason = 'quoted' | 'lead_in' | 'contrast' | 'negated' | 'defined' | 'repeated' | 'capitalized' | 'problem' | 'proposed' | 'affirmed';

export interface Seed {
  key: string;
  exact_text: string;
  reason: SeedReason;
  turn: NormalizedTurn;
  /** Absolute span within the turn text. */
  start: number;
  end: number;
  /** For contrast seeds: the rejected comparison (normalized key). */
  rejects?: string;
  /** Prospect-supplied definition. */
  meaning?: string;
  quoted_other?: boolean;
  /** The seed itself is the rejected term (negation). */
  rejected?: boolean;
  /** Lead-in seeds are explicit significance markers. */
  emphasis?: boolean;
}

const WORD = "[A-Za-z][A-Za-z'-]*";
const TERM_1_2 = `${WORD}(?:\\s${WORD})?`;

const CONTRAST = new RegExp(
  `(?:^|[,;—-]\\s*|\\b(?:is|it's|its|about|want|wants|on|need|needs)\\s+)(${TERM_1_2}),\\s*not\\s+((?:the\\s+)?${TERM_1_2})(?=\\s*[.,;!?—-]|$)`,
  'gi',
);
const NEGATION_VERB = new RegExp(
  `\\b(?:I|we)\\s+(?:don't|do not|never|couldn't|can't|won't)\\s+(?:care about|chase|want|need|measure|look at|talk about|track|worry about)\\s+(?:the\\s+)?(${TERM_1_2})(?=\\s*[.,;!?—-]|$|\\s+and\\b)`,
  'gi',
);
const NEGATION_ABOUT = new RegExp(
  `\\b(?:it's|it is|this is|that's)\\s+not(?:\\s+really|\\s+just|\\s+only)?\\s+about\\s+(?:the\\s+)?(${TERM_1_2})(?=\\s*[.,;!?—-]|$|\\s+(?:and|for)\\b)`,
  'gi',
);
const LEAD_IN = new RegExp(
  `\\b(what matters(?:\\s+(?:to me|to us))?(?:\\s+most)?\\s+is|what I care about is|the main thing(?:\\s+is|\\s*[—-])|what I mean is|it comes down to|(?:my|his|her|their|our) goal is|the thing (?:we're|I'm|we are|I am) after is|what (?:I'm|we're) after is|I'd put it as|call it|the whole game is|the number that matters is|the problem(?:\\s+is|\\s*[—-])|what's killing us is)\\s+(?:the\\s+)?(${WORD}(?:\\s${WORD}){0,5})(?=\\s*[.,;!?—-]|$|\\s+(?:and|for|if)\\b)`,
  'gi',
);
const QUOTED = /[“"]([^”"]{2,60})[”"]/g;
const DEFINED_MEANS = new RegExp(`\\b((?:${WORD}\\s){0,2}${WORD})\\s+means\\s+(.+?)(?=[.;!?]|$)`, 'gi');
/** "Satisfaction is a survey score" — the predicate must read as a definition, not "X is really the whole game". */
const DEFINED_IS = /^([A-Z][a-z]{4,})\s+is\s+((?:a|an|the|me|my|our|us|when|what|how|about|where)\b.+?)(?=[.;!?]|$)/;
/** Representative proposes a label and asks for confirmation: "… is efficiency — is that the word?" */
const PROPOSED = new RegExp(`\\b(?:is|would be|call it|sounds like)\\s+(${TERM_1_2})\\s*[—,-]?\\s*(?:is that the word|is that right|is that fair|right\\?|fair\\?)`, 'gi');
/** Prospect affirms a term by name: "Yes, efficiency." */
const AFFIRMED = new RegExp(`^(?:yes|yeah|yep|exactly|right|correct)[,.!]?\\s+(${TERM_1_2})(?=[.!,;]|$)`, 'i');
const CAPITALIZED_AFTER_THE = /\b[Tt]he\s+([A-Z][a-z]{3,})\b/g;
const QUOTED_OTHER =
  /\b(?:my (?:buddy|friend|partner|brother|sister|old boss|cousin|GM|accountant|consultant)|another (?:owner|dealer|guy|store|GM|manager)|a (?:friend|buddy|guy|colleague|consultant|vendor)|some(?:one|body)|the last (?:guy|vendor|company))\b[^.!?]*?\b(?:says|said|told me|tells me|thinks|swears|kept saying|goal is|wants)\b/i;
const EMPHASIS_MARKER =
  /\b(?:really|honestly|the main thing|what I mean is|to be clear|let me be clear|the whole game|what I care about|what matters|frankly|call it)\b/i;
const DEFINED_IS_STOP = new Set(
  'there this that which where everyone nobody something anything honestly maybe sure everything someone here what these those their about after before whoever whatever monday tuesday wednesday thursday friday saturday sunday'.split(
    ' ',
  ),
);

const OPT_OUT =
  /\b(?:take me off (?:your|the) list|remove (?:me|this number|us) (?:from|now)|do not call|don't call (?:me|this number|us|here|again)|stop calling|please stop|put (?:me|us) on your do[- ]not[- ]call)\b/i;

/** Analogy domains — examples, not a closed taxonomy. Labels are observations, never archetypes. */
export const ANALOGY_DOMAINS: Record<string, string[]> = {
  basketball: ['basketball', 'rebound', 'point guard', 'fast break', 'pick and roll', 'free throw', 'jump shot', 'layup', 'dunk'],
  hockey: ['hockey', 'puck', 'power play', 'face-off', 'faceoff', 'slap shot', 'goalie'],
  football: ['football', 'quarterback', 'touchdown', 'end zone', 'hail mary', 'fumble'],
  baseball: ['baseball', 'home run', 'curveball', 'bullpen', 'batting order'],
  golf: ['golf', 'fairway', 'putt', 'tee shot'],
  jazz: ['jazz', 'jam session', 'improv', 'everybody wants a solo'],
  cooking: ['soufflé', 'souffle', 'recipe', 'kitchen', 'chef', 'oven'],
  chess: ['chess', 'checkmate', 'gambit', 'opening move'],
  gardening: ['gardening', 'seedling', 'pruning', 'harvest'],
  construction: ['blueprint', 'scaffolding', 'load-bearing', 'framing'],
  fishing: ['fishing', 'bait', 'casting a line'],
};

function matchAllIn(re: RegExp, text: string): RegExpExecArray[] {
  return Array.from(text.matchAll(re));
}

/** Seeds from one turn's text. Both speakers are seeded; provenance decides what they mean. */
export function seedTurn(turn: NormalizedTurn): Seed[] {
  const seeds: Seed[] = [];
  const isProspect = turn.speaker_role === 'prospect';
  for (const sentence of splitSentences(turn.text)) {
    const quotedOther = isProspect && QUOTED_OTHER.test(sentence.text);
    const push = (partial: Omit<Seed, 'turn' | 'quoted_other'> & { quoted_other?: boolean }) => {
      seeds.push({ ...partial, turn, quoted_other: partial.quoted_other ?? quotedOther });
    };
    for (const m of matchAllIn(CONTRAST, sentence.text)) {
      const x = m[1]!;
      const y = m[2]!;
      const xStart = sentence.offset + m.index + m[0].indexOf(x);
      push({ key: normalizeKey(x), exact_text: x, reason: 'contrast', start: xStart, end: xStart + x.length, rejects: normalizeKey(y) });
      const yStart = sentence.offset + m.index + m[0].lastIndexOf(y);
      push({ key: normalizeKey(y), exact_text: y.replace(/^the\s+/i, ''), reason: 'negated', start: yStart, end: yStart + y.length, rejected: true });
    }
    for (const re of [NEGATION_VERB, NEGATION_ABOUT]) {
      for (const m of matchAllIn(re, sentence.text)) {
        const y = m[1]!;
        const yStart = sentence.offset + m.index + m[0].lastIndexOf(y);
        push({ key: normalizeKey(y), exact_text: y, reason: 'negated', start: yStart, end: yStart + y.length, rejected: true });
      }
    }
    for (const m of matchAllIn(LEAD_IN, sentence.text)) {
      const x = m[2]!;
      const xStart = sentence.offset + m.index + m[0].lastIndexOf(x);
      const isProblem = /^the problem/i.test(m[1]!);
      push({ key: normalizeKey(x), exact_text: x, reason: isProblem ? 'problem' : 'lead_in', start: xStart, end: xStart + x.length, emphasis: !isProblem });
    }
    for (const m of matchAllIn(QUOTED, sentence.text)) {
      const x = m[1]!;
      const xStart = sentence.offset + m.index + 1;
      push({ key: normalizeKey(x), exact_text: x, reason: 'quoted', start: xStart, end: xStart + x.length });
    }
    if (!isProspect) {
      for (const m of matchAllIn(PROPOSED, sentence.text)) {
        const x = m[1]!;
        const xStart = sentence.offset + m.index + m[0].indexOf(x);
        push({ key: normalizeKey(x), exact_text: x, reason: 'proposed', start: xStart, end: xStart + x.length });
      }
    }
    if (isProspect) {
      const aff = AFFIRMED.exec(sentence.text);
      if (aff && !STOPWORDS.has(aff[1]!.toLowerCase())) {
        const x = aff[1]!;
        const xStart = sentence.offset + aff[0].lastIndexOf(x);
        push({ key: normalizeKey(x), exact_text: x, reason: 'affirmed', start: xStart, end: xStart + x.length });
      }
      for (const m of matchAllIn(DEFINED_MEANS, sentence.text)) {
        const termSpan = m[1]!;
        const meaning = m[2]!.trim();
        const xStart = sentence.offset + m.index;
        push({ key: normalizeKey(termSpan), exact_text: termSpan, reason: 'defined', start: xStart, end: xStart + termSpan.length, meaning });
      }
      const isDef = DEFINED_IS.exec(sentence.text);
      if (isDef && !DEFINED_IS_STOP.has(isDef[1]!.toLowerCase()) && !STOPWORDS.has(isDef[1]!.toLowerCase())) {
        const x = isDef[1]!;
        push({ key: normalizeKey(x), exact_text: x, reason: 'defined', start: sentence.offset, end: sentence.offset + x.length, meaning: isDef[2]!.trim() });
      }
    }
    for (const m of matchAllIn(CAPITALIZED_AFTER_THE, sentence.text)) {
      const x = m[1]!;
      if (DEFINED_IS_STOP.has(x.toLowerCase())) continue;
      const xStart = sentence.offset + m.index + m[0].indexOf(x);
      push({ key: normalizeKey(x), exact_text: x, reason: 'capitalized', start: xStart, end: xStart + x.length });
    }
  }
  return seeds;
}

function tokenize(text: string): { token: string; start: number; end: number }[] {
  const out: { token: string; start: number; end: number }[] = [];
  const re = /[A-Za-z][A-Za-z'-]*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push({ token: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length });
  return out;
}

/** Repeated 1–3 grams per speaker over FINAL turns; sub-phrases never seen on their own are suppressed. */
export function repeatedNgramSeeds(turns: readonly NormalizedTurn[]): Seed[] {
  const seeds: Seed[] = [];
  for (const role of ['prospect', 'representative'] as const) {
    const counts = new Map<string, { count: number; first: { turn: NormalizedTurn; start: number; end: number; text: string } }>();
    for (const turn of turns) {
      if (turn.speaker_role !== role || !turn.is_final) continue;
      for (const sentence of splitSentences(turn.text)) {
        const toks = tokenize(sentence.text);
        for (let n = 1; n <= 3; n += 1) {
          for (let i = 0; i + n <= toks.length; i += 1) {
            const gram = toks.slice(i, i + n);
            const firstTok = gram[0]!;
            const lastTok = gram[gram.length - 1]!;
            if (STOPWORDS.has(firstTok.token) || STOPWORDS.has(lastTok.token)) continue;
            if (n === 1 && firstTok.token.length < 4) continue;
            const key = gram.map((g) => g.token).join(' ');
            const start = sentence.offset + firstTok.start;
            const end = sentence.offset + lastTok.end;
            const entry = counts.get(key);
            if (entry) entry.count += 1;
            else counts.set(key, { count: 1, first: { turn, start, end, text: turn.text.slice(start, end) } });
          }
        }
      }
    }
    const candidates = Array.from(counts.entries()).filter(([key, v]) => (wordCount(key) === 1 ? v.count >= 3 : v.count >= 2));
    for (const [key, v] of candidates) {
      const containedByLonger = candidates.some(([other, ov]) => other !== key && other.includes(key) && wordCount(other) > wordCount(key) && ov.count >= v.count);
      if (containedByLonger) continue;
      seeds.push({ key, exact_text: v.first.text, reason: 'repeated', turn: v.first.turn, start: v.first.start, end: v.first.end });
    }
  }
  return seeds;
}

export interface ExtractionOptions {
  /** Event ids the representative has clarified (invalidated → asked). */
  clarified?: readonly string[];
}

export interface Extraction {
  events: VocabularyEvent[];
  lenses: DecisionLens[];
}

interface Build {
  key: string;
  seeds: Seed[];
}

function sentenceAround(turn: NormalizedTurn, at: number): string {
  for (const s of splitSentences(turn.text)) {
    if (at >= s.offset && at <= s.offset + s.text.length) return s.text;
  }
  return turn.text;
}

function cueFor(ev: Pick<VocabularyEvent, 'exact_text' | 'correction_or_negation' | 'meaning_status' | 'provenance' | 'attribution' | 'rejected_by' | 'explicit_emphasis' | 'normalized_key'>): string | undefined {
  if (ev.meaning_status === 'invalidated') return 'clarify: the transcript revised this word — ask what they meant rather than assume a meaning';
  if (ev.rejected_by) return 'they rejected this comparison — do not count it as their priority';
  if (ev.attribution === 'quoted_other') return "someone else's goal — do not treat it as this prospect's priority";
  if (ev.provenance === 'seller_only') return 'seller-only term — never present it as their words';
  if (ev.correction_or_negation) {
    const pair = `${ev.normalized_key ?? ''} ${ev.correction_or_negation.rejects}`;
    if (/\b(net|gross)\b/.test(pair)) return 'ask what costs are included before any calculation';
    return `keep their word "${ev.exact_text}" — do not substitute "${ev.correction_or_negation.rejects}"; ask what "${ev.exact_text}" includes before calculating`;
  }
  if (ev.meaning_status === 'explained' || ev.meaning_status === 'confirmed') return `use their word "${ev.exact_text}" with their own definition — no synonym`;
  if (ev.provenance === 'prospect_said' && ev.explicit_emphasis) return `ask what "${ev.exact_text}" means to them before using any synonym`;
  return undefined;
}

function buildEvents(turns: readonly NormalizedTurn[], callId: string): VocabularyEvent[] {
  const builds = new Map<string, Build>();
  const allSeeds: Seed[] = [...turns.flatMap(seedTurn), ...repeatedNgramSeeds(turns)];
  for (const seed of allSeeds) {
    if (!seed.key || seed.key.length < 2) continue;
    const b = builds.get(seed.key) ?? { key: seed.key, seeds: [] };
    b.seeds.push(seed);
    builds.set(seed.key, b);
  }
  // Definitions may name a longer span ("Hitting the Prophet means …") — attach them to the contained key.
  for (const b of builds.values()) {
    for (const s of b.seeds) {
      if (s.reason !== 'defined' || !s.meaning) continue;
      const target = Array.from(builds.keys())
        .filter((k) => k !== b.key && s.key.split(' ').join(' ').includes(k))
        .sort((x, y) => y.length - x.length)[0];
      if (target && !builds.get(b.key)!.seeds.some((o) => o.reason !== 'defined')) {
        builds.get(target)!.seeds.push({ ...s, key: target });
        b.seeds = b.seeds.filter((o) => o !== s);
      }
    }
  }
  // Occurrences per key, then drop repetition-only sub-phrases that never stand on their own
  // ("staff" inside "staff time", "leads" mostly inside "leads going cold").
  const occurrencesByKey = new Map<string, Occurrence[]>();
  for (const b of builds.values()) occurrencesByKey.set(b.key, findOccurrences(b.key, turns));
  for (const b of Array.from(builds.values())) {
    if (!b.seeds.every((s) => s.reason === 'repeated')) continue;
    const own = occurrencesByKey.get(b.key) ?? [];
    const longer = Array.from(builds.keys()).filter((k) => k !== b.key && k.length > b.key.length && k.includes(b.key));
    const independent = own.filter(
      (o) => !longer.some((k) => (occurrencesByKey.get(k) ?? []).some((lo) => lo.turn_id === o.turn_id && lo.start <= o.start && lo.end >= o.end)),
    );
    const threshold = wordCount(b.key) === 1 ? 3 : 2;
    if (independent.filter((o) => o.is_final).length < threshold) builds.delete(b.key);
  }
  const events: VocabularyEvent[] = [];
  for (const b of builds.values()) {
    if (b.seeds.length === 0) continue;
    const occurrences = occurrencesByKey.get(b.key) ?? [];
    if (occurrences.length === 0) continue;
    const decision = classifyProvenance(b.key, occurrences, turns);
    const finals = occurrences.filter((o) => o.is_final);
    const anchor: Occurrence = finals[0] ?? occurrences[0]!;
    const originSeed = b.seeds.find((s) => s.turn.speaker_role === decision.source_role && s.reason !== 'negated') ?? b.seeds[0]!;
    const prospectOcc = finals.filter((o) => o.speaker_role === 'prospect');
    const repOcc = finals.filter((o) => o.speaker_role === 'representative');
    const contrast = b.seeds.find((s) => s.reason === 'contrast' && s.turn.speaker_role === 'prospect');
    const negated = b.seeds.filter((s) => s.rejected && s.turn.speaker_role === 'prospect');
    const rejectingSeed = allSeeds.find((s) => s.reason === 'contrast' && s.rejects === b.key && s.turn.speaker_role === 'prospect');
    const definition = b.seeds.find((s) => s.reason === 'defined' && s.meaning && s.turn.speaker_role === 'prospect');
    const emphasisSeed = b.seeds.some((s) => s.emphasis && s.turn.speaker_role === 'prospect');
    const emphasisMarker = prospectOcc.some((o) => {
      const turn = turns.find((t) => t.utterance_id === o.turn_id);
      return turn ? EMPHASIS_MARKER.test(sentenceAround(turn, o.start)) : false;
    });
    const prospectSeeds = b.seeds.filter((s) => s.turn.speaker_role === 'prospect');
    const quotedOther = prospectSeeds.length > 0 && prospectSeeds.every((s) => s.quoted_other);
    const rejectedBy = rejectingSeed ? rejectingSeed.key : negated.length > 0 ? 'negation' : undefined;
    const anchorTurn = turns.find((t) => t.utterance_id === anchor.turn_id)!;
    const meaningStatus: MeaningStatus = definition ? 'explained' : 'unknown';
    const exact = originSeed.exact_text.replace(/^(?:the|a|an)\s+/i, '');
    const ev: VocabularyEvent = {
      id: `${callId}:${slug(b.key)}`,
      call_id: callId,
      exact_text: exact,
      speaker_role: decision.source_role,
      turn_id: anchor.turn_id,
      span: { start: anchor.start, end: anchor.end },
      revision: anchorTurn.revision,
      confidence: anchorTurn.confidence_if_provided ?? undefined,
      stability: finals.length > 0 ? 'final' : 'interim',
      meaning: definition?.meaning,
      meaning_status: meaningStatus,
      first_seen_turn: occurrences[0]!.turn_id,
      last_seen_turn: occurrences[occurrences.length - 1]!.turn_id,
      repetition_count: Math.max(1, finals.length),
      explicit_emphasis: emphasisSeed || emphasisMarker,
      correction_or_negation: contrast ? { rejects: contrast.rejects!, note: `explicit contrast: "${contrast.exact_text}, not ${contrast.rejects}"` } : undefined,
      provenance: decision.provenance,
      source_role: decision.source_role,
      pinned: false,
      attribution: quotedOther ? 'quoted_other' : 'self',
      normalized_key: b.key,
      repetition_by_speaker: { representative: repOcc.length, prospect: prospectOcc.length },
      rejected_by: rejectedBy,
      rank_reasons: [decision.reason],
    };
    ev.cue = cueFor(ev);
    events.push(ev);
  }
  return events.sort((a, b) => {
    const ia = turns.find((t) => t.utterance_id === a.first_seen_turn)?.display_index ?? 0;
    const ib = turns.find((t) => t.utterance_id === b.first_seen_turn)?.display_index ?? 0;
    return ia - ib || a.span.start - b.span.start;
  });
}

/** Tentative analogy observations from prospect FINAL turns. Never an archetype or a personality label. */
export function observeAnalogies(turns: readonly NormalizedTurn[]): DecisionLens[] {
  const hits = new Map<string, Set<string>>();
  for (const turn of turns) {
    if (turn.speaker_role !== 'prospect' || !turn.is_final) continue;
    for (const sentence of splitSentences(turn.text)) {
      const lower = sentence.text.toLowerCase();
      for (const [domain, words] of Object.entries(ANALOGY_DOMAINS)) {
        if (words.some((w) => new RegExp(`(?<![a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`).test(lower))) {
          (hits.get(domain) ?? hits.set(domain, new Set()).get(domain)!).add(turn.utterance_id);
        }
      }
    }
  }
  return Array.from(hits.entries()).map(([domain, ids]) => ({
    label: `${domain} analogy preferred/observed`,
    supporting_event_ids: Array.from(ids),
    counterevidence: [],
    evidence_strength: ids.size >= 3 ? 'strong' : ids.size === 2 ? 'moderate' : 'weak',
    status: 'hypothesis',
  }));
}

export interface OptOut {
  turn_id: string;
  text: string;
}

/** Scenario 40: a clear request to stop. Detection only — the representative must stop immediately. */
export function detectOptOut(turns: readonly NormalizedTurn[]): OptOut | null {
  for (const t of turns) {
    if (t.speaker_role !== 'prospect' || !t.is_final) continue;
    if (OPT_OUT.test(t.text)) return { turn_id: t.utterance_id, text: t.text };
  }
  return null;
}

/** Full extraction over a normalized transcript, including revision-driven invalidation. */
export function extractVocabulary(normalized: NormalizedTranscript, callId: string, options: ExtractionOptions = {}): Extraction {
  const latest = buildEvents(normalized.turns, callId);
  const events = [...latest];
  if (normalized.revisions.length > 0) {
    const previous = buildEvents(normalized.previous_turns, callId);
    const latestKeys = new Set(latest.map((e) => e.normalized_key));
    for (const old of previous) {
      if (latestKeys.has(old.normalized_key) || old.speaker_role !== 'prospect') continue;
      const change = normalized.revisions.find((r) => r.utterance_id === old.turn_id);
      if (!change) continue;
      const nowReads = latest.filter((e) => e.turn_id === change.utterance_id && e.speaker_role === 'prospect').map((e) => e.exact_text);
      const invalidated: VocabularyEvent = {
        ...old,
        id: old.id,
        meaning: undefined,
        meaning_status: 'invalidated',
        invalidation: {
          utterance_id: change.utterance_id,
          from_revision: change.from_revision,
          to_revision: change.to_revision,
          now_reads: nowReads.length > 0 ? nowReads.join(', ') : change.to_text,
        },
        rank_reasons: [...(old.rank_reasons ?? []), `revision ${change.from_revision}→${change.to_revision} removed this word`],
      };
      invalidated.cue = cueFor(invalidated);
      events.push(invalidated);
    }
  }
  const clarified = new Set(options.clarified ?? []);
  const withClarify = events.map((e) => (clarified.has(e.id) && e.meaning_status === 'invalidated' ? clarifyEvent(e) : e));
  return { events: withClarify, lenses: observeAnalogies(normalized.turns) };
}

/** Representative asked what the revised word meant: the event re-enters as "asked", never with an invented meaning. */
export function clarifyEvent(ev: VocabularyEvent): VocabularyEvent {
  if (ev.meaning_status !== 'invalidated') return ev;
  return {
    ...ev,
    meaning_status: 'asked',
    cue: 'clarification requested — record their answer as the meaning; nothing is assumed',
    rank_reasons: [...(ev.rank_reasons ?? []), 'clarified by representative'],
  };
}

export interface MeaningProposal {
  text: string;
  by: SpeakerRole | 'model' | 'rep_correction';
}

/**
 * Scenario 33: a prospect-explained meaning cannot be overwritten by a seller/model synonym.
 * Only the prospect (a new definition) or an explicit human correction (kept as `user_edits`) can change it.
 */
export function applyMeaning(ev: VocabularyEvent, proposal: MeaningProposal, now = new Date().toISOString()): { event: VocabularyEvent; applied: boolean; reason: string } {
  const locked = ev.meaning_status === 'explained' || ev.meaning_status === 'confirmed';
  if (proposal.by === 'rep_correction') {
    return {
      event: { ...ev, user_edits: { ...(ev.user_edits ?? {}), meaning: proposal.text, edited_at: now } },
      applied: true,
      reason: 'human correction recorded beside the original meaning',
    };
  }
  if (proposal.by === 'prospect') {
    return { event: { ...ev, meaning: proposal.text, meaning_status: 'explained' }, applied: true, reason: 'prospect supplied the meaning' };
  }
  if (locked) {
    return { event: ev, applied: false, reason: `"${ev.exact_text}" keeps the prospect's own definition; a ${proposal.by} synonym cannot overwrite it` };
  }
  return { event: ev, applied: false, reason: 'meaning unknown — ask the prospect rather than assume a synonym' };
}
