/**
 * Identity interview engine — owning module agent: M-interview.
 * Owns: data/identity_interview.json, this folder, apps/web/src/app/onboarding/**, /profile/**, /today/**.
 * Planned here: screen ordering, declared-condition evaluation, back-edit invalidation,
 * profile assembly with answer ids, endorsement gate, training plan translation.
 */
export const MODULE = 'interview' as const;
