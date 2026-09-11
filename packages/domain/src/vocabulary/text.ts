/** Small text helpers shared by extraction, provenance and facts. No model, no network. */

export interface Sentence {
  text: string;
  /** Character offset of the sentence within the turn text. */
  offset: number;
}

/** Split a turn into sentences, keeping offsets so spans stay addressable. */
export function splitSentences(text: string): Sentence[] {
  const out: Sentence[] = [];
  const re = /[^.!?]+[.!?]*\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0];
    const lead = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();
    if (trimmed.length > 0) out.push({ text: trimmed, offset: m.index + lead });
  }
  return out;
}

const ARTICLES = /^(?:the|a|an|our|my|your|his|her|their)\s+/i;

/** Lower-cased grouping key: leading articles/possessives stripped, punctuation trimmed, spaces collapsed. */
export function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[“”"']/g, '')
    .replace(/^[\s,.;:!?—-]+|[\s,.;:!?—-]+$/g, '')
    .replace(ARTICLES, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whole-phrase, case-insensitive matcher for a normalized key (articles optional). */
export function keyMatcher(key: string): RegExp {
  const body = escapeRegExp(key).replace(/\\?\s+/g, '\\s+');
  return new RegExp(`(?<![A-Za-z])(?:(?:the|a|an|our|my|your|his|her|their)\\s+)?${body}(?![A-Za-z])`, 'gi');
}

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Very small stoplist for repetition candidates. Not a model; just avoids obvious function words. */
export const STOPWORDS = new Set(
  `a an the and or but if then so of to in on at by for from with without about into over under as is are was were be been being
   am do does did done have has had having will would can could should shall may might must it its it's this that these those there
   here what which who whom whose when where why how i me my mine we us our ours you your yours he him his she her hers they them
   their theirs not no yes yeah okay ok sure right really honestly just very more most less least much many some any all every each
   few both either neither other another such own same too also still even ever never always often again once first next last
   before after until while because though although whether get got gets getting go goes going went come comes coming came
   say says said tell told think thought know knew want wants wanted need needs like likes look looks looking make makes made
   take takes took give gives gave see sees saw use uses used call calls called thing things something anything nothing everything
   someone anyone nobody everyone people person day days week weeks month months year years time times minute minutes hour hours
   morning afternoon tonight today tomorrow monday tuesday wednesday thursday friday saturday sunday one two three four five six
   seven eight nine ten half plenty lot lots kind sort way ways good bad new old big small fine great mostly ahead back out up
   down off around through actually maybe probably already ago now then whoever whatever wherever guy guys team hi hey thanks
   thank please send sent got works work works fixed picture sense fair different same somebody honest
   don't doesn't didn't can't cannot won't isn't aren't wasn't weren't couldn't wouldn't shouldn't i'm i'd i'll i've we're we've
   we'll we'd you're you've you'll you'd it's that's there's here's he's she's they're they've they'll let's what's who's where's
   how's whoever's whatever's`
    .split(/\s+/)
    .filter(Boolean),
);
