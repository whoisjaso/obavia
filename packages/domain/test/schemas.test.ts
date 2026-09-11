import { describe, expect, it } from 'vitest';
import { InterviewScreen } from '../src/schemas/interview';
import { OfferVersion } from '../src/schemas/offers';
import { PracticeAttempt } from '../src/schemas/practice';

const baseScreen = {
  id: 's1',
  order: 0,
  prompt: 'How do you define success this year?',
  kind: 'single',
  options: [{ id: 'o1', label: 'A specific revenue figure' }],
  allow_skip: true,
  profile_field: 'definitions_of_success',
  base_or_conditional: 'base',
} as const;

describe('interview schema', () => {
  it('requires max_select for multi-select screens', () => {
    expect(InterviewScreen.safeParse({ ...baseScreen, kind: 'multi' }).success).toBe(false);
    expect(InterviewScreen.safeParse({ ...baseScreen, kind: 'multi', max_select: 3 }).success).toBe(true);
  });
  it('requires a declared condition on conditional screens', () => {
    expect(InterviewScreen.safeParse({ ...baseScreen, base_or_conditional: 'conditional' }).success).toBe(false);
    expect(
      InterviewScreen.safeParse({
        ...baseScreen,
        base_or_conditional: 'conditional',
        condition: { screen_id: 's0', any_of: ['x'] },
      }).success,
    ).toBe(true);
  });
});

const pillar = { name: 'p', connects_to_problem: 'q', delivery: 'd' };
const offer = {
  id: 'ov1',
  offer_id: 'o1',
  version: 1,
  name: 'Draft',
  buyer_type: 'dealership',
  problem: 'inquiry follow-through',
  prerequisites: [],
  deliverables: [],
  exclusions: [],
  implementation_dependencies: [],
  supported_proof: [],
  approved_claims: [],
  pillars: [pillar, pillar, pillar],
  price: { setup_minor_units: null, recurring_minor_units: null, currency: 'USD', payment_schedule: 'unset' },
  timing: {},
  acceptance_criteria: [],
  support: '',
  cancellation_exit_handoff: '',
  decision_roles: [],
  status: 'draft',
  fictional: false,
};

describe('offer schema', () => {
  it('accepts null prices and requires exactly three pillars', () => {
    expect(OfferVersion.safeParse(offer).success).toBe(true);
    expect(OfferVersion.safeParse({ ...offer, pillars: [pillar, pillar] }).success).toBe(false);
  });
  it('requires a banner on fictional offers', () => {
    expect(OfferVersion.safeParse({ ...offer, fictional: true }).success).toBe(false);
    expect(OfferVersion.safeParse({ ...offer, fictional: true, fictional_banner: 'FICTIONAL TRAINING OFFER\nNOT A REAL QUOTE' }).success).toBe(true);
  });
});

describe('practice schema', () => {
  it('keeps tone_assessed literally false for text-only attempts', () => {
    const attempt = {
      id: 'a1',
      mode: 'full_script',
      drill_kind: 'exact_recall',
      script_version_id: 'sv1',
      started_at: '2026-09-10T00:00:00Z',
      assisted: true,
      tone_assessed: false,
      notes: '',
    };
    expect(PracticeAttempt.safeParse(attempt).success).toBe(true);
    expect(PracticeAttempt.safeParse({ ...attempt, tone_assessed: true }).success).toBe(false);
  });
});
