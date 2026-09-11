/**
 * A resolved script line is text plus bracketed cues from `resolveSlots` (never invented values):
 *   "[missing: dealership name]"            → an unfilled slot
 *   "[Offer not approved: pillar 1 name]"   → an offer slot gated by the Offer Studio
 *   "[Price not approved yet — …]"          → the price gate
 *   "[Fictional offer — …]"                 → the fictional-offer gate
 * The stage never prints those brackets, braces or angle tokens. Each cue becomes a small
 * chip whose visible text is a ≤3-word label and whose accessible name is the whole cue.
 */

export type SlotStatus = 'missing' | 'offer' | 'price' | 'fictional';

export interface TextPart {
  kind: 'text';
  text: string;
}
export interface SlotPart {
  kind: 'slot';
  status: SlotStatus;
  /** ≤3 visible words, no braces (e.g. "dealership name", "pillar 1 name", "price"). */
  label: string;
  /** The whole truth: the original cue plus what fills it. */
  name: string;
  /** The slot name in snake_case when known (automation hook). */
  slot?: string;
}
export type LinePart = TextPart | SlotPart;

const CUE_RE = /(\[[^\]]+\])/g;
const RAW_SLOT_RE = /(\{[a-z0-9_|]+\})/gi;

function slotFromLabel(label: string): string {
  return label.trim().replace(/\s+/g, '_');
}

export function cueToSlot(cue: string): SlotPart {
  const inner = cue.slice(1, -1);
  let m = /^missing:\s*(.+)$/i.exec(inner);
  if (m) {
    const label = m[1]!.trim();
    return { kind: 'slot', status: 'missing', label, name: `slot: ${label} — filled from the record or what the prospect says; nothing is invented`, slot: slotFromLabel(label) };
  }
  m = /^Offer not approved:\s*(.+)$/i.exec(inner);
  if (m) {
    const label = m[1]!.trim();
    return { kind: 'slot', status: 'offer', label, name: `${inner} — not spoken until the offer is published in the Offer Studio`, slot: slotFromLabel(label) };
  }
  if (/^Price not approved/i.test(inner)) return { kind: 'slot', status: 'price', label: 'price', name: inner, slot: 'approved_price' };
  if (/^Fictional offer/i.test(inner)) return { kind: 'slot', status: 'fictional', label: 'price', name: inner, slot: 'approved_price' };
  return { kind: 'slot', status: 'missing', label: inner.slice(0, 32), name: inner };
}

/** Split a resolved line into text and slot parts. Raw `{slot}` tokens (unresolved templates) become missing slots too. */
export function lineParts(text: string): LinePart[] {
  const out: LinePart[] = [];
  for (const piece of text.split(CUE_RE)) {
    if (piece.length === 0) continue;
    if (/^\[[^\]]+\]$/.test(piece)) {
      out.push(cueToSlot(piece));
      continue;
    }
    for (const raw of piece.split(RAW_SLOT_RE)) {
      if (raw.length === 0) continue;
      if (/^\{[a-z0-9_|]+\}$/i.test(raw)) {
        const label = raw.slice(1, -1).split('|')[0]!.replace(/_/g, ' ');
        out.push({ kind: 'slot', status: 'missing', label, name: `slot: ${label} — filled from the record or what the prospect says; nothing is invented`, slot: slotFromLabel(label) });
      } else out.push({ kind: 'text', text: raw });
    }
  }
  return out;
}

/** What a reader sees: text plus the ‹label› of every slot chip. */
export function visibleText(parts: readonly LinePart[]): string {
  return parts.map((p) => (p.kind === 'text' ? p.text : `‹${p.label}›`)).join('');
}

/** Bridge shape: the template's slots as three glyph cues — never angle-bracket tokens. */
export interface BridgePart {
  glyph: string;
  /** ≤2 words. */
  word: string;
  /** The whole truth. */
  name: string;
}

const BRIDGE_GLYPHS: Record<string, BridgePart> = {
  ack: { glyph: '◐', word: 'ack', name: 'Acknowledge what they just said, in one short beat' },
  referent: { glyph: '●', word: 'their word', name: "Say back the prospect's own word or phrase, exactly as they said it" },
  question: { glyph: '?', word: 'question', name: 'Then the one question this line asks' },
};

export function bridgeParts(template: string): BridgePart[] {
  const out: BridgePart[] = [];
  for (const m of template.matchAll(RAW_SLOT_RE)) {
    const name = m[1]!.slice(1, -1).split('|')[0]!;
    const known = BRIDGE_GLYPHS[name];
    out.push(known ?? { glyph: '◌', word: name.replace(/_/g, ' '), name: `Bridge part: ${name.replace(/_/g, ' ')}` });
  }
  return out;
}
