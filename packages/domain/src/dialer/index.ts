/**
 * Sequential dialer — owning module agent: M-core.
 *
 * Pure TypeScript (no React, no browser APIs, no timers): a session reducer with the brief §9
 * invariants, a deterministic demo simulator, the synthetic prospect queue and session stats.
 * Import as `@apohenia/domain/dialer`.
 */
export const MODULE = 'dialer' as const;

export * from './session';
export * from './simulator';
export * from './queue';
export * from './stats';
export { syntheticProspectsSeed } from './seed';
