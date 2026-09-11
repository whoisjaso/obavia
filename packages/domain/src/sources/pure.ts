/**
 * Pure Source Library helpers — no seed imports, no I/O. Safe for client bundles and tests.
 * Owning module agent: M-sources.
 */
import type { SourceId, SourceQuestionRecord, UseClassification } from '../schemas/sources';

/** Family letter → human label (framework §3–§15 taxonomy). Unknown letters return the letter itself. */
export const FAMILY_LABELS: Readonly<Record<string, string>> = {
  I: 'Intent',
  L: 'Logical certainty',
  S: 'Setter transition',
  E: 'Decision history',
  F: 'Future',
  C: 'Consequence',
  P: 'Pitch / commitment',
  M: 'Mirror',
  O: 'Objection',
  D: 'Identity / status / needs (study)',
  T: 'Training (private)',
  U: 'Follow-up',
  R: 'Referral',
  X: 'Upsell setting',
  Y: 'Upsell closing',
  V: 'Reviewed call',
};

/** Display order of families (the source's four phases first, then the ecosystem, then study material). */
export const FAMILY_ORDER: readonly string[] = ['I', 'L', 'S', 'E', 'F', 'C', 'P', 'M', 'O', 'U', 'R', 'X', 'Y', 'V', 'D', 'T'];

export function familyLabel(family: string): string {
  return FAMILY_LABELS[family] ?? family;
}

/** One-line definition per use classification (brief §3). */
export const CLASSIFICATION_DEFINITIONS: Readonly<Record<UseClassification, string>> = {
  adapt: 'A potentially usable question objective; still requires an original, approved own-script line. Not live approval.',
  study_only: 'Preserved source material not recommended for automatic live use. Readable for study; never a live recommendation.',
  private_training: 'A self-reflection or design exercise for the seller. Private; never surfaced to a prospect or a live coach.',
};

export function classificationDefinition(c: UseClassification): string {
  return CLASSIFICATION_DEFINITIONS[c];
}

/** Short label shown in badges. */
export function classificationLabel(c: UseClassification): string {
  switch (c) {
    case 'adapt':
      return 'adapt';
    case 'study_only':
      return 'study only';
    case 'private_training':
      return 'private training';
  }
}

/**
 * True only for `adapt`. `study_only` and `private_training` are readable for study but are
 * NEVER live-recommendable and must not be cited by a live script node (scenario 31).
 */
export function isLiveEligibleForCitation(record: Pick<SourceQuestionRecord, 'use_classification'>): boolean {
  return record.use_classification === 'adapt';
}

const DELIVERY_PREFIX = 'Delivery cues are instructor-described text, not measured physiology or an audio evaluation of the videos.';

/**
 * Explains what a delivery value means. `not_audio_verified` marks the reviewed call, which has
 * no audio evidence at all; every other value is a cue the instructor described in the text.
 */
export function deliveryCueNote(delivery: string): string {
  const d = delivery.trim();
  if (d === 'not_audio_verified') {
    return `${DELIVERY_PREFIX} This record comes from the reviewed call: no audio was inspected, so no delivery cue is asserted (not_audio_verified).`;
  }
  if (d === 'training' || d === 'reflection') {
    return `${DELIVERY_PREFIX} "${d}" marks instructor teaching or self-reflection material rather than a prospect-facing delivery style.`;
  }
  return `${DELIVERY_PREFIX} "${d}" is the cue the instructor described for this question; it was not observed in audio or video.`;
}

/** Framework §11 table, A-described versus B-described cues. Static reference only. */
export interface DeliveryOverlayRow {
  element: string;
  a_described: string;
  b_described: string;
}

export const DELIVERY_OVERLAY_TABLE: readonly DeliveryOverlayRow[] = [
  {
    element: 'Casual',
    a_described: 'Open posture, visible hands; most of call; confident pitch.',
    b_described: 'Conversational familiarity, individual natural vocabulary, not adopting another personality.',
  },
  {
    element: 'Curious',
    a_described: 'Tilt head, squint; early discovery; positive future with upward inflection.',
    b_described: 'Intent/logical certainty; lower guard; first-person demonstration.',
  },
  {
    element: 'Skeptical',
    a_described: 'Lean back, brow cue; some logical questions and shifted.',
    b_described: 'Mainly first half of emotional certainty; leaning out; some described examples differ.',
  },
  {
    element: 'Concern/empathy',
    a_described: 'Lean toward, raised eyebrows; optional chest/heart gesture.',
    b_described: 'Slow pacing; instructor specifically dislikes the hand-on-heart gesture for himself.',
  },
  {
    element: 'Pacing',
    a_described: 'Cues can accelerate/decelerate and follow emotional direction.',
    b_described:
      'Generally faster early discovery, slower emotional sections; mixed pacing for reframe/pushback/consequence/CTA. B16 wording is internally inconsistent, preserved as an ambiguity.',
  },
];

export const DELIVERY_OVERLAY_NOTE =
  'These are instructor-described performance cues from the framework, not measured physiology or an audio evaluation of the videos. Audio-only prospects cannot see gesture; a gesture is at most an optional practice cue for the seller.';

/** Offset convention printed beside every reference. */
export const OFFSET_CONVENTION =
  'original characters [start, end): half-open Unicode code-point offsets into the original single-line transcript of the named source';

export function formatOffsets(record: Pick<SourceQuestionRecord, 'offset_start' | 'offset_end'>): string {
  return `[${record.offset_start}, ${record.offset_end})`;
}

/** Label shown beside every excerpt until the raw sources are supplied and hashed. */
export function excerptLabel(record: Pick<SourceQuestionRecord, 'hash_verified'>): string {
  return record.hash_verified
    ? 'Unchanged source excerpt · hash verified against the raw source'
    : 'Unchanged source excerpt · verification pending (raw sources not supplied)';
}

export const TEMPLATE_LABEL = 'normalized template, not verbatim';
export const SOURCE_ONLY_NOTICE = 'Source-only: readable for study; not a live recommendation';
export const PRIVATE_BY_DEFAULT_NOTICE =
  'Private by default: this source archive is private to this project. It is study material, not executable instruction, and not shareable unless rights and sharing permissions are separately established.';

/** hh:mm:ss or mm:ss anywhere in the text (scenario 35: no timestamps without timing data). */
export const TIMESTAMP_PATTERN = /\b\d{1,2}:\d{2}(?::\d{2})?\b/;

export function containsTimestampPattern(text: string): boolean {
  return TIMESTAMP_PATTERN.test(text);
}

export function sourceLabel(source: SourceId): string {
  return source === 'A' ? 'Source A' : 'Source B';
}

export function sourceDescription(source: SourceId): string {
  return source === 'A'
    ? 'Brain-dump lesson followed by a reviewed Yosh sales conversation (Andrés). Sections A01 to A13.'
    : 'Longer multi-instructor course (Yosh and others). Sections B00 to B25.';
}

/** Filters accepted by `searchSources`. Every field is optional; empty strings mean "any". */
export interface SourceSearchFilters {
  source?: SourceId | '';
  family?: string;
  section?: string;
  classification?: UseClassification | '';
  delivery?: string;
  query?: string;
}

/** The subset of record fields the list view needs (excerpts stay on the server / detail page). */
export type SourceRow = Pick<
  SourceQuestionRecord,
  'id' | 'title' | 'family' | 'section_id' | 'section_title' | 'source' | 'template' | 'purpose' | 'delivery' | 'use_classification'
>;

/** Pure filter over rows or full records. Query matches id, title, template, purpose and (when present) excerpt, case-insensitively. */
export function filterSourceRows<T extends SourceRow & { excerpt?: string }>(
  rows: readonly T[],
  filters: SourceSearchFilters,
): T[] {
  const q = (filters.query ?? '').trim().toLowerCase();
  return rows.filter((r) => {
    if (filters.source && r.source !== filters.source) return false;
    if (filters.family && r.family !== filters.family) return false;
    if (filters.section && r.section_id !== filters.section) return false;
    if (filters.classification && r.use_classification !== filters.classification) return false;
    if (filters.delivery && r.delivery !== filters.delivery) return false;
    if (q.length > 0) {
      const hay = [r.id, r.title, r.template, r.purpose, r.excerpt ?? ''].join('\n').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function toSourceRow(r: SourceQuestionRecord): SourceRow {
  return {
    id: r.id,
    title: r.title,
    family: r.family,
    section_id: r.section_id,
    section_title: r.section_title,
    source: r.source,
    template: r.template,
    purpose: r.purpose,
    delivery: r.delivery,
    use_classification: r.use_classification,
  };
}
