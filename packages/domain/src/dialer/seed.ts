/**
 * Synthetic prospect seed access for the dialer and the vocabulary CRM view. Parsed once through
 * the zod schema (throws on an invalid file — a broken seed must never render silently).
 *
 * Imported directly (not via `../seeds`) so client bundles that need prospects do not pull the
 * 200 KB source package along with them.
 */
import { z } from 'zod';
import prospectsJson from '../../../../data/synthetic_prospects.json';
import { SyntheticProspectsSeed } from '../schemas/dialer';

let cached: SyntheticProspectsSeed | null = null;

/** Parse (once) and return the synthetic prospect seed. */
export function syntheticProspectsSeed(): SyntheticProspectsSeed {
  if (cached) return cached;
  const result = SyntheticProspectsSeed.safeParse(prospectsJson);
  if (!result.success) {
    throw new Error(`Seed synthetic_prospects.json is invalid:\n${z.prettifyError(result.error)}`);
  }
  cached = result.data;
  return cached;
}
