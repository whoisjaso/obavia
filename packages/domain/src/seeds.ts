/**
 * Seed loaders. Every loader parses through its zod schema and THROWS on invalid data —
 * a broken seed must fail typecheck/tests/build, never render silently.
 *
 * JSON lives in <repo>/data. Vitest resolves these relative imports natively; Next/Turbopack
 * resolves them because apps/web/next.config.ts sets `turbopack.root` and
 * `outputFileTracingRoot` to the monorepo root.
 *
 * Files marked `_status: "placeholder — to be authored"` are minimal VALID stand-ins created
 * by the skeleton so loaders and the build work; the owning module agent replaces them.
 */
import { z, type ZodType } from 'zod';
import sourceQuestionRecordsJson from '../../../data/source_question_records.json';
import sourceSectionsJson from '../../../data/source_sections.json';
import packageValidationJson from '../../../data/source_package_validation.json';
import identityInterviewJson from '../../../data/identity_interview.json';
import scriptNodesJson from '../../../data/apohenia_script_nodes.json';
import offersJson from '../../../data/offers.json';
import syntheticTranscriptsJson from '../../../data/synthetic_transcripts.json';
import { PackageValidation, SourceQuestionRecord, SourceSection } from './schemas/sources';
import { InterviewVersion } from './schemas/interview';
import { ScriptNode, ScriptVersion, WordTrackVariant } from './schemas/scripts';
import { OfferVersion } from './schemas/offers';
import { Transcript } from './schemas/transcript';

export const PLACEHOLDER_STATUS = 'placeholder — to be authored' as const;

/** Optional envelope marker present on skeleton placeholder files. */
const SeedStatus = z.object({ _status: z.string().optional() });

function parseSeed<T>(name: string, schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Seed ${name} is invalid:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/** True when a seed still carries the skeleton placeholder marker. */
export function isPlaceholderSeed(seed: { _status?: string }): boolean {
  return seed._status === PLACEHOLDER_STATUS;
}

// ---- Source package (real data, produced by scripts/parse-question-bank.mjs) ----

export function loadSourceQuestionRecords(): SourceQuestionRecord[] {
  return parseSeed('source_question_records.json', z.array(SourceQuestionRecord), sourceQuestionRecordsJson);
}

export function loadSourceSections(): SourceSection[] {
  return parseSeed('source_sections.json', z.array(SourceSection), sourceSectionsJson);
}

export function loadPackageValidation(): PackageValidation {
  return parseSeed('source_package_validation.json', PackageValidation, packageValidationJson);
}

// ---- Module-authored seeds (placeholders until the owning agent authors them) ----

export const IdentityInterviewSeed = InterviewVersion.extend(SeedStatus.shape);
export type IdentityInterviewSeed = z.infer<typeof IdentityInterviewSeed>;

export function loadIdentityInterview(): IdentityInterviewSeed {
  return parseSeed('identity_interview.json', IdentityInterviewSeed, identityInterviewJson);
}

export const ScriptNodesSeed = SeedStatus.extend({
  versions: z.array(ScriptVersion),
  nodes: z.array(ScriptNode),
  word_track_variants: z.array(WordTrackVariant).default([]),
});
export type ScriptNodesSeed = z.infer<typeof ScriptNodesSeed>;

export function loadScriptNodes(): ScriptNodesSeed {
  return parseSeed('apohenia_script_nodes.json', ScriptNodesSeed, scriptNodesJson);
}

export const OffersSeed = SeedStatus.extend({
  offer_versions: z.array(OfferVersion),
});
export type OffersSeed = z.infer<typeof OffersSeed>;

export function loadOffers(): OffersSeed {
  return parseSeed('offers.json', OffersSeed, offersJson);
}

export const SyntheticTranscriptsSeed = SeedStatus.extend({
  transcripts: z.array(Transcript),
});
export type SyntheticTranscriptsSeed = z.infer<typeof SyntheticTranscriptsSeed>;

export function loadSyntheticTranscripts(): SyntheticTranscriptsSeed {
  return parseSeed('synthetic_transcripts.json', SyntheticTranscriptsSeed, syntheticTranscriptsJson);
}

/** Parse every seed once; throws with the first invalid file. Used by tests and the build smoke check. */
export function validateAllSeeds(): { name: string; placeholder: boolean; count: number }[] {
  const interview = loadIdentityInterview();
  const scripts = loadScriptNodes();
  const offers = loadOffers();
  const transcripts = loadSyntheticTranscripts();
  return [
    { name: 'source_question_records.json', placeholder: false, count: loadSourceQuestionRecords().length },
    { name: 'source_sections.json', placeholder: false, count: loadSourceSections().length },
    { name: 'source_package_validation.json', placeholder: false, count: 1 },
    { name: 'identity_interview.json', placeholder: isPlaceholderSeed(interview), count: interview.screens.length },
    { name: 'apohenia_script_nodes.json', placeholder: isPlaceholderSeed(scripts), count: scripts.nodes.length },
    { name: 'offers.json', placeholder: isPlaceholderSeed(offers), count: offers.offer_versions.length },
    { name: 'synthetic_transcripts.json', placeholder: isPlaceholderSeed(transcripts), count: transcripts.transcripts.length },
  ];
}
