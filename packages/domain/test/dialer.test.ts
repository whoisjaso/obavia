/**
 * Sequential dialer (brief §9) — reducer invariants, live gate, simulator determinism, playback
 * schedule, queue policy and DNC suppression. Pure Node; no timers (TICK is fed explicitly).
 */
import { describe, expect, it } from 'vitest';
import { loadScriptNodes, loadSyntheticProspects, loadSyntheticTranscripts } from '../src/seeds';
import { DialSession, QueueItem as QueueItemSchema } from '../src/schemas/dialer';
import {
  ARM_MS,
  COOLDOWN_MS,
  DIAL_MS,
  OUTCOME_CYCLE,
  activeCall,
  armingCount,
  buildQueue,
  computeStats,
  countdownRemaining,
  demoQueue,
  formatClock,
  initialSession,
  knownFactsFor,
  liveGateReasons,
  nextScriptNodeHint,
  nextUp,
  pickTranscript,
  playbackSchedule,
  playedTurns,
  precheck,
  reduce,
  simulateDial,
  turnsInOrder,
  type DialContext,
  type DialEvent,
} from '../src/dialer';
import { prospectRows } from '../src/vocabulary';

const DEMO: DialContext = { mode: 'demo' };
const AT = '2026-09-11T15:00:00.000Z';
const seed = loadSyntheticProspects();
const transcripts = loadSyntheticTranscripts().transcripts;
const nodes = loadScriptNodes().nodes;

function start(ctx: DialContext = DEMO, queue = demoQueue()) {
  return reduce(initialSession(queue, ctx.mode), { type: 'START_SESSION', session_id: 's1', queue, at: AT }, ctx);
}

function run(state: ReturnType<typeof start>, events: DialEvent[], ctx: DialContext = DEMO) {
  return events.reduce((s, e) => reduce(s, e, ctx), state);
}

const tick = (ms: number): DialEvent => ({ type: 'TICK', ms, at: AT });

/** Arm → dial → ring → connected, in one go. */
function connect(state: ReturnType<typeof start>, ctx: DialContext = DEMO) {
  return run(state, [tick(ARM_MS), tick(DIAL_MS), { type: 'DIAL_RESULT', result: 'connected', at: AT, transcript_id: 'syn-a-profit-not-revenue' }], ctx);
}

describe('synthetic prospect seed + queue', () => {
  it('parses, is fictional, keeps locations/contacts/endpoints separate, and validates every item', () => {
    expect(seed._status).toBeUndefined();
    expect(seed.contacts.length).toBe(10);
    expect(seed.endpoints.every((e) => e.contact_policy === 'requires_review' && e.jurisdiction === 'unknown' && e.verified_at === null)).toBe(true);
    // Two locations share one switchboard; two contacts share one number.
    expect(seed.locations.filter((l) => l.switchboard_endpoint_id === 'ep-002')).toHaveLength(2);
    expect(seed.contacts.filter((c) => c.endpoint_ids.includes('ep-003'))).toHaveLength(2);
    const q = demoQueue();
    for (const item of q) expect(QueueItemSchema.safeParse(item).success).toBe(true);
    expect(q.map((i) => i.contact_id)).toEqual(['ct-dana', 'ct-copper-south-gm', 'ct-elena', 'ct-harbor-internet', 'ct-tom', 'ct-ray', 'ct-priya', 'ct-marcus', 'ct-simone', 'ct-victor']);
  });

  it('marks demo items allow, live items requires_review, and the opt-out contact suppressed in both modes', () => {
    const demo = buildQueue(seed, { mode: 'demo' });
    const live = buildQueue(seed, { mode: 'live' });
    expect(demo.filter((i) => i.policy_status === 'allow')).toHaveLength(9);
    expect(demo.find((i) => i.contact_id === 'ct-victor')?.policy_status).toBe('suppressed');
    expect(live.filter((i) => i.policy_status === 'requires_review')).toHaveLength(9);
    expect(live.find((i) => i.contact_id === 'ct-victor')?.policy_status).toBe('suppressed');
    // A durable suppression list flips an item to suppressed.
    const withDnc = buildQueue(seed, { mode: 'demo', suppressed: ['+15550100001'] });
    expect(withDnc.find((i) => i.contact_id === 'ct-dana')?.policy_status).toBe('suppressed');
  });

  it('crm.ts reads the same seed (one source of truth)', () => {
    const rows = prospectRows();
    expect(rows).toHaveLength(seed.contacts.length);
    expect(rows.find((r) => r.contact.id === 'ct-victor')?.suppression).toBe('opt_out_requested');
    expect(rows.find((r) => r.contact.id === 'ct-marcus')?.endpoints.map((e) => e.id)).toEqual(['ep-002', 'ep-009']);
  });

  it('derives slot facts from the record only (never invents a name)', () => {
    const q = demoQueue();
    expect(knownFactsFor(q[0]!)).toEqual({ dealership_name: 'Riverbend Motors', prospect_name: 'Dana' });
    expect(knownFactsFor(q[1]!)).toEqual({ dealership_name: 'Copper Ridge Auto Group' });
    expect(knownFactsFor(q[2]!)).toMatchObject({ prospect_name: 'Elena', documented_action: expect.stringContaining('website') });
  });
});

describe('precheck', () => {
  const q = demoQueue();
  it('allows in demo with reason "demo"', () => {
    expect(precheck(q[0]!, DEMO)).toEqual({ decision: 'allow', reasons: ['demo'] });
  });
  it('denies suppressed numbers in every mode', () => {
    const victor = q.find((i) => i.contact_id === 'ct-victor')!;
    expect(precheck(victor, DEMO).decision).toBe('deny');
    expect(precheck(q[0]!, { mode: 'demo', suppressed: [q[0]!.phone] }).decision).toBe('deny');
  });
  it('in live mode refuses without the gate and returns requires_review with it', () => {
    const live = buildQueue(seed, { mode: 'live' });
    expect(precheck(live[0]!, { mode: 'live' }).decision).toBe('deny');
    const gated: DialContext = { mode: 'live', live: { telephony_configured: true, policy_reviewed: true, sequential_session_flag: true } };
    expect(precheck(live[0]!, gated)).toEqual({ decision: 'requires_review', reasons: ['contact policy requires review'] });
    expect(precheck({ ...live[0]!, policy_status: 'allow' }, gated).decision).toBe('allow');
  });
});

describe('session reducer — start, arm, dial', () => {
  it('starts in demo, arms the first allowed record, counts 3 → 2 → 1, then dials and rings', () => {
    let s = start();
    expect(s.status).toBe('arming');
    expect(s.id).toBe('s1');
    expect(nextUp(s, DEMO)?.contact).toBe('Dana Whitlock');
    expect(armingCount(s)).toBe(3);
    s = reduce(s, tick(1000), DEMO);
    expect(armingCount(s)).toBe(2);
    s = reduce(s, tick(1000), DEMO);
    expect(armingCount(s)).toBe(1);
    expect(countdownRemaining(s)).toBeCloseTo(1 / 3, 5);
    s = reduce(s, tick(1000), DEMO);
    expect(s.status).toBe('dialing');
    expect(s.attempts).toHaveLength(1);
    expect(s.attempts[0]!.n).toBe(1);
    s = reduce(s, tick(DIAL_MS), DEMO);
    expect(s.status).toBe('ringing');
    expect(s.stats.dials).toBe(1);
    expect(DialSession.safeParse(s).success).toBe(true);
  });

  it('a live session REFUSES to start unless telephony, reviewed policy and the sequential flag are all true', () => {
    const live = buildQueue(seed, { mode: 'live' });
    const none = reduce(initialSession(live, 'live'), { type: 'START_SESSION', session_id: 'L', queue: live, at: AT }, { mode: 'live' });
    expect(none.status).toBe('idle');
    expect(none.refusal?.reasons).toHaveLength(3);
    expect(none.attempts).toHaveLength(0);
    for (const missing of ['telephony_configured', 'policy_reviewed', 'sequential_session_flag'] as const) {
      const gate = { telephony_configured: true, policy_reviewed: true, sequential_session_flag: true, [missing]: false };
      const r = reduce(initialSession(live, 'live'), { type: 'START_SESSION', session_id: 'L', queue: live, at: AT }, { mode: 'live', live: gate });
      expect(r.status, missing).toBe('idle');
      expect(r.refusal?.reasons).toHaveLength(1);
    }
    expect(liveGateReasons({ mode: 'live', live: { telephony_configured: true, policy_reviewed: true, sequential_session_flag: true } })).toEqual([]);
  });

  it('with the live gate satisfied but every record requires_review, the checks skip each record and the session ends queue_empty — nothing is dialed', () => {
    const live = buildQueue(seed, { mode: 'live' });
    const ctx: DialContext = { mode: 'live', live: { telephony_configured: true, policy_reviewed: true, sequential_session_flag: true } };
    const s = reduce(initialSession(live, 'live'), { type: 'START_SESSION', session_id: 'L', queue: live, at: AT }, ctx);
    expect(s.status).toBe('ended');
    expect(s.ended_reason).toBe('queue_empty');
    expect(s.attempts.every((a) => a.status === 'skipped')).toBe(true);
    expect(s.stats.dials).toBe(0);
  });

  it('cancels the arming countdown (tap again / Esc) into paused, and resume re-arms the same record', () => {
    let s = run(start(), [tick(1500), { type: 'CANCEL_ARM', at: AT }]);
    expect(s.status).toBe('paused');
    expect(s.pause_reason).toBe('user');
    expect(s.attempts).toHaveLength(0);
    s = reduce(s, { type: 'RESUME', at: AT }, DEMO);
    expect(s.status).toBe('arming');
    expect(s.elapsed_ms).toBe(0);
    expect(nextUp(s, DEMO)?.contact).toBe('Dana Whitlock');
  });

  it('re-runs the checks at the end of the countdown: a number suppressed meanwhile is skipped and logged, the next record arms', () => {
    const q = demoQueue();
    let s = start();
    // Suppression arrives from outside (another tab / durable list) while the countdown runs.
    const ctx: DialContext = { mode: 'demo', suppressed: [q[0]!.phone] };
    s = reduce(s, tick(ARM_MS), ctx);
    expect(s.status).toBe('arming');
    expect(s.cursor).toBe(1);
    expect(s.attempts[0]).toMatchObject({ status: 'skipped', n: 0, item_id: q[0]!.id });
    expect(s.attempts[0]!.skip_reasons.join(' ')).toMatch(/suppressed/);
    expect(s.log.some((l) => l.kind === 'skip')).toBe(true);
    expect(s.stats.dials).toBe(0);
  });

  it('PAUSE(checks_failed) pauses the sequencing without dialing', () => {
    const s = run(start(), [tick(500), { type: 'PAUSE', reason: 'checks_failed', at: AT }]);
    expect(s.status).toBe('paused');
    expect(s.pause_reason).toBe('checks_failed');
    expect(s.attempts).toHaveLength(0);
  });
});

describe('session reducer — call, disposition, cooldown', () => {
  it('connected → END_CALL → wrapup requires a disposition before the cooldown; then cooldown arms the next record', () => {
    let s = connect(start());
    expect(s.status).toBe('connected');
    expect(activeCall(s)?.contact).toBe('Dana Whitlock');
    s = reduce(s, tick(4000), DEMO);
    expect(s.attempts[0]!.talk_ms).toBe(4000);
    // No new dial can begin while a call is active.
    expect(reduce(s, { type: 'ARM', at: AT }, DEMO).status).toBe('connected');
    expect(reduce(s, tick(ARM_MS * 10), DEMO).status).toBe('connected');
    s = reduce(s, { type: 'END_CALL', at: AT }, DEMO);
    expect(s.status).toBe('wrapup');
    // Ticks in wrap-up never advance; ARM/RESUME are refused.
    s = reduce(s, tick(COOLDOWN_MS * 3), DEMO);
    expect(s.status).toBe('wrapup');
    expect(reduce(s, { type: 'ARM', at: AT }, DEMO).status).toBe('wrapup');
    s = reduce(s, { type: 'DISPOSITION', kind: 'meeting', at: AT }, DEMO);
    expect(s.status).toBe('cooldown');
    expect(s.attempts[0]!.disposition?.kind).toBe('meeting');
    expect(s.stats).toMatchObject({ dials: 1, connects: 1, talked: 1, next_steps: 1, talk_ms: 4000 });
    expect(nextUp(s, DEMO)?.contact).toBe('Unknown (switchboard only)');
    s = reduce(s, tick(COOLDOWN_MS), DEMO);
    expect(s.status).toBe('arming');
    expect(s.cursor).toBe(1);
  });

  it('a non-connected dial result goes straight to wrap-up (disposition still required)', () => {
    let s = run(start(), [tick(ARM_MS), tick(DIAL_MS), { type: 'DIAL_RESULT', result: 'no_answer', at: AT }]);
    expect(s.status).toBe('wrapup');
    expect(s.attempts[0]!.dial_result).toBe('no_answer');
    s = reduce(s, { type: 'DISPOSITION', kind: 'no_answer', at: AT }, DEMO);
    expect(s.status).toBe('cooldown');
    expect(s.stats).toMatchObject({ dials: 1, connects: 0, talked: 0, next_steps: 0 });
  });

  it('ARM during cooldown skips the wait; PAUSE during cooldown pauses; END_SESSION ends', () => {
    const base = run(connect(start()), [{ type: 'END_CALL', at: AT }, { type: 'DISPOSITION', kind: 'talked', at: AT }]);
    expect(base.status).toBe('cooldown');
    expect(reduce(base, { type: 'ARM', at: AT }, DEMO).status).toBe('arming');
    const paused = reduce(base, { type: 'PAUSE', reason: 'user', at: AT }, DEMO);
    expect(paused.status).toBe('paused');
    const ended = reduce(base, { type: 'END_SESSION', at: AT }, DEMO);
    expect(ended.status).toBe('ended');
    expect(ended.ended_reason).toBe('user');
  });

  it('an inbound ring during an active call never drops the call: the pause applies after the disposition', () => {
    let s = reduce(connect(start()), { type: 'PAUSE', reason: 'inbound', at: AT }, DEMO);
    expect(s.status).toBe('connected');
    expect(s.pause_requested).toBe('inbound');
    s = run(s, [{ type: 'END_CALL', at: AT }, { type: 'DISPOSITION', kind: 'callback', callback_at: '2026-09-12T15:00:00.000Z', at: AT }]);
    expect(s.status).toBe('paused');
    expect(s.pause_reason).toBe('inbound');
    expect(s.attempts[0]!.disposition?.callback_at).toBe('2026-09-12T15:00:00.000Z');
  });

  it('an inbound ring while ringing cancels that dial (no result) and pauses; resume re-arms the same record', () => {
    let s = run(start(), [tick(ARM_MS), tick(DIAL_MS), { type: 'PAUSE', reason: 'inbound', at: AT }]);
    expect(s.status).toBe('paused');
    expect(s.attempts[0]!.status).toBe('cancelled');
    expect(s.stats.dials).toBe(0);
    s = reduce(s, { type: 'RESUME', at: AT }, DEMO);
    expect(s.status).toBe('arming');
    expect(nextUp(s, DEMO)?.contact).toBe('Dana Whitlock');
  });

  it('END_SESSION during a call ends the call, still demands the disposition, then ends', () => {
    let s = reduce(connect(start()), { type: 'END_SESSION', at: AT }, DEMO);
    expect(s.status).toBe('wrapup');
    expect(s.end_requested).toBe(true);
    s = reduce(s, { type: 'DISPOSITION', kind: 'no_fit', at: AT }, DEMO);
    expect(s.status).toBe('ended');
    expect(s.ended_reason).toBe('user');
  });

  it('do_not_call writes a suppression entry and that number is never dialed again in the session', () => {
    const q = demoQueue();
    let s = run(connect(start()), [{ type: 'END_CALL', at: AT }, { type: 'DISPOSITION', kind: 'do_not_call', at: AT }]);
    expect(s.suppression).toEqual([{ phone: q[0]!.phone, item_id: q[0]!.id, contact: 'Dana Whitlock', at: AT, reason: 'do_not_call', session_id: 's1' }]);
    expect(precheck(q[0]!, DEMO, s).decision).toBe('deny');
    // Even if the record came around again it is skipped.
    s = { ...s, cursor: 0 };
    s = reduce(s, { type: 'ARM', at: AT }, DEMO);
    expect(s.status).toBe('arming');
    expect(s.cursor).toBe(1);
    expect(s.attempts.filter((a) => a.item_id === q[0]!.id && a.status === 'skipped')).toHaveLength(1);
    // And durable suppression keeps it out of a NEW session's queue.
    const next = start({ mode: 'demo', suppressed: [q[0]!.phone] }, demoQueue([q[0]!.phone]));
    expect(nextUp(next, DEMO)?.contact).not.toBe('Dana Whitlock');
    expect(next.queue.find((i) => i.contact_id === 'ct-dana')?.policy_status).toBe('suppressed');
  });

  it('dials every allowed record once and ends cleanly on queue_empty; the suppressed opt-out record is never dialed', () => {
    let s = start();
    let guard = 0;
    while (s.status !== 'ended' && guard < 100) {
      guard += 1;
      switch (s.status) {
        case 'arming':
          s = reduce(s, tick(ARM_MS), DEMO);
          break;
        case 'dialing':
          s = reduce(s, tick(DIAL_MS), DEMO);
          break;
        case 'ringing': {
          const n = s.attempts.filter((a) => a.n > 0).length - 1;
          s = reduce(s, { type: 'DIAL_RESULT', result: simulateDial(n).result, at: AT }, DEMO);
          break;
        }
        case 'connected':
          s = run(s, [tick(3000), { type: 'END_CALL', at: AT }]);
          break;
        case 'wrapup':
          s = reduce(s, { type: 'DISPOSITION', kind: s.attempts[s.attempts.length - 1]!.dial_result === 'connected' ? 'talked' : 'no_answer', at: AT }, DEMO);
          break;
        case 'cooldown':
          s = reduce(s, tick(COOLDOWN_MS), DEMO);
          break;
        default:
          throw new Error(`unexpected ${s.status}`);
      }
    }
    expect(s.status).toBe('ended');
    expect(s.ended_reason).toBe('queue_empty');
    expect(s.stats.dials).toBe(9);
    expect(s.attempts.filter((a) => a.n > 0).map((a) => a.item_id)).not.toContain('q-ct-victor');
    expect(s.attempts.find((a) => a.item_id === 'q-ct-victor')?.status).toBe('skipped');
    expect(s.stats.connects).toBe(5);
    expect(s.stats.talked).toBe(5);
    expect(DialSession.safeParse(s).success).toBe(true);
  });

  it('SKIP advances past the current record', () => {
    const s = reduce(start(), { type: 'SKIP', reason: 'not now', at: AT }, DEMO);
    expect(s.status).toBe('arming');
    expect(s.cursor).toBe(1);
    expect(s.attempts[0]).toMatchObject({ status: 'skipped', skip_reasons: ['not now'] });
  });

  it('ignores events that are invalid for the status (no throw, same state)', () => {
    const idle = initialSession(demoQueue());
    expect(reduce(idle, tick(1000), DEMO)).toBe(idle);
    expect(reduce(idle, { type: 'END_CALL', at: AT }, DEMO)).toBe(idle);
    expect(reduce(idle, { type: 'DISPOSITION', kind: 'talked', at: AT }, DEMO)).toBe(idle);
    const arming = start();
    expect(reduce(arming, { type: 'DIAL_RESULT', result: 'connected', at: AT }, DEMO)).toBe(arming);
    expect(reduce(arming, { type: 'START_SESSION', session_id: 'x', queue: demoQueue(), at: AT }, DEMO)).toBe(arming);
  });
});

describe('stats', () => {
  it('counts dials, connects, conversations and next steps without inference', () => {
    expect(computeStats([], 0)).toEqual({ dials: 0, connects: 0, talked: 0, next_steps: 0, talk_ms: 0, session_ms: 0 });
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(134_000)).toBe('02:14');
    expect(formatClock(3_725_000)).toBe('1:02:05');
  });
});

describe('simulator', () => {
  it('cycles connected / no_answer / connected / voicemail / connected / gatekeeper deterministically', () => {
    expect(OUTCOME_CYCLE).toEqual(['connected', 'no_answer', 'connected', 'voicemail', 'connected', 'gatekeeper']);
    const a = Array.from({ length: 12 }, (_, i) => simulateDial(i).result);
    const b = Array.from({ length: 12 }, (_, i) => simulateDial(i).result);
    expect(a).toEqual(b);
    expect(a.slice(0, 6)).toEqual([...OUTCOME_CYCLE]);
    expect(a[6]).toBe('connected');
    expect(simulateDial(1).ring_ms).toBeGreaterThan(simulateDial(0).ring_ms);
  });

  it('picks the contact’s own transcript when it has one, else a listener fixture by index (never the opt-out call)', () => {
    const q = demoQueue();
    expect(pickTranscript(q[0]!, 0, transcripts)?.call_id).toBe('syn-a-profit-not-revenue');
    const fb1 = pickTranscript(q[1]!, 1, transcripts);
    const fb2 = pickTranscript(q[1]!, 1, transcripts);
    expect(fb1?.call_id).toBe(fb2?.call_id);
    expect(fb1?.call_id.startsWith('syn-l-')).toBe(true);
    expect(pickTranscript({ call_id: null }, 3, transcripts)?.call_id).not.toBe('syn-h-opt-out');
  });

  it('builds a monotonic playback schedule with prospect turns 2.5–4 s apart and the same schedule every time', () => {
    for (const t of transcripts) {
      const s1 = playbackSchedule(t);
      const s2 = playbackSchedule(t);
      expect(s1).toEqual(s2);
      expect(s1).toHaveLength(t.turns.length);
      const ordered = turnsInOrder(t);
      for (let i = 1; i < s1.length; i += 1) {
        expect(s1[i]!.at_ms).toBeGreaterThanOrEqual(s1[i - 1]!.at_ms);
        const turn = ordered[s1[i]!.turn_index]!;
        const prev = ordered[s1[i - 1]!.turn_index]!;
        if (turn.speaker_role === 'prospect' && turn.utterance_id !== prev.utterance_id) {
          const gap = s1[i]!.at_ms - s1[i - 1]!.at_ms;
          expect(gap).toBeGreaterThanOrEqual(2500);
          expect(gap).toBeLessThanOrEqual(4000);
        }
      }
    }
    // A different seed yields a different (still monotonic) schedule.
    const a = playbackSchedule(transcripts[0]!, 1);
    const b = playbackSchedule(transcripts[0]!, 2);
    expect(a.map((x) => x.at_ms)).not.toEqual(b.map((x) => x.at_ms));
  });

  it('playedTurns returns exactly the events that have arrived, in arrival order', () => {
    const t = transcripts.find((x) => x.call_id === 'syn-a-profit-not-revenue')!;
    const sched = playbackSchedule(t);
    expect(playedTurns(t, sched, 0)).toHaveLength(0);
    expect(playedTurns(t, sched, sched[0]!.at_ms)).toHaveLength(1);
    expect(playedTurns(t, sched, sched[sched.length - 1]!.at_ms)).toHaveLength(t.turns.length);
    expect(playedTurns(t, sched, sched[3]!.at_ms)[3]!.text).toMatch(/uneven/i);
  });

  it('hints the branch that matches the prospect turn, abstains otherwise, and puts opt-out first', () => {
    const cold = nodes.find((n) => n.id === 'cold-open')!;
    expect(nextScriptNodeHint(cold, 'Go ahead, you have a minute.')?.branch.answer_category).toBe('permission_granted');
    expect(nextScriptNodeHint(cold, 'Please take me off your list.')?.branch.answer_category).toBe('opt_out');
    expect(nextScriptNodeHint(cold, 'Sure — but actually take me off your list.')?.branch.answer_category).toBe('opt_out');
    expect(nextScriptNodeHint(cold, 'Hmm.')).toBeNull();
    expect(nextScriptNodeHint(cold, null)).toBeNull();
    const intent = nodes.find((n) => n.id === 'intent-tangible')!;
    expect(nextScriptNodeHint(intent, 'Profit, not revenue.')?.branch.answer_category).toBe('tangible_given');
  });
});
