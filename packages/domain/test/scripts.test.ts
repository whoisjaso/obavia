import { describe, expect, it } from 'vitest';
import { loadOffers, loadScriptNodes, loadSourceQuestionRecords } from '../src/seeds';
import {
  DEFAULT_STOP_NODE_ID,
  ENTRYPOINTS,
  EXPECTED_NODE_COUNT,
  GLOBAL_STOP_BRANCH_LABEL,
  OFFER_NOT_APPROVED_CUE,
  PRICE_NOT_APPROVED_CUE,
  STOP_ANSWER_CATEGORY,
  canonicalJson,
  contentHash,
  editPrimaryWordTrack,
  effectiveBranches,
  entryNode,
  isEvidenceSatisfied,
  isOfferSlot,
  loadVersionGraph,
  nextNodeForBranch,
  nodeById,
  publicationApproval,
  publishVersion,
  renderNodeCard,
  resolveSlots,
  sha256Hex,
  slotsIn,
  stageOrder,
  stopNode,
  transitionLineOf,
  upsertWordTrackVariant,
  validateGraph,
  verifyPublication,
  wordTrackVariantFor,
} from '../src/scripts';
import { recordsCitedBy } from '../src/sources';

const seed = loadScriptNodes();
const version = seed.versions[0]!;
const nodes = seed.nodes;
const records = loadSourceQuestionRecords();
const studyOnly = new Set(records.filter((r) => r.use_classification === 'study_only').map((r) => r.id));
const draftOffer = loadOffers().offer_versions.find((o) => o.id === 'draft-research-offer-v0')!;
const fictionalOffer = loadOffers().offer_versions.find((o) => o.id === 'fictional-demo-inquiry-pilot')!;

describe('script seed', () => {
  it('is real content (no placeholder marker) with exactly 51 nodes in one draft version', () => {
    expect(seed._status).toBeUndefined();
    expect(seed.versions).toHaveLength(1);
    expect(nodes).toHaveLength(EXPECTED_NODE_COUNT);
    expect(version.id).toBe('dealership-inquiry-follow-through-v0.1');
    expect(version.status).toBe('draft');
    expect(version.immutable).toBe(false);
    expect(version.price_placement).toBe('after_pillars');
    expect(version.offer_version_id).toBe(draftOffer.id);
    expect(nodes.every((n) => n.approval.status === 'draft')).toBe(true);
  });

  it('validateGraph is ok against the 207 records', () => {
    const result = validateGraph(version, nodes, records);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.stats.nodes).toBe(51);
  });

  it('cites only real records and never a study_only id in a primary citation list', () => {
    for (const n of nodes) {
      const { missing } = recordsCitedBy(n.source_question_ids);
      expect(missing, `node ${n.id}`).toEqual([]);
      for (const id of n.source_question_ids) expect(studyOnly.has(id), `node ${n.id} cites ${id}`).toBe(false);
    }
    // study_only ids referenced only in source notes (L06, C06, U06, R04, O05 …)
    const notes = nodes.map((n) => n.source_note ?? '').join(' ');
    expect(notes).toMatch(/L06/);
    expect(notes).toMatch(/C06/);
  });

  it('graph is closed and every one of the six entrypoints has an entry node', () => {
    const ids = new Set(nodes.map((n) => n.id));
    for (const n of nodes) for (const b of n.branches) if (b.next_node_id !== null) expect(ids.has(b.next_node_id), `${n.id} → ${b.next_node_id}`).toBe(true);
    for (const ep of ENTRYPOINTS) {
      const entry = entryNode(version, nodes, ep);
      expect(entry, ep).toBeDefined();
      expect(entry!.role_applicability).toContain(ep);
    }
  });

  it('every node fills every field meaningfully (2+ examples, 2+ mirrors, bridge, overlay, branches)', () => {
    for (const n of nodes) {
      expect(n.primary_word_track.length, n.id).toBeGreaterThan(20);
      expect(n.sufficient_answer_examples.length, n.id).toBeGreaterThanOrEqual(2);
      expect(n.insufficient_answer_examples.length, n.id).toBeGreaterThanOrEqual(2);
      expect(n.mirror_variants.length, n.id).toBeGreaterThanOrEqual(2);
      expect(n.bridge_template, n.id).toMatch(/\{ack\}.*\{referent\}.*\{question\}/);
      expect(n.delivery_overlay.tone_cue, n.id).toMatch(/instructor-described|Apohenia/);
      expect(n.branches.length, n.id).toBeGreaterThan(0);
      expect(n.stop_or_skip_conditions.length, n.id).toBeGreaterThan(0);
      expect(n.why_this_now.length, n.id).toBeGreaterThan(20);
      expect(n.what_to_listen_for.length, n.id).toBeGreaterThan(10);
      expect(n.completion_criteria.length, n.id).toBeGreaterThan(20);
    }
  });

  it('Apohenia additions carry a source_note; the identity frame is practice_only and not an entry', () => {
    for (const n of nodes.filter((x) => x.source_question_ids.length === 0)) expect(n.source_note, n.id).toMatch(/Apohenia addition/);
    const frame = nodeById(nodes, 'identity-frame-study')!;
    expect(frame.practice_only).toBe(true);
    expect(Object.values(version.entry_node_ids)).not.toContain(frame.id);
  });

  it('stages are ordered', () => {
    expect(stageOrder('entry')).toBeLessThan(stageOrder('intent'));
    expect(stageOrder('pitch')).toBeLessThan(stageOrder('decision'));
    expect(stageOrder('nonsense')).toBeGreaterThan(stageOrder('upsell'));
    const graph = loadVersionGraph(version, nodes);
    expect(graph.nodes).toHaveLength(51);
    expect([...graph.byStage.keys()][0]).toBe('entry');
  });
});

describe('scenario 29 — primary wording is stable', () => {
  it('own-word edit never touches primary_word_track', () => {
    const node = nodeById(nodes, 'logical-change')!;
    const before = node.primary_word_track;
    const variants = upsertWordTrackVariant([], node.id, 'My own way of asking what they would change.', '2026-09-10T00:00:00.000Z');
    expect(wordTrackVariantFor(variants, node.id)?.own_text).toContain('My own way');
    expect(nodeById(nodes, 'logical-change')!.primary_word_track).toBe(before);
    const again = upsertWordTrackVariant(variants, node.id, 'Second edit', '2026-09-10T00:01:00.000Z');
    expect(again).toHaveLength(1);
    expect(node.primary_word_track).toBe(before);
  });

  it('selecting a mirror does not overwrite the primary line', () => {
    const node = nodeById(nodes, 'intent-experience')!;
    const before = node.primary_word_track;
    const card = renderNodeCard(node, { knownFacts: { stated_goal: 'same-day answers' } });
    const mirror = card.mirror_if_unclear[0]!;
    expect(mirror).not.toBe(card.say_this);
    expect(node.primary_word_track).toBe(before);
    expect(renderNodeCard(node).say_this).toContain('{stated_goal}'.replace('{stated_goal}', '[missing: stated goal]'));
  });

  it('a published version rejects primary edits; a draft accepts them', () => {
    const node = nodeById(nodes, 'cold-open')!;
    const pub = publishVersion(version, nodes, { publishedAt: '2026-09-10T00:00:00.000Z' });
    expect(() => editPrimaryWordTrack(pub.version, node, 'changed')).toThrow(/frozen/);
    expect(editPrimaryWordTrack(version, node, 'changed').primary_word_track).toBe('changed');
    expect(node.primary_word_track).not.toBe('changed');
    expect(Object.isFrozen(pub.nodes[0])).toBe(true);
  });
});

describe('scenario 3 — evidence-satisfied skip', () => {
  it('offers a transition instead of asking twice when the fact is known', () => {
    const node = nodeById(nodes, 'logical-process')!;
    expect(isEvidenceSatisfied(node, {}).satisfied).toBe(false);
    const check = isEvidenceSatisfied(node, { current_process: 'the sales@ inbox' });
    expect(check.satisfied).toBe(true);
    expect(check.transition).toContain('the sales@ inbox');
    const card = renderNodeCard(node, { knownFacts: { current_process: 'the sales@ inbox' } });
    expect(card.evidence.satisfied).toBe(true);
    expect(card.routing_notes.join(' ')).toMatch(/Evidence-satisfied/);
  });

  it('B-11: the transition is the quoted line of the rule, never the rule sentence itself', () => {
    const node = nodeById(nodes, 'logical-process')!;
    const check = isEvidenceSatisfied(node, { current_process: 'the sales@ inbox' });
    expect(check.transition).toBe('You said the inquiries go to the sales@ inbox. How long has it worked that way?');
    expect(check.transition).not.toMatch(/^If the /);
    expect(check.rule).toBe(node.facts_already_known_rule);
    expect(transitionLineOf(node.facts_already_known_rule)).toBe('You said the inquiries go to {current_process}. How long has it worked that way?');
    // A rule with guidance but no spoken line: satisfied, rule shown, no transition invented.
    const fit = nodeById(nodes, 'pitch-fit')!;
    const fitCheck = isEvidenceSatisfied(fit, { fit_assessment: 'the named handoff is the piece' });
    expect(fitCheck.satisfied).toBe(true);
    expect(fitCheck.transition).toBeNull();
    expect(fitCheck.rule).toMatch(/do not re-ask/);
    // Every quoted transition in the seed resolves fully once its satisfying facts are known (B-6 class of fault).
    for (const n of nodes) {
      const quoted = transitionLineOf(n.facts_already_known_rule);
      if (!quoted) continue;
      const facts = Object.fromEntries((n.satisfied_by_facts ?? []).map((k) => [k, `<${k}>`]));
      const check2 = isEvidenceSatisfied(n, facts);
      expect(check2.satisfied, n.id).toBe(true);
      expect(check2.transition, n.id).not.toMatch(/\[missing:/);
    }
  });

  it('B-6: emotional-prevented-shifted can actually be satisfied by its transition slot', () => {
    const node = nodeById(nodes, 'emotional-prevented-shifted')!;
    expect(node.satisfied_by_facts).toEqual(['shift_reason']);
    expect(isEvidenceSatisfied(node, {}).satisfied).toBe(false);
    const check = isEvidenceSatisfied(node, { shift_reason: 'the new GM owns the internet desk now' });
    expect(check.satisfied).toBe(true);
    expect(check.transition).toContain('the new GM owns the internet desk now');
    expect(check.transition).not.toContain('{shift_reason}');
  });
});

describe('scenarios 6 and 38 — null / fictional price never becomes a number', () => {
  it('draft offer with null price renders the cue and no digits in say_this', () => {
    const node = nodeById(nodes, 'decision-price')!;
    const card = renderNodeCard(node, { offer: draftOffer, knownFacts: { dealership_name: 'Northgate Motors' } });
    expect(card.say_this).toContain(PRICE_NOT_APPROVED_CUE);
    expect(card.say_this).not.toMatch(/\$|\d/);
    expect(card.missing_slots).toContain('approved_price');
    expect(card.routing_notes).toContain(PRICE_NOT_APPROVED_CUE);
    expect(card.mirror_if_unclear.join(' ')).not.toMatch(/\d/);
  });

  it('fictional offer price is never interpolated even though it is set', () => {
    const node = nodeById(nodes, 'decision-price')!;
    const card = renderNodeCard(node, { offer: fictionalOffer });
    expect(card.say_this).not.toMatch(/750|150|\$/);
    expect(card.routing_notes.join(' ')).toMatch(/Fictional/);
  });

  it('a published non-fictional offer with a complete price is quoted exactly', () => {
    const approved = { ...draftOffer, status: 'published' as const, price: { ...draftOffer.price, setup_minor_units: 120000, recurring_minor_units: 30000 } };
    const card = renderNodeCard(nodeById(nodes, 'decision-price')!, { offer: approved });
    expect(card.say_this).toContain('$1,200.00');
    expect(card.say_this).toContain('$300.00');
  });

  it('B-2: a draft offer\'s pillar wording is NOT spoken — the cue shows until the offer is published', () => {
    const node = nodeById(nodes, 'pitch-pillar-1')!;
    const card = renderNodeCard(node, { offer: draftOffer });
    expect(card.say_this).not.toContain(draftOffer.pillars[0]!.name);
    expect(card.say_this).toContain(`[${OFFER_NOT_APPROVED_CUE}: pillar 1 name]`);
    expect(card.say_this).toContain('[missing: stated problem]');
    expect(card.missing_slots).toEqual(['pillar_1_name', 'stated_problem', 'pillar_1_delivery']);
    expect(card.routing_notes.join(' ')).toMatch(/is draft; pillar wording is not spoken/);
    // reviewed is still not approved
    expect(renderNodeCard(node, { offer: { ...draftOffer, status: 'reviewed' } }).say_this).not.toContain(draftOffer.pillars[0]!.name);
    // published: the offer object supplies the pillar exactly
    const published = renderNodeCard(node, { offer: { ...draftOffer, status: 'published' } });
    expect(published.say_this).toContain(draftOffer.pillars[0]!.name);
    expect(published.say_this).toContain(draftOffer.pillars[0]!.delivery);
    expect(published.missing_slots).toEqual(['stated_problem']);
  });

  it('B-3: known facts named like offer slots never bypass the offer-approval gate', () => {
    const facts = { approved_price: '$99 a month', pillar_1_name: 'Magic pillar', pillar_1_delivery: 'we just do it', stated_problem: 'evening inquiries sit' };
    expect(isOfferSlot('approved_price')).toBe(true);
    expect(isOfferSlot('pillar_2_delivery')).toBe(true);
    expect(isOfferSlot('stated_problem')).toBe(false);
    const price = renderNodeCard(nodeById(nodes, 'decision-price')!, { knownFacts: facts, offer: draftOffer });
    expect(price.say_this).not.toContain('$99');
    expect(price.say_this).toContain(PRICE_NOT_APPROVED_CUE);
    const noOffer = renderNodeCard(nodeById(nodes, 'decision-price')!, { knownFacts: facts });
    expect(noOffer.say_this).not.toContain('$99');
    const pillar = renderNodeCard(nodeById(nodes, 'pitch-pillar-1')!, { knownFacts: facts, offer: draftOffer });
    expect(pillar.say_this).not.toContain('Magic pillar');
    expect(pillar.say_this).not.toContain('we just do it');
    expect(pillar.say_this).toContain('evening inquiries sit'); // ordinary facts still fill
    expect(resolveSlots('{pillar_3_name}', { knownFacts: { pillar_3_name: 'x' } }).text).toBe('[missing: pillar 3 name]');
  });
});

describe('scenario 40 / B-1 — refusal / opt-out reaches the stop node from EVERY node', () => {
  it('the version names its stop node; exit-stop is terminal, in the exit stage, not practice-only', () => {
    expect(version.stop_node_id).toBe(DEFAULT_STOP_NODE_ID);
    const stop = stopNode(version, nodes)!;
    expect(stop.id).toBe('exit-stop');
    expect(stop.stage).toBe('exit');
    expect(stop.practice_only).toBeFalsy();
    expect(stop.branches.every((b) => b.next_node_id === null)).toBe(true);
  });

  it('opt_out resolves to exit-stop from every one of the 51 nodes, explicit or implicit', () => {
    let explicit = 0;
    let implicit = 0;
    for (const n of nodes) {
      if (n.id === 'exit-stop') {
        expect(effectiveBranches(n, version).some((b) => b.answer_category === STOP_ANSWER_CATEGORY)).toBe(false);
        continue;
      }
      const res = nextNodeForBranch(n, STOP_ANSWER_CATEGORY, nodes, version);
      expect(res, n.id).toBeDefined();
      expect(res!.next?.id, n.id).toBe('exit-stop');
      if (res!.branch.implicit) {
        implicit += 1;
        expect(res!.branch.label).toBe(GLOBAL_STOP_BRANCH_LABEL);
      } else explicit += 1;
      // The rendered card shows the route too, marked implicit when synthesised.
      const card = renderNodeCard(n, { version });
      const shown = card.next_branches.find((b) => b.answer_category === STOP_ANSWER_CATEGORY)!;
      expect(shown.next_node_id, n.id).toBe('exit-stop');
      expect(Boolean(shown.implicit)).toBe(Boolean(res!.branch.implicit));
    }
    expect(explicit).toBeGreaterThan(8);
    expect(implicit).toBeGreaterThan(30);
    expect(explicit + implicit).toBe(50);
    // Without a version the "exit-stop" convention applies; the node's own data is untouched.
    expect(nextNodeForBranch(nodeById(nodes, 'logical-process')!, 'opt_out', nodes)?.next?.id).toBe('exit-stop');
    expect(nodeById(nodes, 'logical-process')!.branches.some((b) => b.answer_category === 'opt_out')).toBe(false);
  });

  it('validateGraph asserts the global stop rule', () => {
    const noStop = validateGraph({ ...version, stop_node_id: 'no-such-node' }, nodes, records);
    expect(noStop.ok).toBe(false);
    expect(noStop.errors.join('\n')).toMatch(/stop node no-such-node is missing/);
    const notTerminal = nodes.map((n) => (n.id === 'exit-stop' ? { ...n, branches: [{ label: 'Loop', answer_category: 'end', next_node_id: 'exit-no-sale' }] } : n));
    expect(validateGraph(version, notTerminal, records).errors.join('\n')).toMatch(/must be terminal/);
    const misrouted = nodes.map((n) => (n.id === 'cold-open' ? { ...n, branches: n.branches.map((b) => (b.answer_category === 'opt_out' ? { ...b, next_node_id: 'exit-no-sale' } : b)) } : n));
    expect(validateGraph(version, misrouted, records).errors.join('\n')).toMatch(/cold-open routes opt_out to exit-no-sale/);
  });

  it('B-10 / B-6: validateGraph rejects undeclared spoken slots and unsatisfiable transitions', () => {
    const fit = nodeById(nodes, 'pitch-fit')!;
    expect(fit.required_context).toContain('{key_pillar}');
    expect(slotsIn(fit.mirror_variants.join(' '))).toContain('key_pillar');
    const undeclared = nodes.map((n) => (n.id === 'pitch-fit' ? { ...n, required_context: n.required_context.filter((r) => r !== '{key_pillar}') } : n));
    expect(validateGraph(version, undeclared, records).errors.join('\n')).toMatch(/pitch-fit speaks undeclared slot \{key_pillar\}/);
    const unsatisfiable = nodes.map((n) => (n.id === 'emotional-prevented-shifted' ? { ...n, satisfied_by_facts: [] } : n));
    expect(validateGraph(version, unsatisfiable, records).errors.join('\n')).toMatch(/emotional-prevented-shifted.*can never be/);
  });

  it('B-4: the concern-certainty mirrors seek the same answer type (certainty + the evidence that resolves it)', () => {
    const node = nodeById(nodes, 'concern-certainty')!;
    for (const m of node.mirror_variants) {
      expect(m, m).toMatch(/\?$/);
      expect(m.toLowerCase(), m).not.toMatch(/why this has not been fixed|never comes/);
      expect(m.toLowerCase(), m).toMatch(/certainty|in writing|safe first step|pilot|acceptance/);
    }
  });

  it('declined is an accepted branch on the decision-history and price nodes', () => {
    expect(nextNodeForBranch(nodeById(nodes, 'emotional-history')!, 'declined', nodes)?.next?.id).toBe('future-tangible');
    expect(nextNodeForBranch(nodeById(nodes, 'decision-price')!, 'declined', nodes)?.next?.id).toBe('exit-no-sale');
    expect(nextNodeForBranch(nodeById(nodes, 'decision-price')!, 'not_a_branch', nodes)).toBeUndefined();
  });
});

describe('consequence node — no required emotional word', () => {
  it('completion criteria contain no required feeling word', () => {
    const c = nodeById(nodes, 'consequence-trajectory')!;
    const lower = c.completion_criteria.toLowerCase();
    // The criteria may mention the words only to exclude them.
    expect(lower).toMatch(/never a completion condition|no specific emotional word/);
    expect(lower).not.toMatch(/must (say|feel|express) (regret|fear|pain)/);
    expect(c.source_question_ids).not.toContain('C06');
    expect(c.source_note).toMatch(/C06/);
  });
});

describe('assistance-mode masking', () => {
  const node = nodeById(nodes, 'intent-tangible')!;
  it('full_script shows everything by default', () => {
    const card = renderNodeCard(node);
    expect(card.assistance_mode).toBe('full_script');
    expect(card.say_this).toBeTruthy();
    expect(card.tone_pacing?.label).toBe('instructor-described');
    expect(card.mirror_if_unclear).toHaveLength(2);
  });
  it('recall_with_reveal hides the line until revealed', () => {
    expect(renderNodeCard(node, { assistanceMode: 'recall_with_reveal' }).say_this).toBeNull();
    expect(renderNodeCard(node, { assistanceMode: 'recall_with_reveal', revealed: true }).say_this).toBeTruthy();
  });
  it('primary_plus_mirror, stage_purpose_cue and unassisted mask as documented', () => {
    const ppm = renderNodeCard(node, { assistanceMode: 'primary_plus_mirror' });
    expect(ppm.say_this).toBeTruthy();
    expect(ppm.why_this_now).toBeNull();
    const cue = renderNodeCard(node, { assistanceMode: 'stage_purpose_cue' });
    expect(cue.say_this).toBeNull();
    expect(cue.why_this_now).toBeTruthy();
    const un = renderNodeCard(node, { assistanceMode: 'unassisted' });
    expect(un.say_this).toBeNull();
    expect(un.why_this_now).toBeNull();
    expect(un.next_branches).toEqual([]);
    expect(un.stage_label).toBe('Intent');
  });
});

describe('publication + hash', () => {
  it('sha256 matches the standard vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('a'.repeat(1000))).toBe('41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3');
  });
  it('canonical JSON is key-order independent', () => {
    expect(canonicalJson({ b: 1, a: [{ d: 2, c: 3 }] })).toBe(canonicalJson({ a: [{ c: 3, d: 2 }], b: 1 }));
  });
  it('publishVersion yields a stable 64-hex hash independent of publish time and verifies', () => {
    const p1 = publishVersion(version, nodes, { publishedAt: '2026-09-10T00:00:00.000Z' });
    const p2 = publishVersion(version, nodes, { publishedAt: '2026-09-11T00:00:00.000Z' });
    expect(p1.content_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(p1.content_hash).toBe(p2.content_hash);
    expect(p1.content_hash).toBe(contentHash(version, nodes));
    expect(p1.version.immutable).toBe(true);
    expect(p1.version.status).toBe('published');
    expect(p1.nodes).toHaveLength(51);
    expect(verifyPublication(p1)).toBe(true);
    expect(version.immutable).toBe(false); // input untouched
    const tampered = { ...p1, nodes: p1.nodes.map((n, i) => (i === 0 ? { ...n, primary_word_track: 'x' } : n)) };
    expect(verifyPublication(tampered)).toBe(false);
  });

  it('B-5: publishing freezes wording only — 51 draft nodes stay draft and the snapshot is a "frozen draft"', () => {
    const pub = publishVersion(version, nodes, { publishedAt: '2026-09-10T00:00:00.000Z' });
    expect(pub.nodes.every((n) => n.approval.status === 'draft')).toBe(true);
    const approval = publicationApproval(pub);
    expect(approval.label).toBe('frozen draft');
    expect(approval.counts).toEqual({ draft: 51, reviewed: 0, published: 0, retired: 0 });
    expect(approval.name).toMatch(/^Frozen draft: wording is frozen but nodes are not approved/);
    const allPublished = { ...pub, nodes: pub.nodes.map((n) => ({ ...n, approval: { status: 'published' as const } })) };
    expect(publicationApproval(allPublished).label).toBe('published');
    const mixed = { ...pub, nodes: pub.nodes.map((n, i) => (i === 0 ? { ...n, approval: { status: 'reviewed' as const } } : n)) };
    expect(publicationApproval(mixed).label).toBe('frozen mixed');
  });
});
