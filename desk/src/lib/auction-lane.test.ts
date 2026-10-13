import { describe, expect, it } from 'vitest';
import { RELEASE_MAX_DAYS, collateralRefusal, releaseRefusal, said, type Collateral } from './auction';

describe('the lender\'s release fits the 21-day title clock', () => {
  const at = (releaseDays: number): Collateral => ({ title: { status: 'lender', lienholder: 'NextGear', payoff: 2000, releaseDays }, floor: 4000, insured: true });
  it('takes 14 days and refuses 15', () => {
    expect(RELEASE_MAX_DAYS).toBe(14);
    expect(collateralRefusal(at(14))).toBeNull();
    expect(collateralRefusal(at(15))).toBe('release past day 14');
    expect(releaseRefusal(10)).toBeNull();
  });
  it('says why in the dealer\'s words', () => {
    expect(said(collateralRefusal(at(15))!)).toBe('Release must land inside 14 days so title reaches the buyer before day 21.');
    expect(said('not insured')).toBe('not insured');
  });
  it('a title in hand has no release clock', () => { expect(collateralRefusal({ title: { status: 'hand' }, floor: 4000, insured: true })).toBeNull(); });
});
