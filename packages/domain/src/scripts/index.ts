/**
 * Script engine — owning module agent: M-script.
 * Owns: data/apohenia_script_nodes.json, this folder, packages/domain/src/offers/**, apps/web/src/app/scripts/**, /offers/**.
 * Planned here: node graph validation, entry points, branch resolution, evidence-satisfied
 * transitions, own-word variants, immutable publication with content hash.
 */
export const MODULE = 'scripts' as const;
