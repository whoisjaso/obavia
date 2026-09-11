/**
 * Rule-based first-mention extractor (addendum v3 §2, §4, §7). No model, no network.
 *
 * From PROSPECT turns it detects, on first mention:
 *  - analogies / comparisons: "like a/an X where|that|when|and Y", "as bad as Y", "is a X where Y",
 *    "it's a X situation …", "the X of Y" with a capitalised rare noun;
 *  - emotional descriptors: "I felt X", "we were X by …", "X-ed by …", plus an open lexicon
 *    (ambushed, boxed in, breathing room, …) — any "felt <adjective/participle>" is accepted;
 *  - outcome labels / defined terms: "X is what matters", "what matters to me is X", "by X I mean Y";
 *  - corrections: "X, not Y".
 * The RELATIONSHIP clause is captured, not the noun. Valence attaches to its object.
 *
 * Filters: commonplace idioms are not references; a domain word or rare noun with no relationship
 * clause and no emotional/comparison marker is not eligible (recorded with a reason, never a card).
 * Origin uses the preceding one or two representative turns and third-party attribution; with no
 * preceding context in a partial window the origin is `unknown`, never spontaneous by default.
 */
import type { TranscriptTurn } from '../schemas/transcript';
import { LISTENER_EXTRACTOR_VERSION, LISTENER_SCHEMA_VERSION, type Reference, type ReferenceKind, type ReferenceOrigin, type ReferenceValence } from '../schemas/listener';
import type { NormalizedTranscript, NormalizedTurn } from '../vocabulary/normalize';
import { escapeRegExp, normalizeKey, slug, splitSentences, wordCount } from '../vocabulary/text';
import { conceptsForRelationship, CONCEPT_BY_ID, stagesForConcepts } from './concepts';
import { containsIdiom, DOMAIN_WORDS, domainFor, domainWordIn, EMOTIONAL_LEXICON, isPainful } from './lexicon';

export interface ListenerContext {
  workspace_id?: string;
  call_id?: string;
  /**
   * 'complete' (default) when the turns start at the beginning of the conversation.
   * 'partial' when earlier turns are unavailable: a prospect turn with nothing before it gets origin `unknown`.
   */
  window?: 'complete' | 'partial';
}

export interface NotEligible {
  turn_id: string;
  text: string;
  reason: string;
  /** Recorded for explainability; a low-priority item is never a card. */
  priority: 'low' | 'none';
}

/** Internal candidate before it becomes a Reference. Offsets are UTF-16 indexes into the TURN text. */
interface Candidate {
  kind: ReferenceKind;
  start: number;
  end: number;
  exact: string;
  quote: string;
  label: string;
  source_domain?: string;
  business_target: string;
  relationship: string;
  valence: ReferenceValence;
  painful: boolean;
  prohibited: string[];
  meaning_status: 'observed' | 'inferred' | 'unknown' | 'confirmed';
  explained?: { text: string; evidence_turn_id: string };
  clarify?: string;
  /** For outcome labels: the metric explicitly set aside ("revenue"). */
  distinct_from?: string;
  /** Head noun phrase of a comparison (for origin detection). */
  head?: string;
  /** The word to say when reusing ("hockey", "soufflé"): the domain key if the prospect said it, else the shortest domain word in their head noun. */
  domain_word?: string;
}

// ---------------------------------------------------------------------------------------------
// Unicode helpers — evidence spans are CODE-POINT offsets (schema), turns are UTF-16 strings.
// ---------------------------------------------------------------------------------------------

/** UTF-16 index → code-point index. */
export function toCodePointOffset(text: string, utf16Index: number): number {
  let count = 0;
  for (let i = 0; i < utf16Index && i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) i += 1;
    }
    count += 1;
  }
  return count;
}

/** Slice a string by code-point offsets. */
export function sliceCodePoints(text: string, start: number, end: number): string {
  return Array.from(text).slice(start, end).join('');
}

// ---------------------------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------------------------

const CONNECTOR = /\s+(where|that|when|whenever|who|which|while|whose|but|so that|because|until|except|and|with|in which|after|before|without|instead of)\s+/i;
const LIKE_VERB_BEFORE = /(?:\b(?:I|we|you|they|he|she|people|would|'d|don't|do|doesn't|didn't|really|to|not|n't|never|nothing)\s*)$/i;
const NEGATED_BEFORE = /\b(?:not|n't|never|nothing|isn't|wasn't|aren't|weren't|hardly|wouldn't say)\s*(?:really\s+|exactly\s+|at all\s+)?$/i;
const HEAD_STOP = /^(?:I|we|you|they|he|she|it|this|that|these|those|what|when|how|so|before|last|yesterday|to|me|us|them|him|her|the way|always|usually|normal|most)\b/i;
const HEAD_TRIVIAL = /^(?:a minute|a second|a lot|something|anything|everything|nothing|that|this|it|now|then|today|yesterday)$/i;
const AS_X_AS = /\bas\s+(bad|good|hard|painful|frustrating|rough|tough|expensive|slow|messy|useless|awkward|scary|risky|exhausting|demoralising|demoralizing)\s+as\s+([^.,;!?]+)/gi;
const WORSE_THAN = /\b(worse|better|harder|slower)\s+than\s+((?:a|an|the)\s+[^.,;!?]+)/gi;
const IS_A_X_WHERE = /\b(?:is|was|are|were|'s|feels like|felt like|became|becomes)\s+(?:just\s+|basically\s+|kind of\s+|honestly\s+)?(a|an|the)\s+([^.,;!?]+?)\s+(where|that|which|who|when|with|in which|nobody|no one)\s+([^.;!?]+)/gi;
const SITUATION = /\b(?:it's|it is|this is|that's|that is|we have|we've got|is)\s+(?:like\s+)?(?:a|an)\s+([A-Za-z][A-Za-z'-]+(?:\s[A-Za-z][A-Za-z'-]+)?)\s+(situation|problem|scenario|story)\b(?:\s+(where|that|which|when|and|because|—|-)\s+([^.;!?]+))?/g;
const RARE_NOUN = /\b(a|an|the)\s+([A-Z][a-z]{3,})\b(\s+(?:of|where|that|which|who|with|nobody|no one)\s+[^.;!?]+)?/g;
const RARE_STOP = new Set(
  'monday tuesday wednesday thursday friday saturday sunday january february march april june july august september october november december internet website team owner manager dealer store group motors auto plaza mall east west north south group prophet'.split(' '),
);
const EMO_VERB =
  /\b(I|we)\s+(felt|feel|feeling|was|were|am|are|got|get|have been|had been|'ve been|'m|'re)\s+((?:(?:really|pretty|completely|totally|kind of|sort of|a bit|a little|so|very|just|honestly|genuinely)\s+)*)([a-z]+(?:[-\s](?:in|out|up|down|and[-\s][a-z]+|holding the bag|water|room))?)\b(?:\s+(by|about|with|when|because|after|in|at|over|into)\s+((?:(?!\s+(?:and|but|so|because|which)\s+)[^.;!?,])+))?/gi;
const EMO_STOP = new Set('like that it good bad fine ok okay better worse great sure able going supposed told asked given sent called offered contacted approached quoted charged billed hoping trying looking thinking interested happy glad ready talking working done used based here there'.split(' '));
const NEGATIVE_HINT = /(?:cheated|ignored|dismissed|stuck|lost|blamed|rushed|pressured|exposed|stranded|undercut|shortchanged|misled|tricked|sidelined|trapped|cornered|boxed|ambushed|blindsided|burned|abandoned|overwhelmed|swamped|drowning|buried|robbed|steamrolled|railroaded|bullied|talked down|strung along|played|used|frustrated|helpless|powerless|stuck)$/i;
const POSITIVE_HINT = /(?:supported|heard|confident|relieved|reassured|respected|backed|understood|comfortable|safe|steady|calm)$/i;
const X_IS_WHAT_MATTERS = /\b([A-Za-z][a-z-]+(?:\s[a-z-]+){0,2})\s+is\s+what\s+matters(?:\s+(?:to|for)\s+(?:me|us))?/gi;
const WHAT_MATTERS_IS = /\bwhat\s+matters(?:\s+(?:to|for)\s+(?:me|us))?(?:\s+most)?\s+is\s+(?:the\s+)?([a-z-]+(?:\s[a-z-]+){0,3})/gi;
const BY_X_I_MEAN = /\bby\s+([a-z-]+(?:\s[a-z-]+){0,2})\s+(?:I|we)\s+mean\s+([^.;!?]+)/gi;
const WE_CALL_IT = /\b(?:what I call|what we call|I call it|we call it|I call that|we call that)\s+(?:the\s+)?[“"]?([A-Za-z][a-z-]+(?:\s[a-z-]+){0,2})[”"]?/gi;
const CORRECTION = /(?:^|[,;:—-]\s*|\b(?:is|it's|its|about|want|wants|on|need|needs)\s+)([A-Za-z][a-z-]+(?:\s[a-z-]+)?),\s*not\s+(?:the\s+)?([A-Za-z][a-z-]+(?:\s[a-z-]+)?)(?=\s*[.,;:!?—-]|$)/gi;
const SET_ASIDE = /^([A-Za-z][a-z-]+(?:\s[a-z-]+){0,2})\s+(?:is|are)\s+(?:fine|okay|ok|not the (?:point|issue|problem)|secondary|not it|not what I watch|not the number)/i;
const THIRD_PARTY =
  /\b(?:(?:my|our|his|her|their)\s+(?:partner|wife|husband|brother|sister|son|daughter|GM|accountant|consultant|buddy|friend|cousin|boss|manager|dad|father|mom|mother|kids?|nephew|niece|uncle|aunt)|another\s+(?:owner|dealer|guy|store|GM|manager)|(?:a|some)\s+(?:friend|buddy|guy|colleague|consultant|vendor|rep)|the last\s+(?:guy|vendor|company)|someone|somebody|she|he|they)\b[^.!?]*?\b(?:follows|says|said|told|tells|calls|called|likes|loves|is into|watches|plays|played|put it|puts it|described|describes|thinks|swears|keeps saying|kept saying|would say|compares|compared)\b/i;
const ASKED_FOR_ANALOGY = /\b(?:analogy|metaphor|compare (?:it|this|that|the)\b|comparison|what would you compare|how would you describe|is it like a|what does it feel like|picture it|if you had to describe|what would you call|to something)\b/i;
const NEGATIVE_RELATIONSHIP = /\b(?:nobody|no one|no-one|collapse|collapsed|fail|failed|fails|mess|chaos|lost|lose|wrong|never|can't|cannot|nothing|behind|drop|dropped|dropping|falls|fell|stuck|broken|missing|wants a solo|wants to play a solo|everybody wants|nobody knows|nobody owns|no idea|scramble|scrambling|fighting|guess|guessing)\b/i;
const WHAT_MATTERS_STOP = new Set('it this that what which there here something nothing everything'.split(' '));

function shortLabel(text: string, max = 6): string {
  return text
    .replace(/^(?:that|which|where|when|who|while|and|but|so|because|with|in which)\s+/i, '')
    .replace(/[“”"]/g, '')
    .replace(/[.,;:!?]+$/g, '')
    .split(/\s+/)
    .slice(0, max)
    .join(' ')
    .toUpperCase();
}

function headNoun(head: string): string {
  const words = head
    .replace(/^(?:running|managing|spending|having|being|trying|watching|building|playing|working|herding|juggling)\s+/i, '')
    .replace(/^(?:a|an|the|our|my|your)\s+/i, '')
    .replace(/^(?:all\s+\w+\s+)?(?:making|baking|cooking|planting|pouring|framing)\s+(?:a|an|the)?\s*/i, '')
    .trim()
    .split(/\s+/);
  return words.slice(0, 3).join(' ');
}

function trimTargetPrefix(prefix: string): string {
  let out = prefix.trim();
  for (let i = 0; i < 4; i += 1) {
    const next = out.replace(/\s*(?:is|was|are|were|feels|felt|looks|looked|seems|seemed|it's|that's|'s|be|being|becomes|became|honestly|frankly|basically|just|kind of|sort of|a lot|a bit|more)$/i, '').trim();
    if (next === out) break;
    out = next;
  }
  out = out.replace(/^(?:(?:yes|yeah|yep|exactly|right|correct|honestly|frankly|well|look|listen|and|but|so|because|no|oh)[,.!\s]+)+/i, '').replace(/[,;:]$/, '').trim();
  if (/^(?:it|this|that|which|yes|yeah|exactly|right)$/i.test(out)) return 'this';
  return out.length > 0 ? out.charAt(0).toLowerCase() + out.slice(1) : 'this';
}

function valenceObjectFor(conceptIds: readonly string[], target: string, negative: boolean): string {
  if (conceptIds.includes('effort_then_failure')) return 'the result after the effort (not cooking or the activity itself)';
  if (conceptIds.includes('role_ownership')) return 'the lack of clear ownership (not the sport or activity)';
  if (conceptIds.includes('coordination_vs_individuality')) return 'the lack of coordination, not the individual style, not the activity';
  if (conceptIds.includes('setback')) return 'the setback';
  if (conceptIds.includes('hidden_costs_commitment_lockin')) return 'the unexpected charges and the difficulty leaving';
  return negative ? `${target} (the situation described, not the domain)` : target;
}

const COMMON_PROHIBITIONS = ['no hobby/biography inference from the domain', 'no personality label', 'no claim about the prospect playing, following or liking the domain'];

function comparisonCandidate(kind: ReferenceKind, sentenceOffset: number, sentence: string, start: number, end: number, head: string, relationship: string, targetPrefix: string): Candidate {
  const exact = sentence.slice(start, end).replace(/[.,;:!?\s]+$/g, '');
  const domain = domainFor(head) ?? domainFor(exact);
  const domainWord = domain ? (domainWordIn(head, domain) ?? domainWordIn(exact, domain)) : undefined;
  const sayable = domain ? sayableDomainWord(head, exact, domain) : headNoun(head).toLowerCase();
  const noun = domain ? sayable : (domainWord ?? headNoun(head));
  const rel = relationship.replace(/[.,;:!?\s]+$/g, '');
  const target = trimTargetPrefix(targetPrefix);
  const conceptIds = conceptsForRelationship(rel, `${target} ${exact}`);
  const painful = isPainful(exact);
  const negative = painful || NEGATIVE_RELATIONSHIP.test(rel) || NEGATIVE_RELATIONSHIP.test(target);
  return {
    kind,
    start: sentenceOffset + start,
    end: sentenceOffset + start + exact.length,
    exact,
    quote: sentence.trim(),
    label: `${noun.toUpperCase()} / ${shortLabel(rel)}`,
    source_domain: domain,
    business_target: target,
    relationship: `${target}: ${rel}`,
    valence: { polarity: negative ? 'negative' : 'neutral', object: valenceObjectFor(conceptIds, target, negative) },
    painful,
    prohibited: [...COMMON_PROHIBITIONS, ...(painful ? ['no personal injury/loss history', 'no upbeat same-domain line (no "slam dunk")', 'no dislike of the domain'] : [])],
    meaning_status: 'observed',
    head,
    domain_word: sayable,
  };
}

/** The word to say back: the domain key if it appears in what they said, else the shortest domain word in their head noun. */
function sayableDomainWord(head: string, exact: string, domain: string): string {
  const keyRe = new RegExp(`(?<![a-z])${escapeRegExp(domain)}(?![a-z])`, 'i');
  if (keyRe.test(head) || keyRe.test(exact)) return domain;
  const words = (DOMAIN_WORDS[domain] ?? []).filter((w) => new RegExp(`(?<![a-z])${escapeRegExp(w)}(?![a-z])`, 'i').test(head)).sort((a, b) => a.length - b.length);
  return words[0] ?? domainWordIn(exact, domain) ?? domain;
}

function likeCandidates(sentenceOffset: number, sentence: string): { candidates: Candidate[]; skipped: string[] } {
  const candidates: Candidate[] = [];
  const skipped: string[] = [];
  const re = /\blike\s+/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sentence)) !== null) {
    const before = sentence.slice(0, m.index);
    if (LIKE_VERB_BEFORE.test(before) && !/\bfeels?\s*$/i.test(before)) continue; // "I like", "would like"
    if (NEGATED_BEFORE.test(before)) {
      skipped.push('negated comparison ("not like …"): not a reference');
      continue;
    }
    const restStart = m.index + m[0].length;
    const rest = sentence.slice(restStart).replace(/[.;!?].*$/s, '');
    if (HEAD_STOP.test(rest) || HEAD_TRIVIAL.test(rest.trim())) continue;
    const conn = CONNECTOR.exec(rest);
    if (!conn || conn.index === undefined) {
      const head = rest.replace(/[,.;:!?]+$/g, '').trim();
      if (head.length > 0 && (domainFor(head) || /^[A-Z]/.test(head))) skipped.push(`"like ${head}" has no relationship clause: not eligible`);
      continue;
    }
    const head = rest.slice(0, conn.index).trim();
    const relationship = rest.slice(conn.index + conn[0].length).trim();
    if (head.length === 0 || relationship.length === 0 || wordCount(relationship) < 2) continue;
    if (containsIdiom(head) && !domainFor(head)) {
      skipped.push(`commonplace idiom "${head}": not a reference`);
      continue;
    }
    candidates.push(comparisonCandidate('analogy', sentenceOffset, sentence, m.index, restStart + rest.length, head, relationship, before));
  }
  return { candidates, skipped };
}

function asXAsCandidates(sentenceOffset: number, sentence: string): Candidate[] {
  const out: Candidate[] = [];
  for (const m of sentence.matchAll(AS_X_AS)) {
    const degree = m[1]!;
    const target = m[2]!.trim();
    const before = sentence.slice(0, m.index);
    if (NEGATED_BEFORE.test(before)) continue;
    const c = comparisonCandidate('comparison', sentenceOffset, sentence, m.index, m.index + m[0].length, target, `as ${degree.toLowerCase()} as ${target}`, before);
    c.label = `${(c.source_domain ? (domainWordIn(target, c.source_domain) ?? headNoun(target)) : headNoun(target)).toUpperCase()} / AS ${degree.toUpperCase()} AS ${shortLabel(target)}`;
    c.meaning_status = 'inferred';
    c.relationship = `${c.business_target}: as ${degree.toLowerCase()} as ${target}; the ${degree.toLowerCase() === 'bad' || c.painful ? 'negative' : ''} comparison attaches to ${c.business_target}, not to the domain`.replace(/\s+/g, ' ');
    if (!c.painful) c.valence.polarity = /^(good|better)$/i.test(degree) ? 'positive' : 'negative';
    out.push(c);
  }
  for (const m of sentence.matchAll(WORSE_THAN)) {
    const target = m[2]!.trim();
    const before = sentence.slice(0, m.index);
    if (NEGATED_BEFORE.test(before) || !(domainFor(target) || /[A-Z]/.test(target.slice(2)))) continue;
    const c = comparisonCandidate('comparison', sentenceOffset, sentence, m.index, m.index + m[0].length, target, `${m[1]!.toLowerCase()} than ${target}`, before);
    c.meaning_status = 'inferred';
    out.push(c);
  }
  return out;
}

function isAXWhereCandidates(sentenceOffset: number, sentence: string): Candidate[] {
  const out: Candidate[] = [];
  for (const m of sentence.matchAll(IS_A_X_WHERE)) {
    const head = m[2]!.trim();
    const capitalised = /^[A-Z]/.test(head) && m.index + m[0].indexOf(head) > 0;
    if (!domainFor(head) && !capitalised) continue;
    const before = sentence.slice(0, m.index);
    if (NEGATED_BEFORE.test(before)) continue;
    const start = m.index + m[0].indexOf(m[1]!);
    const rel = `${m[3]} ${m[4]}`.trim();
    out.push(comparisonCandidate(domainFor(head) ? 'analogy' : 'image', sentenceOffset, sentence, start, m.index + m[0].length, head, rel, before));
  }
  return out;
}

function situationCandidates(sentenceOffset: number, sentence: string): { candidates: Candidate[]; skipped: string[] } {
  const candidates: Candidate[] = [];
  const skipped: string[] = [];
  for (const m of sentence.matchAll(SITUATION)) {
    const x = m[1]!;
    if (!(domainFor(x) || /^[A-Z]/.test(x))) continue;
    const rest = m[4]?.trim();
    if (!rest) {
      skipped.push(`"a ${x} ${m[2]}" names a comparison without a relationship clause: low priority`);
      continue;
    }
    const start = m.index + m[0].indexOf(x);
    candidates.push(comparisonCandidate('image', sentenceOffset, sentence, start, m.index + m[0].length, x, rest, sentence.slice(0, m.index)));
  }
  return { candidates, skipped };
}

function rareNounCandidates(sentenceOffset: number, sentence: string, knownNames: ReadonlySet<string>): { candidates: Candidate[]; skipped: string[] } {
  const candidates: Candidate[] = [];
  const skipped: string[] = [];
  for (const m of sentence.matchAll(RARE_NOUN)) {
    const noun = m[2]!;
    if (m.index === 0 || RARE_STOP.has(noun.toLowerCase()) || knownNames.has(noun.toLowerCase())) continue;
    const modifier = m[3]?.trim();
    const before = sentence.slice(0, m.index);
    if (NEGATED_BEFORE.test(before)) continue;
    if (!modifier) {
      skipped.push(`rare noun "${noun}" with no comparison relationship: low priority, not a card`);
      continue;
    }
    const c = comparisonCandidate('image', sentenceOffset, sentence, m.index, m.index + m[0].length, noun, modifier, before);
    c.label = `${noun.toUpperCase()} / ${shortLabel(modifier)}`;
    candidates.push(c);
  }
  return { candidates, skipped };
}

function emotionalCandidates(sentenceOffset: number, sentence: string): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<number>();
  for (const m of sentence.matchAll(EMO_VERB)) {
    const verb = m[2]!.toLowerCase();
    const word = m[4]!.toLowerCase().replace(/\s+/g, ' ');
    const lex = EMOTIONAL_LEXICON[word] ?? EMOTIONAL_LEXICON[word.replace(/-/g, ' ')];
    const feltVerb = /^(felt|feel|feeling)$/.test(verb);
    const passiveWithAgent = /ed$/.test(word) && (m[5] ?? '').toLowerCase() === 'by';
    if (EMO_STOP.has(word)) continue;
    if (!lex && !feltVerb && !passiveWithAgent) continue;
    if (!lex && feltVerb && !/(?:ed|en|ing)$/.test(word) && !NEGATIVE_HINT.test(word) && !POSITIVE_HINT.test(word)) continue;
    const start = m.index + m[0].indexOf(m[4]!, m[1]!.length);
    if (seen.has(start)) continue;
    seen.add(start);
    const exact = sentence.slice(start, start + m[4]!.length);
    const object = m[6]?.trim().replace(/[.,;:!?]+$/g, '');
    const polarity: ReferenceValence['polarity'] = lex ? lex.polarity : NEGATIVE_HINT.test(word) ? 'negative' : POSITIVE_HINT.test(word) ? 'positive' : 'mixed';
    const objectText = object ? `${m[5]!.toLowerCase()} ${object}` : undefined;
    const relationship = objectText ? `${exact} ${objectText}` : `${exact} (object not stated)`;
    const conceptIds = conceptsForRelationship(relationship, sentence);
    out.push({
      kind: 'emotional_descriptor',
      start: sentenceOffset + start,
      end: sentenceOffset + start + exact.length,
      exact,
      quote: sentence.trim(),
      label: exact.toUpperCase(),
      business_target: object ?? 'not stated',
      relationship,
      valence: { polarity, object: object ? `${object}: the explicit description, not an explanation of why` : 'the situation described (unexplained)' },
      painful: false,
      prohibited: ['no assumption about the cause: ask what made it feel that way', 'no trauma narrative', `not flattened to a generic label (e.g. "price objection")`],
      meaning_status: 'unknown',
      clarify: `When you say "${exact.toLowerCase()}," ${lex?.clarify ?? 'what made it feel that way?'}`,
      head: exact,
      ...(conceptIds.length === 0 ? {} : {}),
    });
  }
  // Standalone lexicon phrases ("no breathing room", "we're boxed in", "gave us breathing room").
  for (const [phrase, lex] of Object.entries(EMOTIONAL_LEXICON)) {
    const re = new RegExp(`(?<![a-z])${escapeRegExp(phrase)}(?![a-z])`, 'i');
    const m = re.exec(sentence);
    if (!m) continue;
    if (out.some((c) => c.start - sentenceOffset <= m.index && c.end - sentenceOffset >= m.index + m[0].length)) continue;
    if (Array.from(seen).some((s) => s === m.index)) continue;
    const exact = m[0];
    const relationship = `${exact}: ${sentence.trim()}`;
    const negated = /\b(?:no|without|zero|lack of|little|not much|hardly any)\s*$/i.test(sentence.slice(0, m.index));
    out.push({
      kind: 'emotional_descriptor',
      start: sentenceOffset + m.index,
      end: sentenceOffset + m.index + exact.length,
      exact,
      quote: sentence.trim(),
      label: exact.toUpperCase(),
      business_target: 'not stated',
      relationship,
      valence: negated
        ? { polarity: lex.polarity === 'positive' ? 'negative' : lex.polarity, object: `the absence of ${exact.toLowerCase()}: the explicit description, not an explanation of why` }
        : { polarity: lex.polarity, object: 'the situation described: the explicit description, not an explanation of why' },
      painful: false,
      prohibited: ['no assumption about the cause: ask what made it feel that way', 'no trauma narrative'],
      meaning_status: 'unknown',
      clarify: `When you say "${exact.toLowerCase()}," ${lex.clarify ?? 'what does that look like day to day?'}`,
      head: exact,
    });
  }
  return out;
}

function outcomeCandidates(sentenceOffset: number, sentence: string, previousSentence: string | undefined): Candidate[] {
  const out: Candidate[] = [];
  const setAside = previousSentence ? SET_ASIDE.exec(previousSentence)?.[1]?.toLowerCase() : undefined;
  const push = (kind: ReferenceKind, start: number, exact: string, relationship: string, explained?: string, distinct?: string) => {
    const prohibited = [`keep the prospect's word "${exact}", no synonym`];
    if (distinct) prohibited.push(`do not relabel ${distinct} amounts as ${exact.toLowerCase()}`, `do not promise improved ${exact.toLowerCase()} without evidence`);
    const rel = distinct && kind !== 'correction' ? `${relationship}, distinct from ${distinct}` : relationship;
    out.push({
      kind,
      start: sentenceOffset + start,
      end: sentenceOffset + start + exact.length,
      exact,
      quote: sentence.trim(),
      label: distinct ? `${exact.toUpperCase()} (NOT ${distinct.toUpperCase()})` : exact.toUpperCase(),
      business_target: 'the stated priority / definition',
      relationship: rel,
      valence: { polarity: 'positive', object: `${exact.toLowerCase()} as the stated priority` },
      painful: false,
      prohibited,
      meaning_status: explained ? 'confirmed' : 'observed',
      explained: explained ? { text: explained, evidence_turn_id: '' } : undefined,
      distinct_from: distinct,
      head: exact,
    });
  };
  for (const m of sentence.matchAll(X_IS_WHAT_MATTERS)) {
    const x = m[1]!;
    if (WHAT_MATTERS_STOP.has(x.toLowerCase())) continue;
    push('outcome_label', m.index, x, `${x.toLowerCase()} is what matters`, undefined, setAside && setAside !== x.toLowerCase() ? setAside : undefined);
  }
  for (const m of sentence.matchAll(WHAT_MATTERS_IS)) {
    const x = m[1]!;
    if (WHAT_MATTERS_STOP.has(x.toLowerCase())) continue;
    push('outcome_label', m.index + m[0].lastIndexOf(x), x, `what matters is ${x.toLowerCase()}`, undefined, setAside && setAside !== x.toLowerCase() ? setAside : undefined);
  }
  for (const m of sentence.matchAll(BY_X_I_MEAN)) {
    const x = m[1]!;
    push('defined_term', m.index + m[0].indexOf(x), x, `by ${x.toLowerCase()} they mean: ${m[2]!.trim()}`, m[2]!.trim());
  }
  for (const m of sentence.matchAll(WE_CALL_IT)) {
    const x = m[1]!;
    push('defined_term', m.index + m[0].lastIndexOf(x), x, `their own term "${x}" for: ${sentence.trim()}`);
  }
  for (const m of sentence.matchAll(CORRECTION)) {
    const x = m[1]!;
    const y = m[2]!;
    if (WHAT_MATTERS_STOP.has(x.toLowerCase()) || wordCount(x) > 2) continue;
    push('correction', m.index + m[0].indexOf(x), x, `${x.toLowerCase()}, not ${y.toLowerCase()}: an explicit correction`, undefined, y.toLowerCase());
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Origin
// ---------------------------------------------------------------------------------------------

function detectOrigin(c: Candidate, turn: NormalizedTurn, turns: readonly NormalizedTurn[], ctx: ListenerContext): { origin: ReferenceOrigin; reason: string } {
  const sentence = c.quote;
  if (THIRD_PARTY.test(sentence)) return { origin: 'third_party', reason: "attributed to someone else in the prospect's own sentence" };
  const earlier = turns.filter((t) => t.display_index < turn.display_index);
  if (earlier.length === 0 && ctx.window === 'partial') return { origin: 'unknown', reason: 'no preceding context in a partial window' };
  const repBefore = earlier.filter((t) => t.speaker_role === 'representative' && t.is_final).slice(-2);
  const probes = [c.source_domain, c.head ? headNoun(c.head) : undefined, c.kind === 'emotional_descriptor' || c.kind === 'outcome_label' || c.kind === 'correction' ? c.exact : undefined].filter(
    (p): p is string => typeof p === 'string' && p.length > 2,
  );
  for (const rep of repBefore) {
    const supplied = probes.some((p) => (c.source_domain && p === c.source_domain ? domainWordIn(rep.text, p) !== undefined : new RegExp(`(?<![a-z])${escapeRegExp(p.toLowerCase())}(?![a-z])`, 'i').test(rep.text)));
    if (supplied) return { origin: 'seller_introduced_prospect_confirmed', reason: `the representative used it first in ${rep.utterance_id}; the prospect endorsed it` };
  }
  for (const rep of repBefore) {
    if (ASKED_FOR_ANALOGY.test(rep.text) && (c.kind === 'analogy' || c.kind === 'comparison' || c.kind === 'image')) {
      return { origin: 'prompted', reason: `the representative asked for a comparison in ${rep.utterance_id}` };
    }
  }
  return { origin: 'prospect_spontaneous', reason: 'no seller priming or third-party attribution in the preceding turns' };
}

// ---------------------------------------------------------------------------------------------
// Turn-level extraction
// ---------------------------------------------------------------------------------------------

export interface TurnExtraction {
  candidates: Candidate[];
  not_eligible: NotEligible[];
}

function knownNamesFrom(turns: readonly NormalizedTurn[]): Set<string> {
  const names = new Set<string>();
  for (const t of turns) {
    for (const m of t.text.matchAll(/\b([A-Z][a-z]+)\s+(?:Motors|Auto|Autos|Motorcars|Group|Plaza|Mall|Lane|Ridge|Trail|Heron|Wind)\b/g)) names.add(m[1]!.toLowerCase());
    for (const m of t.text.matchAll(/\b(?:this is|I'm|I am|Hi|Thanks,?)\s+([A-Z][a-z]+)\b/g)) names.add(m[1]!.toLowerCase());
  }
  return names;
}

/** Candidates from ONE prospect turn (sentence by sentence). Exported for tests. */
export function extractTurn(turn: NormalizedTurn, knownNames: ReadonlySet<string> = new Set()): TurnExtraction {
  const candidates: Candidate[] = [];
  const not_eligible: NotEligible[] = [];
  if (turn.speaker_role !== 'prospect') return { candidates, not_eligible };
  const sentences = splitSentences(turn.text);
  sentences.forEach((s, i) => {
    const before = candidates.length;
    const like = likeCandidates(s.offset, s.text);
    candidates.push(...like.candidates);
    candidates.push(...asXAsCandidates(s.offset, s.text));
    const rare = rareNounCandidates(s.offset, s.text, knownNames);
    candidates.push(...rare.candidates);
    candidates.push(...isAXWhereCandidates(s.offset, s.text));
    const sit = situationCandidates(s.offset, s.text);
    candidates.push(...sit.candidates);
    candidates.push(...emotionalCandidates(s.offset, s.text));
    candidates.push(...outcomeCandidates(s.offset, s.text, sentences[i - 1]?.text));
    const skipped = [...like.skipped, ...sit.skipped, ...rare.skipped];
    for (const reason of skipped) not_eligible.push({ turn_id: turn.utterance_id, text: s.text, reason, priority: /low priority/.test(reason) ? 'low' : 'none' });
    if (candidates.length === before && skipped.length === 0) {
      const idiom = containsIdiom(s.text);
      const domain = domainFor(s.text);
      if (idiom) not_eligible.push({ turn_id: turn.utterance_id, text: s.text, reason: `commonplace idiom "${idiom}": not a reference, no domain interest implied`, priority: 'none' });
      else if (domain) not_eligible.push({ turn_id: turn.utterance_id, text: s.text, reason: `"${domainWordIn(s.text, domain) ?? domain}" appears without a comparison relationship or emotional marker: not eligible`, priority: 'none' });
    }
  });
  // Drop overlapping candidates: keep the earliest-starting, longest span per overlap group.
  const kept: Candidate[] = [];
  for (const c of [...candidates].sort((a, b) => a.start - b.start || b.end - a.end)) {
    const overlapping = kept.find((k) => c.start < k.end && k.start < c.end);
    if (overlapping) {
      // An emotional word inside a comparison stays its own reference only when it is the lexicon word itself.
      if (c.kind === 'emotional_descriptor' && overlapping.kind !== 'emotional_descriptor' && EMOTIONAL_LEXICON[c.exact.toLowerCase()]) kept.push(c);
      continue;
    }
    kept.push(c);
  }
  return { candidates: kept, not_eligible };
}

// ---------------------------------------------------------------------------------------------
// Transcript-level extraction
// ---------------------------------------------------------------------------------------------

export interface ExtractResult {
  references: Reference[];
  not_eligible: NotEligible[];
}

function eventVersionOf(raw: readonly TranscriptTurn[], utteranceId: string): number {
  const i = raw.findIndex((t) => t.utterance_id === utteranceId);
  return i >= 0 ? i + 1 : raw.length;
}

function referenceId(callId: string, label: string): string {
  return `${callId}:ref:${slug(label)}`;
}

const CLARIFICATION_ANSWER_MIN_WORDS = 4;

/** Build references from the latest normalized turns. */
export function extractReferences(normalized: NormalizedTranscript, raw: readonly TranscriptTurn[], ctx: ListenerContext = {}): ExtractResult {
  const turns = normalized.turns;
  const callId = ctx.call_id ?? raw[0]?.call_id ?? turns[0]?.call_id ?? 'unknown-call';
  const workspaceId = ctx.workspace_id ?? raw[0]?.workspace_id ?? turns[0]?.workspace_id ?? 'unknown-workspace';
  const knownNames = knownNamesFrom(turns);
  const byLabel = new Map<string, Reference>();
  const byExactKey = new Map<string, string>();
  const not_eligible: NotEligible[] = [];

  for (const turn of turns) {
    if (turn.speaker_role !== 'prospect') continue;
    const { candidates, not_eligible: ne } = extractTurn(turn, knownNames);
    not_eligible.push(...ne);
    for (const c of candidates) {
      const exactKey = normalizeKey(c.exact);
      const existingId = byLabel.has(c.label) ? c.label : byExactKey.get(exactKey);
      if (existingId) {
        const ref = byLabel.get(existingId)!;
        if (turn.is_final && ref.evidence.utterance_id !== turn.utterance_id) {
          ref.lifecycle.occurrence_count += 1;
          ref.lifecycle.last_turn_id = turn.utterance_id;
          ref.updated_event_version = Math.max(ref.updated_event_version, eventVersionOf(raw, turn.utterance_id));
        }
        continue;
      }
      const { origin, reason: originReason } = detectOrigin(c, turn, turns, ctx);
      const conceptIds = conceptsForRelationship(c.relationship, c.quote);
      const thirdParty = origin === 'third_party';
      const domainWord = c.domain_word ?? (c.source_domain ? (domainWordIn(c.exact, c.source_domain) ?? c.source_domain) : (c.head ?? c.exact));
      const version = eventVersionOf(raw, turn.utterance_id);
      const ref: Reference = {
        id: referenceId(callId, c.label),
        workspace_id: workspaceId,
        call_id: callId,
        prospect_speaker_role: 'prospect',
        created_event_version: version,
        updated_event_version: version,
        schema_version: LISTENER_SCHEMA_VERSION,
        extractor_version: LISTENER_EXTRACTOR_VERSION,
        label: c.label,
        evidence: {
          exact_expression: c.exact,
          supporting_quote: c.quote,
          utterance_id: turn.utterance_id,
          turn_id: turn.utterance_id,
          span: { start: toCodePointOffset(turn.text, c.start), end: toCodePointOffset(turn.text, c.end) },
          revision: turn.revision,
          status: turn.is_final ? 'final' : 'provisional',
          ...(turn.started_at ? { timestamp: turn.started_at } : {}),
        },
        semantics: {
          kind: c.kind,
          source_domain: c.source_domain,
          domain_word: c.domain_word,
          business_target: c.business_target,
          relationship: c.relationship,
          valence: c.valence,
          origin,
          meaning_status: c.meaning_status,
          explained_meaning: c.explained ? { text: c.explained.text, evidence_turn_id: turn.utterance_id } : undefined,
          prohibited_inferences: [...c.prohibited, ...(thirdParty ? ["someone else's frame: do not present it as the prospect's"] : []), ...(origin === 'seller_introduced_prospect_confirmed' ? ['seller-introduced: label it as a shared term, never as the prospect\'s spontaneous choice'] : [])],
          concept_ids: conceptIds,
          painful: c.painful,
        },
        lifecycle: {
          first_turn_id: turn.utterance_id,
          last_turn_id: turn.utterance_id,
          occurrence_count: 1,
          state: 'held',
          reason: originReason,
          correction_history: [],
          kept_for_later: false,
        },
        reuse: {
          candidate_purposes: [...stagesForConcepts(conceptIds), ...conceptIds],
          relevance_explanation: conceptIds.length > 0 ? `Raises ${conceptIds.map((id) => CONCEPT_BY_ID.get(id)?.label ?? id).join('; ')}; retrievable when that concept comes up later, even without the same words.` : 'No concept tag yet: hold it; reuse only if the same topic returns.',
          allowed_mapping: allowedMapping(c, domainWord),
          disallowed_mapping_examples: disallowedMappings(c, domainWord),
          proposed_clarification: c.clarify,
          bridge_text: c.painful ? undefined : bridgeText(c, domainWord),
          used_at: [],
          reactions: [],
          do_not_reuse: thirdParty,
          clarification_requested: false,
        },
      };
      byLabel.set(c.label, ref);
      byExactKey.set(exactKey, c.label);
    }
  }

  const references = Array.from(byLabel.values());
  linkExplanations(references, turns, raw);
  applyTranscriptRejections(references, turns, raw);
  return { references, not_eligible };
}

function allowedMapping(c: Candidate, domainWord: string): string {
  if (c.painful) return `Neutral acknowledgment only: "You described that setback in strong terms earlier." Then a business-level question; never elaborate the ${c.source_domain ?? 'painful'} image, never an upbeat same-domain line.`;
  if (c.kind === 'emotional_descriptor') return `Use their word as they said it: "When you say '${c.exact.toLowerCase()}' …" Ask; do not explain it for them.`;
  if (c.kind === 'outcome_label' || c.kind === 'correction' || c.kind === 'defined_term') return `Use "${c.exact.toLowerCase()}" exactly where that is the actual subject; never substitute a synonym or a neighbouring metric.`;
  return `"Using your ${domainWord} example, …" is justified by the example alone.`;
}

function disallowedMappings(c: Candidate, domainWord: string): string[] {
  if (c.kind === 'emotional_descriptor') return [`"So you were basically overcharged…" (rewriting "${c.exact.toLowerCase()}" into a generic label)`, 'inventing why it felt that way'];
  if (c.kind === 'outcome_label' || c.kind === 'correction' || c.kind === 'defined_term') return [`treating "${c.exact.toLowerCase()}" and a neighbouring metric as interchangeable`, `promising improved ${c.exact.toLowerCase()} without evidence`];
  return [`"Since you grew up playing ${domainWord}…"`, `"As a ${domainWord} fan, you'll appreciate…"`, ...(c.painful ? [`"This will be a slam dunk"`] : [])];
}

function bridgeText(c: Candidate, domainWord: string): string | undefined {
  if (c.kind === 'analogy' || c.kind === 'comparison' || c.kind === 'image') return `Going back to your ${domainWord} example,`;
  if (c.kind === 'outcome_label' || c.kind === 'correction') return `You said ${c.exact.toLowerCase()},`;
  return undefined;
}

/**
 * Clarification evidence: a representative question naming the term, followed by a substantive
 * prospect answer, confirms the meaning WITH its evidence turn. Nothing is inferred without it.
 */
function linkExplanations(references: Reference[], turns: readonly NormalizedTurn[], raw: readonly TranscriptTurn[]): void {
  for (const ref of references) {
    if (ref.semantics.kind !== 'emotional_descriptor' || ref.semantics.meaning_status !== 'unknown') continue;
    const term = new RegExp(`(?<![a-z])${escapeRegExp(ref.evidence.exact_expression.toLowerCase())}(?![a-z])`, 'i');
    const anchor = turns.find((t) => t.utterance_id === ref.evidence.utterance_id);
    if (!anchor) continue;
    const later = turns.filter((t) => t.display_index > anchor.display_index && t.is_final);
    for (let i = 0; i < later.length; i += 1) {
      const rep = later[i]!;
      if (rep.speaker_role !== 'representative' || !term.test(rep.text) || !rep.text.includes('?')) continue;
      const answer = later.slice(i + 1).find((t) => t.speaker_role === 'prospect');
      if (!answer || wordCount(answer.text) < CLARIFICATION_ANSWER_MIN_WORDS || /^(?:no|nope|not really)\b/i.test(answer.text.trim())) continue;
      ref.semantics.explained_meaning = { text: answer.text, evidence_turn_id: answer.utterance_id };
      ref.semantics.meaning_status = 'confirmed';
      const extra = conceptsForRelationship(answer.text);
      ref.semantics.concept_ids = Array.from(new Set([...ref.semantics.concept_ids, ...extra]));
      ref.reuse.candidate_purposes = Array.from(new Set([...stagesForConcepts(ref.semantics.concept_ids), ...ref.semantics.concept_ids]));
      ref.reuse.relevance_explanation = `Explained in ${answer.utterance_id}: "${answer.text}". Retrieve when ${ref.semantics.concept_ids.map((id) => CONCEPT_BY_ID.get(id)?.label ?? id).join('; ') || 'the same topic'} comes up.`;
      ref.reuse.proposed_clarification = undefined;
      ref.updated_event_version = Math.max(ref.updated_event_version, eventVersionOf(raw, answer.utterance_id));
      ref.lifecycle.last_turn_id = answer.utterance_id;
      break;
    }
  }
}

const TRANSCRIPT_REJECTION =
  /\b(?:don't|do not|stop|quit|please don't|let's not|no need to|can we not|drop|forget)\s+(?:bring up|bringing up|mention|mentioning|use|using|go back to|going back to|keep using|keep bringing up|talk about|with|the|that|my)?\s*(?:the\s+|that\s+|my\s+)?([a-z-]+(?:\s[a-z-]+)?)\s*(?:thing|example|analogy|comparison|stuff|again|bit)?\b/gi;

/** "Please don't bring up the jazz thing" — the prospect rejected the analogy: stop using it (addendum §6). */
function applyTranscriptRejections(references: Reference[], turns: readonly NormalizedTurn[], raw: readonly TranscriptTurn[]): void {
  for (const turn of turns) {
    if (turn.speaker_role !== 'prospect' || !turn.is_final) continue;
    for (const m of turn.text.matchAll(TRANSCRIPT_REJECTION)) {
      const probe = m[1]!.toLowerCase();
      for (const ref of references) {
        const anchor = turns.find((t) => t.utterance_id === ref.evidence.utterance_id);
        if (!anchor || anchor.display_index >= turn.display_index) continue;
        const words = [ref.semantics.source_domain, ...ref.label.toLowerCase().split(/[^a-z-]+/)].filter((w): w is string => !!w && w.length > 2);
        if (!words.some((w) => probe === w || probe.startsWith(`${w} `) || probe.endsWith(` ${w}`))) continue;
        if (ref.reuse.reactions.some((r) => r.turn_id === turn.utterance_id)) continue;
        ref.reuse.reactions.push({ turn_id: turn.utterance_id, reaction: 'rejected' });
        ref.reuse.do_not_reuse = true;
        ref.lifecycle.state = 'rejected';
        ref.lifecycle.reason = `prospect rejected it in ${turn.utterance_id}: "${turn.text}"`;
        ref.updated_event_version = Math.max(ref.updated_event_version, eventVersionOf(raw, turn.utterance_id));
      }
    }
  }
}
