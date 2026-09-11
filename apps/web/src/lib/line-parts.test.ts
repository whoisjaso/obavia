import { describe, expect, it } from 'vitest';
import { loadScriptNodes } from '../../../../packages/domain/src/seeds';
import { resolveSlots } from '../../../../packages/domain/src/scripts';
import { bridgeParts, lineParts, visibleText } from './line-parts';

const FORBIDDEN = ['[missing:', '{', '}', '⟨', '⟩', '[Offer not approved', '[Price not approved', '[Fictional offer'];

describe('line parts (F3: no developer tokens on the stage)', () => {
  it('turns every resolveSlots cue into a slot chip', () => {
    const parts = lineParts('Hi [missing: prospect name], Jason with Apohenia — [Offer not approved: pillar 1 name] and [Price not approved yet — route to scope conversation].');
    expect(parts.filter((p) => p.kind === 'slot').map((p) => (p.kind === 'slot' ? [p.status, p.label] : []))).toEqual([
      ['missing', 'prospect name'],
      ['offer', 'pillar 1 name'],
      ['price', 'price'],
    ]);
    expect(visibleText(parts)).toBe('Hi ‹prospect name›, Jason with Apohenia — ‹pillar 1 name› and ‹price›.');
  });

  it('turns raw {slot} tokens into slot chips too (unresolved templates, mirrors)', () => {
    const parts = lineParts('Is this {prospect_name} at {dealership_name}?');
    expect(visibleText(parts)).toBe('Is this ‹prospect name› at ‹dealership name›?');
    const first = parts.find((p) => p.kind === 'slot');
    expect(first && first.kind === 'slot' ? first.slot : '').toBe('prospect_name');
  });

  it('never leaves a bracket, brace or angle token visible for any seed line, resolved with no facts', () => {
    const seed = loadScriptNodes();
    for (const node of seed.nodes) {
      const texts = [resolveSlots(node.primary_word_track, {}).text, ...node.mirror_variants.map((m) => resolveSlots(m, {}).text), node.primary_word_track];
      for (const t of texts) {
        const shown = visibleText(lineParts(t));
        for (const bad of FORBIDDEN) expect(shown, `${node.id}: ${shown}`).not.toContain(bad);
      }
    }
  });

  it('renders the bridge template as glyph cues, never angle tokens', () => {
    const parts = bridgeParts('{ack} — you mentioned {referent}. {question}');
    expect(parts.map((p) => p.glyph)).toEqual(['◐', '●', '?']);
    expect(parts.map((p) => p.word)).toEqual(['ack', 'their word', 'question']);
    for (const p of parts) expect(`${p.glyph} ${p.word}`).not.toMatch(/[{}⟨⟩[\]]/);
  });
});
