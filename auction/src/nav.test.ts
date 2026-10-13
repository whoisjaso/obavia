import { describe, expect, it, beforeEach } from 'vitest';
import { clearIntent, go, peekIntent, subscribeIntent, type Intent } from './nav';

describe('nav intent bus', () => {
  beforeEach(() => clearIntent());

  it('starts empty', () => {
    expect(peekIntent()).toBeNull();
  });

  it('go sets the intent and notifies subscribers', () => {
    let calls = 0;
    const off = subscribeIntent(() => { calls++; });
    go({ screen: 'won', lotId: 'lot-1' });
    expect(peekIntent()).toEqual({ screen: 'won', lotId: 'lot-1' });
    expect(calls).toBe(1);
    off();
  });

  it('the latest go wins and omits an absent lotId', () => {
    go({ screen: 'lane', lotId: 'a' });
    go({ screen: 'me' });
    expect(peekIntent()).toEqual({ screen: 'me' });
  });

  it('clearIntent empties it, notifies once, and is a no-op when already empty', () => {
    go({ screen: 'pickup', lotId: 'p' });
    let calls = 0;
    const off = subscribeIntent(() => { calls++; });
    clearIntent();
    clearIntent();
    expect(peekIntent()).toBeNull();
    expect(calls).toBe(1);
    off();
  });

  it('ignores a screen outside the five', () => {
    go({ screen: 'settings' } as unknown as Intent);
    expect(peekIntent()).toBeNull();
  });

  it('offer is a screen: the "Second chance" push lands on it with its lot', () => {
    go({ screen: 'offer', lotId: 'altima' });
    expect(peekIntent()).toEqual({ screen: 'offer', lotId: 'altima' });
  });

  it('unsubscribe stops notifications', () => {
    let calls = 0;
    const off = subscribeIntent(() => { calls++; });
    off();
    go({ screen: 'lane' });
    expect(calls).toBe(0);
  });

  it('the snapshot is stable between changes', () => {
    go({ screen: 'won', lotId: 'x' });
    expect(peekIntent()).toBe(peekIntent());
  });
});
