/**
 * Concept lexicon (addendum §6): references are tagged with concept ids derived from their
 * RELATIONSHIP clause, and a later turn is mapped to the same concepts by topic words — so a
 * "robotic" concern retrieves a jazz-band comparison that contains no music words.
 *
 * Small and extensible. Every entry lists (a) relationship cues found in a reference and
 * (b) current-turn cues, plus the script stages where the concept is usually in play.
 */
import { escapeRegExp } from '../vocabulary/text';

export interface Concept {
  id: string;
  label: string;
  /** Words/phrases in a reference's relationship clause or quote that assign this concept. */
  relationship_cues: string[];
  /** Words/phrases in a CURRENT turn that raise this concept. */
  turn_cues: string[];
  /** Script stages where the concept is usually discussed (purposes the reference may serve). */
  stages: string[];
  /** The business question the concept asks; used to word a grounded suggestion. */
  question: string;
}

export const CONCEPTS: readonly Concept[] = [
  {
    id: 'coordination_vs_individuality',
    label: 'individual style vs shared structure',
    relationship_cues: ['everybody wants a solo', 'wants to play a solo', 'wants a solo', 'their own thing', 'own way', 'own tune', 'nobody follows', 'no arrangement', 'no menu', 'three chefs', 'too many cooks', 'coordination', 'in sync', 'out of sync', 'freelancing', 'each doing', 'own script', 'sound the same'],
    turn_cues: ['robotic', 'robot', 'sound the same', 'scripted', 'cookie-cutter', 'cookie cutter', 'canned', 'lose their personality', 'individual style', 'their own style', 'same process', 'shared process', 'standardize', 'standardise', 'one way of doing', 'consistency', 'consistent', 'on the same page', 'in sync'],
    stages: ['logical_certainty', 'pitch', 'concern', 'emotional_certainty'],
    question: 'the idea would be to keep individual style while giving everyone the same arrangement to follow. Which parts of the follow-up need that shared structure?',
  },
  {
    id: 'role_ownership',
    label: 'who owns which response',
    relationship_cues: ['nobody knows who', "nobody's sure who", 'who is defending', 'who is covering', 'no one owns', 'nobody owns', 'falls through', 'fell through', 'through the cracks', 'everyone assumes', 'someone else', 'nobody picks up', 'nobody follows it up', 'no one follows', 'who has the ball', 'dropped', 'nobody covers', 'nobody in position', 'out of position', 'nobody is sure who'],
    turn_cues: ['who owns', 'who is responsible', "who's responsible", 'responsible for', 'responsibility', 'responsibilities', 'covers', 'cover for', 'hand off', 'handoff', 'hand-off', 'first response', 'who answers', 'who picks up', 'who follows up', 'backup', 'when they are out', 'when someone is off', 'unavailable', 'accountable', 'ownership of the inbox', 'owns the inbox'],
    stages: ['logical_certainty', 'pitch', 'commitment', 'setter_transition'],
    question: 'who should own the first response, and who covers it when that person is unavailable?',
  },
  {
    id: 'effort_then_failure',
    label: 'effort followed by failure when it should have been ready',
    relationship_cues: ['collapse', 'collapsed', 'fell apart', 'fall apart', 'all that work', 'all afternoon', 'after all the', 'after months', 'came out of the oven', 'never took', 'never worked', 'flopped', 'crumbled', 'washed out', 'died on the vine', 'blew away', 'toppled'],
    turn_cues: ['rollout', 'roll out', 'roll-out', 'testing', 'test it', 'pilot', 'go live', 'go-live', 'launch', 'launching', 'switch over', 'cut over', 'cutover', 'implementation', 'implement', 'replace the current', 'replacing the current', 'before we replace', 'when it goes live', 'trial'],
    stages: ['emotional_certainty', 'pitch', 'concern', 'decision'],
    question: 'what failed when the actual customers started using it?',
  },
  {
    id: 'hidden_costs_commitment_lockin',
    label: 'unexpected charges after commitment, difficulty leaving',
    relationship_cues: ['extra charges', 'extra fees', 'hidden fees', 'surprise', 'after we signed', 'already committed', "couldn't leave", "couldn't easily leave", 'could not leave', 'had our website', 'held hostage', 'locked in', 'lock-in', 'ambushed', 'nickel', 'add-on', 'add on', 'renewal'],
    turn_cues: ['fees', 'fee', 'charges', 'charge', 'extra cost', 'extra costs', 'full cost', 'full costs', 'total cost', 'exit terms', 'all-in', 'exit', 'cancel', 'cancellation', 'termination', 'ownership', 'own the data', 'who owns the', 'lock-in', 'locked in', 'contract length', 'commitment', 'renewal', 'change order', 'change approval', 'account ownership', 'get out', 'leave'],
    stages: ['pitch', 'decision', 'concern', 'emotional_certainty'],
    question: 'which of those requirements — full costs, change approval, account ownership, exit terms — should we review before anything else?',
  },
  {
    id: 'setback',
    label: 'a setback and what it cost',
    relationship_cues: ['setback', 'as bad as', 'worst', 'hurt', 'cost us', 'lost', 'knocked', 'set us back', 'painful', 'disaster'],
    turn_cues: ['setback', 'set us back', 'what it cost', 'cost you', 'lost', 'losing', 'impact', 'consequence', 'damage', 'recover', 'recovery'],
    stages: ['logical_certainty', 'consequence', 'emotional_certainty'],
    question: 'what did that cost you, in practical terms?',
  },
  {
    id: 'priority_profit',
    label: 'profit as the stated priority (distinct from revenue)',
    relationship_cues: ['profit', 'margin', 'net', 'gross', 'bottom line'],
    turn_cues: ['margin', 'margins', 'net', 'gross', 'profit', 'profitable', 'bottom line', 'per unit', 'per-unit', 'revenue', 'top line', 'roi', 'return on'],
    stages: ['intent', 'future', 'pitch', 'decision', 'setter_transition'],
    question: 'when we talk numbers, which costs come off before you call it profit?',
  },
  {
    id: 'measurement',
    label: 'how a result is measured',
    relationship_cues: ['measure', 'measured', 'baseline', 'track', 'tracked', 'metric', 'the number', 'count'],
    turn_cues: ['measure', 'measured', 'measurement', 'baseline', 'track', 'tracking', 'metric', 'metrics', 'report', 'reporting', 'dashboard', 'how do you know', 'how would we know'],
    stages: ['setter_transition', 'pitch', 'future', 'logical_certainty'],
    question: 'what would we have to measure for you to trust the result?',
  },
  {
    id: 'capacity_pressure',
    label: 'too much arriving for the people available',
    relationship_cues: ['drowning', 'treading water', 'swamped', 'overwhelmed', 'boxed in', 'cornered', 'breathing room', 'no room', 'piling up', 'buried', 'keep up', 'can not keep up', "can't keep up", 'understaffed', 'short-staffed'],
    turn_cues: ['bandwidth', 'capacity', 'headcount', 'hire', 'hiring', 'staff', 'staffing', 'workload', 'keep up', 'overtime', 'after hours', 'evenings', 'weekends', 'volume', 'too many', 'piling up', 'breathing room'],
    stages: ['logical_certainty', 'future', 'pitch', 'emotional_certainty'],
    question: 'what would need to come off the team for that pressure to ease?',
  },
  {
    id: 'reactive_vs_planned',
    label: 'always reacting instead of planning ahead',
    relationship_cues: ['moves behind', 'behind the customer', 'steps behind', 'catching up', 'catch up', 'reacting', 'react to', 'after the fact', 'too late', 'always behind', 'chasing'],
    turn_cues: ['proactive', 'ahead of', 'anticipate', 'plan ahead', 'reactive', 'catch up', 'catching up', 'before they', 'get in front', 'stay ahead', 'behind'],
    stages: ['logical_certainty', 'future', 'pitch', 'consequence'],
    question: 'what would it take to be a move ahead of the customer instead of behind them?',
  },
  {
    id: 'foundation_before_build',
    label: 'sequence: groundwork before the visible work',
    relationship_cues: ['foundation', 'before the walls', 'before you frame', 'before the roof', 'groundwork', 'soil', 'roots', 'prep', 'before planting', 'before you plant', 'moves ahead', 'opening', 'set up before', 'in the right order', 'wrong order', 'skipped'],
    turn_cues: ['first step', 'where do we start', 'sequence', 'order', 'prerequisite', 'prerequisites', 'before we', 'set up', 'setup', 'groundwork', 'foundation', 'phase', 'phases', 'plan'],
    stages: ['pitch', 'decision', 'future', 'logical_certainty'],
    question: 'what has to be in place first, before the visible part is worth building?',
  },
  {
    id: 'ongoing_maintenance',
    label: 'a result that needs tending to keep',
    relationship_cues: ['weeds', 'weeding', 'watering', 'never water', 'water it', 'pruning', 'comes back', 'grows back', 'keep it', 'every week', 'every season', 'tending', 'maintain', 'maintenance', 'left alone', 'neglect'],
    turn_cues: ['maintain', 'maintenance', 'keep it going', 'ongoing', 'after launch', 'after go-live', 'who keeps', 'upkeep', 'support', 'month to month', 'over time', 'drift', 'slips back'],
    stages: ['pitch', 'concern', 'future', 'upsell'],
    question: 'what would have to happen every week for the result to stay, and who does it?',
  },
];

export const CONCEPT_BY_ID: ReadonlyMap<string, Concept> = new Map(CONCEPTS.map((c) => [c.id, c]));

function hasCue(text: string, cue: string): boolean {
  return new RegExp(`(?<![a-z])${escapeRegExp(cue.toLowerCase())}(?![a-z])`).test(text.toLowerCase());
}

/** Concept ids raised by a reference's relationship clause and supporting quote. */
export function conceptsForRelationship(relationship: string, quote = ''): string[] {
  const text = `${relationship} ${quote}`;
  return CONCEPTS.filter((c) => c.relationship_cues.some((cue) => hasCue(text, cue))).map((c) => c.id);
}

/** Concept ids raised by a CURRENT turn (topic words only; the reference's own nouns are not needed). */
export function conceptsForTurn(text: string): string[] {
  return CONCEPTS.filter((c) => c.turn_cues.some((cue) => hasCue(text, cue))).map((c) => c.id);
}

/** Stages where the concept is usually discussed — the reference's candidate purposes. */
export function stagesForConcepts(conceptIds: readonly string[]): string[] {
  const out = new Set<string>();
  for (const id of conceptIds) for (const s of CONCEPT_BY_ID.get(id)?.stages ?? []) out.add(s);
  return Array.from(out);
}
