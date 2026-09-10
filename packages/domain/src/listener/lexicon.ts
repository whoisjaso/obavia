/**
 * Small open lexicons for the rule-based listener. None of these is a closed detector: the
 * extractor also accepts any "felt <participle>" construction and any "like a/an X where Y"
 * comparison in an unseen domain. Lists only sharpen labels, valence and priority.
 */
import { ANALOGY_DOMAINS } from '../vocabulary/extract';
import { escapeRegExp } from '../vocabulary/text';

export interface EmotionalEntry {
  polarity: 'positive' | 'negative' | 'mixed';
  /** Optional cue for the clarification question. */
  clarify?: string;
}

/** Emotionally specific words worth preserving verbatim (open; extended by the "felt X" rule). */
export const EMOTIONAL_LEXICON: Record<string, EmotionalEntry> = {
  ambushed: { polarity: 'negative', clarify: "was it that the charges weren't disclosed, or that you were already committed before they appeared?" },
  blindsided: { polarity: 'negative', clarify: 'what was it that you had no way of seeing coming?' },
  'boxed in': { polarity: 'negative', clarify: 'what closed the options off?' },
  cornered: { polarity: 'negative', clarify: 'what left you without a way out?' },
  trapped: { polarity: 'negative', clarify: 'what made leaving difficult?' },
  'locked in': { polarity: 'negative', clarify: 'what part of the arrangement made leaving difficult?' },
  drowning: { polarity: 'negative', clarify: 'what was piling up faster than it could be handled?' },
  'treading water': { polarity: 'negative', clarify: 'what kept the effort from turning into progress?' },
  swamped: { polarity: 'negative', clarify: 'what was arriving faster than it could be handled?' },
  overwhelmed: { polarity: 'negative', clarify: 'what part became too much?' },
  burned: { polarity: 'negative', clarify: 'what happened that you do not want repeated?' },
  'nickel-and-dimed': { polarity: 'negative', clarify: 'which charges felt like they should have been included?' },
  'nickel and dimed': { polarity: 'negative', clarify: 'which charges felt like they should have been included?' },
  abandoned: { polarity: 'negative', clarify: 'at what point did the support stop?' },
  'left holding the bag': { polarity: 'negative', clarify: 'what were you left responsible for?' },
  'breathing room': { polarity: 'positive', clarify: 'what would you do with that room?' },
  relieved: { polarity: 'positive' },
  'in control': { polarity: 'positive' },
  'on top of it': { polarity: 'positive' },
  steady: { polarity: 'positive' },
};

/** Words that make a comparison intensely painful (injury, death, illness, violence, grief). */
export const PAINFUL_WORDS = [
  'breaking your leg',
  'broke my leg',
  'broken leg',
  'broken',
  'injury',
  'injured',
  'concussion',
  'surgery',
  'hospital',
  'died',
  'death',
  'dying',
  'funeral',
  'grief',
  'cancer',
  'illness',
  'sick',
  'stroke',
  'heart attack',
  'car crash',
  'crash',
  'wreck',
  'fire',
  'burned down',
  'flood',
  'bleeding',
  'stabbed',
  'shot',
  'assault',
  'divorce',
  'lost my',
];

/** Commonplace idioms: a domain word without a comparison relationship (addendum §2, test 11). */
export const IDIOMS = [
  'touch base',
  'ballpark',
  'ballpark figure',
  'home run',
  'hit it out of the park',
  'slam dunk',
  'drop the ball',
  'curveball',
  'step up to the plate',
  'par for the course',
  'move the goalposts',
  'game plan',
  'full-court press',
  'in the same ballpark',
  'right off the bat',
  'kick off',
  'kickoff',
  'level playing field',
  'back to square one',
  'on the back burner',
  'recipe for disaster',
  'checkmate',
  'moving the needle',
  'low-hanging fruit',
  'boil the ocean',
  'a lot on my plate',
  'on my plate',
  'too many irons in the fire',
];

/** Recognisable analogy domains (open — unseen domains still extract; this only names them). */
export const DOMAIN_WORDS: Record<string, string[]> = {
  ...ANALOGY_DOMAINS,
  hockey: [...(ANALOGY_DOMAINS['hockey'] ?? []), 'hockey team', 'defending', 'defenseman'],
  jazz: [...(ANALOGY_DOMAINS['jazz'] ?? []), 'jazz band', 'solo', 'arrangement'],
  cooking: [...(ANALOGY_DOMAINS['cooking'] ?? []), 'baking', 'bake', 'cake', 'stew', 'simmer', 'dinner service', 'sous chef', 'line cook'],
  gardening: [...(ANALOGY_DOMAINS['gardening'] ?? []), 'garden', 'weeds', 'weeding', 'planting', 'watering', 'soil', 'roots', 'greenhouse', 'tomatoes'],
  chess: [...(ANALOGY_DOMAINS['chess'] ?? []), 'chessboard', 'pawn', 'pawns', 'queen', 'moves ahead', 'endgame'],
  construction: [...(ANALOGY_DOMAINS['construction'] ?? []), 'foundation', 'pouring a foundation', 'framing a house', 'drywall', 'contractor', 'subcontractors', 'building a house'],
  sailing: ['sailing', 'sailboat', 'crew', 'rudder', 'anchor', 'tacking'],
  aviation: ['pilot', 'cockpit', 'autopilot', 'runway', 'takeoff'],
  medicine: ['triage', 'emergency room'],
  orchestra: ['orchestra', 'conductor', 'sheet music'],
  theater: ['theater', 'theatre', 'understudy', 'rehearsal', 'stage crew'],
  military: ['platoon', 'squad', 'foxhole', 'battlefield'],
  farming: ['farm', 'harvest', 'planting season', 'crop', 'cattle'],
  'car repair': ['mechanic', 'tune-up', 'check engine light'],
  weather: ['storm', 'hurricane', 'drought'],
  plumbing: ['burst pipe', 'plumber', 'faucet'],
  relay: ['relay race', 'baton'],
  monster: ['frankenstein'],
};

export function domainFor(text: string): string | undefined {
  const lower = text.toLowerCase();
  let best: { domain: string; length: number } | undefined;
  for (const [domain, words] of Object.entries(DOMAIN_WORDS)) {
    for (const w of words) {
      const re = new RegExp(`(?<![a-z])${escapeRegExp(w.toLowerCase())}(?![a-z])`);
      if (re.test(lower) && (!best || w.length > best.length)) best = { domain, length: w.length };
    }
  }
  return best?.domain;
}

export function domainWordIn(text: string, domain: string): string | undefined {
  const lower = text.toLowerCase();
  const words = [...(DOMAIN_WORDS[domain] ?? []), domain].sort((a, b) => b.length - a.length);
  for (const w of words) {
    const re = new RegExp(`(?<![a-z])${escapeRegExp(w.toLowerCase())}(?![a-z])`);
    if (re.test(lower)) return w;
  }
  return undefined;
}

export function isPainful(text: string): boolean {
  const lower = text.toLowerCase();
  return PAINFUL_WORDS.some((w) => new RegExp(`(?<![a-z])${escapeRegExp(w)}(?![a-z])`).test(lower));
}

export function containsIdiom(text: string): string | undefined {
  const lower = text.toLowerCase();
  return IDIOMS.find((w) => new RegExp(`(?<![a-z])${escapeRegExp(w)}(?![a-z])`).test(lower));
}
