/**
 * Vocabulary / THEIR WORDS — owning module agent: M-vocab.
 * Owns: this folder, data/synthetic_transcripts.json, apps/web/src/app/call-room/**, /calls/**,
 * /prospects/**, /pipeline/**, /insights/**.
 *
 * Pure TypeScript, no model calls (Increment 1): transcript normalization, rule-based candidate
 * extraction, provenance, ranking, pins, facts, post-call review, synthetic CRM records.
 */
export const MODULE = 'vocabulary' as const;

export * from './normalize';
export * from './text';
export * from './provenance';
export * from './extract';
export * from './rank';
export * from './pins';
export * from './facts';
export * from './analyze';
export * from './review';
export * from './crm';
