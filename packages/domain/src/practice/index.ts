/**
 * Practice Studio — owning module agent: M-practice.
 * Pure, data-driven drills built from ScriptNode fields; choice-based mocks against fictional
 * scenarios; separate memorization / conversation scores; assisted vs unassisted tracked apart.
 * Text-only: tone_assessed is always false and no tonality number exists anywhere here.
 */
export const MODULE = 'practice' as const;

export * from './scoring';
export * from './modes';
export * from './drills';
export * from './mocks';
export * from './scenarios';
export * from './attempts';
