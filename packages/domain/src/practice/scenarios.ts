/**
 * The ten original FICTIONAL practice scenarios from brief §13, with hidden fact sheets.
 *
 * Separation of contexts (brief §13, scenario 22):
 * - `coachView(scenario)` is what a live coach (and the live UI) may see: the public brief plus
 *   whatever the simulated prospect has already revealed. Its type structurally cannot carry
 *   `hidden_fact_sheet`, and the runtime object is built field by field — never by spreading
 *   the scenario — so hidden truth cannot leak through it.
 * - `evaluatorView(scenario)` is the post-session evaluator's explicit, separate access to the
 *   hidden fact sheet. It is only for assessment after a run has ended.
 *
 * No scenario depicts a real person, business or prospect. Some never convert: the correct
 * result there is a respectful exit, and scoring rewards accurate disqualification.
 */
import { PracticeScenario, type HiddenFactSheet, type LegitimateOutcome } from '../schemas/practice';

const FICTIONAL = 'FICTIONAL' as const;

function scenario(
  id: string,
  title: string,
  entrypoint: string,
  public_brief: string,
  hidden: HiddenFactSheet,
  legitimate_outcomes: LegitimateOutcome[],
  never_converts: boolean,
): PracticeScenario {
  return PracticeScenario.parse({
    id,
    title: `${FICTIONAL} — ${title}`,
    public_brief,
    entrypoint,
    hidden_fact_sheet: hidden,
    legitimate_outcomes,
    never_converts,
    fictional: true,
  });
}

export const PRACTICE_SCENARIOS: readonly PracticeScenario[] = [
  scenario(
    'busy-owner-short-moment',
    'Busy dealership owner with a possible issue but only a short moment now',
    'cold',
    'Owner of a single-rooftop used-car store (fictional). Answered the phone between two walk-ins. Web inquiries reach a shared inbox. Nothing else is known.',
    {
      real_needs: ['Web inquiries that arrive after six are answered the next morning, sometimes later.', 'Wants the evening leads looked at without hiring a night person.'],
      objections: ["I have a customer standing here — I have about a minute.", 'If this is a pitch, send me something instead.'],
      budget_capacity: ['Could authorise a small pilot personally; anything recurring is a discussion with the accountant.'],
      decision_roles: ['Sole owner; decides alone.'],
      already_tried: ['An auto-reply that says "we will get back to you". Nobody follows it up.'],
      would_proceed_if: ['A short call is booked for a quiet time and the first call respects the one-minute limit.'],
      would_not_proceed_if: ['The caller keeps talking past the minute or asks for a decision now.'],
    },
    ['defer', 'qualified'],
    false,
  ),
  scenario(
    'existing-vendor-no-gap',
    'Existing-vendor customer with no meaningful gap: ending politely is success',
    'cold',
    'General manager of a mid-size franchise store (fictional). Uses a well-known CRM with lead routing. No known complaint.',
    {
      real_needs: ['None that this offer addresses. Inquiries are answered within fifteen minutes by a BDC.'],
      objections: ['We already have a BDC and a CRM that does exactly this.', 'I am happy with our current numbers.'],
      budget_capacity: ['Budget exists but is committed to the current vendor for the year.'],
      decision_roles: ['GM decides; dealer principal signs.'],
      already_tried: ['Current CRM routing has run for three years and is reviewed monthly.'],
      would_proceed_if: ['Nothing in this call would change the answer. A polite close and permission to reconnect next year is the best result.'],
      would_not_proceed_if: ['The caller invents a problem or pushes for a meeting anyway.'],
    },
    ['no_fit'],
    true,
  ),
  scenario(
    'profit-owner-purchase-cost',
    'Profit-focused owner whose main problem is purchase cost, not lead response',
    'inbound',
    'Independent dealer (fictional) who downloaded the inquiry checklist. Talks about margin. Requested a callback.',
    {
      real_needs: ['Buying cars right at auction. Margin per unit is the number he watches.', 'Lead response is fine — the team calls within the hour.'],
      objections: ['My problem is what I pay for inventory, not the phone.', 'Profit, not revenue — do not quote me revenue lifts.'],
      budget_capacity: ['Would spend on anything that lowers acquisition cost; nothing on lead handling.'],
      decision_roles: ['Owner; decides alone.'],
      already_tried: ['Two auction-data subscriptions; one wholesale broker.'],
      would_proceed_if: ['Nothing here fits. Correct result: name the mismatch, offer nothing, leave the door open.'],
      would_not_proceed_if: ['The caller reframes purchase cost as a lead-response problem.'],
    },
    ['no_fit'],
    true,
  ),
  scenario(
    'detail-buyer-measurement',
    'Detail-focused buyer wanting measurement, technical scope and data ownership',
    'inbound',
    'Operations director of a three-store group (fictional). Replied to an inbound email asking three technical questions.',
    {
      real_needs: ['Inquiries from the group website are split by store manually and some are dropped in the handoff.', 'Wants a measured response time per store.'],
      objections: ['Who owns the data and where is it stored?', 'How exactly is response time measured, and what is the baseline?'],
      budget_capacity: ['Has an approved line for process tooling this quarter.'],
      decision_roles: ['Recommends; the dealer principal approves above a threshold.'],
      already_tried: ['A spreadsheet-based routing rota. Works until someone is off.'],
      would_proceed_if: ['Scope, measurement method and data ownership are stated plainly and a written summary is offered.'],
      would_not_proceed_if: ['Questions are deflected with enthusiasm instead of answers.'],
    },
    ['qualified', 'defer'],
    false,
  ),
  scenario(
    'relevant-issue-no-budget',
    'Buyer with a relevant issue but no authorized budget: clarify or defer without coercion',
    'cold',
    'Sales manager at a single store (fictional). Engaged and candid about the problem.',
    {
      real_needs: ['Weekend inquiries sit until Monday; roughly ten appointments a month are lost.'],
      objections: ['I cannot spend anything without the owner, and the owner froze spending until the next quarter.'],
      budget_capacity: ['Zero authorised budget now. A decision is possible next quarter, not before.'],
      decision_roles: ['Manager influences; owner alone authorises spend.'],
      already_tried: ['Asked staff to check the inbox from home. Stopped after two weeks.'],
      would_proceed_if: ['A follow-up is agreed for after the freeze, with a short written summary the manager can show the owner.'],
      would_not_proceed_if: ['The caller pushes for a commitment now or suggests going around the owner.'],
    },
    ['defer', 'needs_second_decision_maker'],
    true,
  ),
  scenario(
    'multi-owner-second-decision-maker',
    'Multi-owner dealership requiring a second decision-maker',
    'follow_up',
    'One of two partners (fictional). Agreed to a reconnect call after an earlier conversation about missed inquiries.',
    {
      real_needs: ['Both partners agree inquiries are slipping in the evenings; they disagree on whether to hire or automate.'],
      objections: ['My partner has to be on the call before anything moves.'],
      budget_capacity: ['Budget exists; joint sign-off required.'],
      decision_roles: ['Two equal partners; either can veto.'],
      already_tried: ['A part-time evening hire who left after a month.'],
      would_proceed_if: ['A joint call is scheduled with both partners and the agenda is agreed.'],
      would_not_proceed_if: ['The caller tries to close one partner alone.'],
    },
    ['needs_second_decision_maker', 'defer'],
    false,
  ),
  scenario(
    'skeptical-earlier-automation',
    'Skeptical owner disappointed by an earlier automation project',
    'cold',
    'Owner (fictional) who once bought a chat-bot that annoyed customers. Polite but guarded.',
    {
      real_needs: ['Inquiries do get lost in the evening; the owner admits it only after being asked what happened last time.'],
      objections: ['The last thing I bought like this made things worse.', 'Everyone says theirs is different.'],
      budget_capacity: ['Could fund a small trial; will not sign anything long.'],
      decision_roles: ['Sole owner.'],
      already_tried: ['A chat-bot that answered with canned lines; customers complained; it was switched off after three months.'],
      would_proceed_if: ['The earlier failure is explored without defensiveness and the difference is explained in plain terms; a small reversible step is offered.'],
      would_not_proceed_if: ['The caller dismisses the earlier experience or claims theirs cannot fail.'],
    },
    ['qualified', 'defer', 'no_fit'],
    false,
  ),
  scenario(
    'inbound-price-first',
    'Interested inbound lead who asks for a price before full discovery',
    'inbound',
    'Dealer principal (fictional) who filled in the contact form and wrote "just tell me the price".',
    {
      real_needs: ['Wants same-day answers to every web inquiry across one store; currently about half are answered the same day.'],
      objections: ['What does it cost? I do not want a forty-minute call to find out.'],
      budget_capacity: ['Has a number in mind; will not say it first.'],
      decision_roles: ['Dealer principal decides.'],
      already_tried: ['Nothing formal; the receptionist forwards emails.'],
      would_proceed_if: ['Approved pricing is answered honestly (or its absence stated plainly) and what still affects scope is explained briefly.'],
      would_not_proceed_if: ['The price is dodged, or a price is invented.'],
    },
    ['qualified', 'defer'],
    false,
  ),
  scenario(
    'gatekeeper-cannot-authorize',
    'Gatekeeper who cannot authorize a purchase',
    'cold',
    'Receptionist (fictional) at a single store. Answers the main line. Owner is not available.',
    {
      real_needs: ['None personally. Wants to route the call correctly and get back to the desk.'],
      objections: ['The owner does not take sales calls.', 'You can email info@ and someone will look at it.'],
      budget_capacity: ['No authority over spend.'],
      decision_roles: ['Gatekeeper; the owner decides.'],
      already_tried: ['n/a'],
      would_proceed_if: ['The caller is brief, respectful, and asks for the right person or a good time rather than pitching the receptionist.'],
      would_not_proceed_if: ['The caller pitches or pressures the receptionist.'],
    },
    ['gatekeeper', 'defer'],
    true,
  ),
  scenario(
    'clear-opt-out',
    'Clear opt-out requiring immediate respectful exit',
    'cold',
    'Owner (fictional). Picks up, hears the opening, and asks not to be called.',
    {
      real_needs: ['Not relevant — the request to stop overrides everything.'],
      objections: ['Please take me off your list and do not call again.'],
      budget_capacity: ['Not relevant.'],
      decision_roles: ['Not relevant.'],
      already_tried: ['Not relevant.'],
      would_proceed_if: ['Never. The only correct result is an immediate, respectful stop and a suppression note.'],
      would_not_proceed_if: ['Any reframe, any "just one question", any continuation.'],
    },
    ['opt_out'],
    true,
  ),
];

export function scenarioById(id: string): PracticeScenario | undefined {
  return PRACTICE_SCENARIOS.find((s) => s.id === id);
}

/** What the live coach and the live UI may see. Structurally cannot carry `hidden_fact_sheet`. */
export interface CoachView {
  id: string;
  title: string;
  public_brief: string;
  entrypoint: string;
  fictional: true;
  /** Facts the simulated prospect has actually said so far, in order. */
  revealed_facts: string[];
  /** Distinguishes this object from an evaluator view at runtime as well as in the type. */
  access: 'coach';
}

/**
 * Build the live coach view. Only the public brief and already-revealed facts are included.
 * The object is constructed field by field on purpose — never `{...scenario}` — so the hidden
 * fact sheet cannot leak in (brief §13, scenario 22).
 */
export function coachView(scenario: PracticeScenario, revealedFacts: readonly string[] = []): CoachView {
  return {
    id: scenario.id,
    title: scenario.title,
    public_brief: scenario.public_brief,
    entrypoint: scenario.entrypoint,
    fictional: true,
    revealed_facts: [...revealedFacts],
    access: 'coach',
  };
}

/** The post-session evaluator's explicit access to hidden truth. */
export interface EvaluatorView extends Omit<CoachView, 'access'> {
  access: 'evaluator_post_session';
  hidden_fact_sheet: HiddenFactSheet;
  legitimate_outcomes: LegitimateOutcome[];
  never_converts: boolean;
}

/**
 * Build the evaluator view. Separate function, separate type, separate `access` tag: the UI
 * may only call this after the run has ended and must label the result as post-session.
 */
export function evaluatorView(scenario: PracticeScenario, revealedFacts: readonly string[] = []): EvaluatorView {
  const coach = coachView(scenario, revealedFacts);
  return {
    id: coach.id,
    title: coach.title,
    public_brief: coach.public_brief,
    entrypoint: coach.entrypoint,
    fictional: true,
    revealed_facts: coach.revealed_facts,
    access: 'evaluator_post_session',
    hidden_fact_sheet: structuredClone(scenario.hidden_fact_sheet),
    legitimate_outcomes: [...scenario.legitimate_outcomes],
    never_converts: scenario.never_converts,
  };
}
