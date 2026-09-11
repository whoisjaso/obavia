/**
 * Assistance modes (brief §6, §13): what the screen shows for a node in each mode.
 * Default is the full exact script. Reducing assistance is optional and reversible and never
 * emits a rank, badge or score — this module returns text visibility only.
 */
import { DEFAULT_ASSISTANCE_MODE, type AssistanceMode } from '../schemas/practice';
import type { ScriptNode } from '../schemas/scripts';

export interface MaskedView {
  mode: AssistanceMode;
  /** The exact primary line, or null when the mode hides it (before reveal). */
  primary: string | null;
  /** Mirror variants shown alongside the primary line. Empty when hidden. */
  mirrors: string[];
  /** Stage name — always visible so the representative knows where they are. */
  stage: string;
  /** Stage purpose cue (why this now). Null when hidden. */
  purpose: string | null;
  /** What-to-listen-for cue. Null when hidden. */
  listen_for: string | null;
  /** True when the mode allows a reveal action and the line is currently hidden. */
  can_reveal: boolean;
  /** Human-readable description of the mode; never a judgement of the user. */
  description: string;
}

export const MODE_LABELS: Record<AssistanceMode, string> = {
  full_script: 'Full exact script (default)',
  recall_with_reveal: 'Recall with reveal',
  primary_plus_mirror: 'Primary line plus mirror',
  stage_purpose_cue: 'Stage-purpose cue',
  unassisted: 'Unassisted',
};

export const MODE_DESCRIPTIONS: Record<AssistanceMode, string> = {
  full_script: 'Shows the exact primary line, mirrors, purpose and what to listen for.',
  recall_with_reveal: 'Hides the primary line until you choose to reveal it. Purpose stays visible.',
  primary_plus_mirror: 'Shows the primary line and its mirror variants only.',
  stage_purpose_cue: 'Shows the stage and its purpose; the wording is yours to recall.',
  unassisted: 'Shows only the stage name.',
};

export const MODE_COPY = 'Reducing assistance is optional and reversible.' as const;

/** True when the mode provides on-screen assistance (tracked separately from unassisted). */
export function isAssisted(mode: AssistanceMode): boolean {
  return mode !== 'unassisted';
}

/** Compute what is visible for `node` in `mode`. `revealed` only matters for recall_with_reveal. */
export function maskForMode(node: ScriptNode, mode: AssistanceMode = DEFAULT_ASSISTANCE_MODE, revealed = false): MaskedView {
  const base = { mode, stage: node.stage, description: MODE_DESCRIPTIONS[mode] };
  switch (mode) {
    case 'full_script':
      return {
        ...base,
        primary: node.primary_word_track,
        mirrors: [...node.mirror_variants],
        purpose: node.why_this_now,
        listen_for: node.what_to_listen_for,
        can_reveal: false,
      };
    case 'recall_with_reveal':
      return {
        ...base,
        primary: revealed ? node.primary_word_track : null,
        mirrors: revealed ? [...node.mirror_variants] : [],
        purpose: node.why_this_now,
        listen_for: node.what_to_listen_for,
        can_reveal: !revealed,
      };
    case 'primary_plus_mirror':
      return {
        ...base,
        primary: node.primary_word_track,
        mirrors: [...node.mirror_variants],
        purpose: null,
        listen_for: null,
        can_reveal: false,
      };
    case 'stage_purpose_cue':
      return { ...base, primary: null, mirrors: [], purpose: node.why_this_now, listen_for: null, can_reveal: false };
    case 'unassisted':
      return { ...base, primary: null, mirrors: [], purpose: null, listen_for: null, can_reveal: false };
  }
}
