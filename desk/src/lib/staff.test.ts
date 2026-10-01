import { describe, expect, it } from 'vitest';
import { LOCK_AFTER_MIN, MAX_TRIES, WAIT_S, can, cashBy, checkPin, idleTooLong, makeStaff, waitLeft, weakPin } from './staff';

describe('staff sign-in', () => {
  it('checks a PIN against its salted hash, and two people with one PIN hash differently', async () => {
    const a = await makeStaff(' Maria ', 'desk', '4826', '2026-10-01', 'u1'), b = await makeStaff('Sam', 'desk', '4826', '2026-10-01', 'u2');
    expect(a.name).toBe('Maria');
    expect(await checkPin(a, '4826')).toBe(true);
    expect(await checkPin(a, '4825')).toBe(false);
    expect(a.pinHash).not.toBe(b.pinHash);
    expect(JSON.stringify(a)).not.toContain('4826');
  });

  it('refuses PINs anyone would guess', () => {
    for (const p of ['0000', '7777', '1234', '4321', '6789', '123', '12a4']) expect(weakPin(p)).toBe(true);
    for (const p of ['4826', '1357', '2580', '1123']) expect(weakPin(p)).toBe(false);
  });

  it('keeps people management, settings, undo and recounts for owners', async () => {
    const desk = await makeStaff('Maria', 'desk', '4826', '2026-10-01'), owner = await makeStaff('Jason', 'owner', '9152', '2026-10-01');
    for (const a of ['staff', 'settings', 'undo', 'recount'] as const) { expect(can(desk, a)).toBe(false); expect(can(owner, a)).toBe(true); expect(can(undefined, a)).toBe(true); }
  });

  it('slows down wrong tries and locks after idle minutes', () => {
    const now = 1_000_000, fails = Array.from({ length: MAX_TRIES }, (_, i) => now - 5000 + i * 1000);
    expect(waitLeft(fails.slice(1), now)).toBe(0);
    expect(waitLeft(fails, now)).toBe(WAIT_S - 5);
    expect(waitLeft(fails, now + WAIT_S * 1000)).toBe(0);
    expect(idleTooLong(now, now + LOCK_AFTER_MIN * 60_000)).toBe(false);
    expect(idleTooLong(now, now + LOCK_AFTER_MIN * 60_000 + 1)).toBe(true);
  });

  it('adds up the day’s cash by who took it', async () => {
    const m = await makeStaff('Maria', 'desk', '4826', '2026-10-01', 'u1');
    expect(cashBy([{ by: 'u1', cents: 100 }, { cents: 50 }, { by: 'u1', cents: 25 }, { by: 'gone', cents: 300 }], [m]))
      .toEqual([{ id: 'gone', name: 'Someone removed', cents: 300 }, { id: 'u1', name: 'Maria', cents: 125 }, { id: '', name: 'No name', cents: 50 }]);
  });
});
