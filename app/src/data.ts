/* Demo workspace: one fictional agency, one month.
   Every number below is invented and every screen says so. The real app
   fills these same shapes from the phone system, calendar and payments. */

export const STAGES = ['Leads', 'Booked', 'Showed', 'Qualified', 'Won'] as const;
export const STEPS = ['Lead → Booked', 'Booked → Showed', 'Showed → Qualified', 'Qualified → Won'] as const;
export type StepIndex = 0 | 1 | 2 | 3;

/** Each step is judged against its own line: below `leak` leaks, at or above `strong` is strong. */
export const BENCH = [
  { leak: 45, strong: 65 },
  { leak: 55, strong: 75 },
  { leak: 55, strong: 78 },
  { leak: 20, strong: 38 },
] as const;

export const DEAL = 6000; // average collected per won deal, this month

export type Rep = {
  id: string; name: string; initials: string; tint: 'a' | 'b' | 'c' | 'd';
  role: 'Setter + closer'; counts: [number, number, number, number, number];
  capacity: number; // share of calendar booked, 0..100
  style: string;    // what they are strongest with, learned from outcomes
};

export const REPS: Rep[] = [
  { id: 'dana',   name: 'Dana Ruiz',   initials: 'DR', tint: 'd', role: 'Setter + closer', counts: [140, 92, 77, 63, 22], capacity: 98, style: 'Direct, numbers-first buyers' },
  { id: 'maya',   name: 'Maya Chen',   initials: 'MC', tint: 'a', role: 'Setter + closer', counts: [180, 116, 82, 60, 15], capacity: 72, style: 'Cautious buyers who want proof' },
  { id: 'andre',  name: 'Andre Nunes', initials: 'AN', tint: 'c', role: 'Setter + closer', counts: [220, 139, 72, 55, 7],  capacity: 64, style: 'Long discovery, relationship buyers' },
  { id: 'reza',   name: 'Reza Amini',  initials: 'RA', tint: 'c', role: 'Setter + closer', counts: [240, 141, 59, 34, 13], capacity: 58, style: 'Fast deciders, short calls' },
  { id: 'jordan', name: 'Jordan Kim',  initials: 'JK', tint: 'b', role: 'Setter + closer', counts: [420, 256, 82, 60, 21], capacity: 81, style: 'High volume, first-touch speed' },
];

export type Reason = { tag: string; count: number; quote: string; mark: string; call: string; rep: string };

/** What the calls say about why people fall out at each step. */
export const REASONS: Record<StepIndex, Reason[]> = {
  0: [
    { tag: 'First call after 30 minutes', count: 164, quote: 'Sorry, who is this? I filled out a lot of forms yesterday.', mark: 'who is this?', call: 'Call 204', rep: 'jordan' },
    { tag: 'Never reached after 3 tries',  count: 121, quote: 'Voicemail · no reply to the text', mark: 'no reply', call: 'Lead 1188', rep: 'reza' },
    { tag: 'Not a fit on the first call',  count: 88,  quote: 'We are doing about eight thousand a month right now.', mark: 'eight thousand a month', call: 'Call 311', rep: 'andre' },
  ],
  1: [
    { tag: 'Agenda never confirmed',  count: 138, quote: 'Yeah, Thursday works. What was this about again?', mark: 'What was this about again?', call: 'Call 14', rep: 'jordan' },
    { tag: 'Soft yes on the booking', count: 94,  quote: 'I’ll probably be traveling, but put me down.', mark: 'probably be traveling', call: 'Call 22', rep: 'reza' },
    { tag: 'No timezone set',         count: 61,  quote: 'Sure, any time is fine.', mark: 'any time is fine', call: 'Call 31', rep: 'jordan' },
    { tag: 'Booked five or more days out', count: 39, quote: 'Next Wednesday? Sure, that far out is fine.', mark: 'that far out', call: 'Call 57', rep: 'andre' },
  ],
  2: [
    { tag: 'Below the revenue floor', count: 52, quote: 'Honestly we are still figuring out the offer.', mark: 'still figuring out the offer', call: 'Call 402', rep: 'reza' },
    { tag: 'Owner not on the call',   count: 31, quote: 'I’m the marketing manager, I’d have to loop in Sam.', mark: 'loop in Sam', call: 'Call 418', rep: 'maya' },
    { tag: 'Wanted a different service', count: 17, quote: 'Do you guys just run the ads for us?', mark: 'just run the ads', call: 'Call 433', rep: 'andre' },
  ],
  3: [
    { tag: '“Let me think about it”', count: 71, quote: 'It sounds great, let me think about it and get back to you.', mark: 'let me think about it', call: 'Call 512', rep: 'andre' },
    { tag: 'Price named before the recap', count: 48, quote: 'Six grand? Before I even know what I’m getting?', mark: 'Before I even know', call: 'Call 530', rep: 'andre' },
    { tag: 'Partner not on the call', count: 33, quote: 'My business partner handles anything over five.', mark: 'business partner', call: 'Call 547', rep: 'maya' },
    { tag: 'Asked for references',    count: 20, quote: 'Who else like us have you done this for?', mark: 'Who else like us', call: 'Call 561', rep: 'jordan' },
  ],
};

/** The one move Obavia suggests for each step, if that step is the leak. */
export const PLAYBOOK: Record<StepIndex, { move: string; why: string }> = {
  0: { move: 'Call every new lead inside five minutes, then text once if it goes to voicemail.', why: 'Most lost leads were first called after 30 minutes.' },
  1: { move: 'Before hanging up, confirm the agenda, their timezone and a reschedule option.', why: 'Most no-shows never had the agenda confirmed.' },
  2: { move: 'Ask about monthly revenue and who decides before booking the call.', why: 'Most unqualified calls were below the floor or missing the owner.' },
  3: { move: 'Recap their words first, then name the price, then ask for the decision today.', why: 'Most losses heard the price before the recap.' },
};

export type Significance = 'Status Seeker' | 'People Pleaser' | 'Belonger' | 'Intellectual' | 'Victim' | 'Dominator';
export const NEEDS: Record<Significance, { need: string; fear: string; open: string; avoid: string }> = {
  'Status Seeker':  { need: 'To feel important',      fear: 'Being treated as insignificant', open: 'Let them lead the story; reflect their wins back.', avoid: 'Talking down, generic case studies' },
  'People Pleaser': { need: 'To be approved of',      fear: 'Rejection',                       open: 'Reassure early; make saying no easy.',             avoid: 'Pressure closes' },
  'Belonger':       { need: 'To be accepted',          fear: 'Being cast out',                  open: 'Show others like them who chose this.',           avoid: 'Being the first to try it' },
  'Intellectual':   { need: 'To be seen as smart',     fear: 'Looking ignorant',                open: 'Give the numbers and let them conclude.',         avoid: 'Oversimplifying' },
  'Victim':         { need: 'To be understood',        fear: 'Being dismissed',                 open: 'Name what went wrong before; then the path.',     avoid: 'Blaming them' },
  'Dominator':      { need: 'To be seen as powerful',  fear: 'Looking weak',                    open: 'Offer two clear options; let them choose.',       avoid: 'Long explanations' },
};

export type LeadEvent = { t: string; what: string; detail?: string; src: 'Phone' | 'Calendar' | 'Payments' | 'Form' | 'From the call' };
export type Lead = {
  id: string; name: string; company: string; revenue: string; source: string;
  stage: (typeof STAGES)[number]; rep: string; next: string; due: string; hot?: boolean;
  quote: string; self: string[]; chose: string; matters: string;
  type: Significance; typeConf: number; words: string[]; events: LeadEvent[];
};

export const LEADS: Lead[] = [
  { id: 'marcus', name: 'Marcus Hale', company: 'Hale Growth Co.', revenue: '$240K/mo', source: 'Paid social', stage: 'Qualified', rep: 'dana', next: 'Close call', due: 'Today 2:00 PM', hot: true,
    quote: 'Some months I’m fine. Other months, my team is waiting for someone to pull a Babe Ruth and save the quarter.', self: ['I’m', 'my'], chose: 'Babe Ruth',
    matters: 'A hero who saves the quarter. He wants steadiness without depending on one person.', type: 'Status Seeker', typeConf: 74,
    words: ['“Babe Ruth”', '“Some months I’m fine”', '“My team waits on one person”'],
    events: [
      { t: 'Mon 12:31', what: 'Lead came in', detail: 'Paid social · agency form', src: 'Form' },
      { t: 'Mon 12:33', what: 'Call connected', detail: '7m 42s · Jordan', src: 'Phone' },
      { t: 'Mon 12:41', what: 'Discovery booked', detail: 'Wed 10:00 · agenda confirmed', src: 'Calendar' },
      { t: 'Wed 10:02', what: 'He showed', detail: '38 min', src: 'Calendar' },
      { t: 'Wed 10:40', what: 'Qualified', detail: '86 of 100', src: 'From the call' },
    ] },
  { id: 'priya', name: 'Priya Nair', company: 'Northline Media', revenue: '$410K/mo', source: 'Referral', stage: 'Showed', rep: 'maya', next: 'Send recap', due: 'Today 4:00 PM',
    quote: 'We did two-forty last month. I just need it predictable, we keep guessing.', self: ['I'], chose: 'predictable',
    matters: 'Predictability. She is tired of guessing.', type: 'Intellectual', typeConf: 68,
    words: ['“Predictable”', '“We keep guessing”'],
    events: [
      { t: 'Tue 09:10', what: 'Lead came in', detail: 'Referral from Hale Growth', src: 'Form' },
      { t: 'Tue 09:12', what: 'Call connected', detail: '11m 05s · Maya', src: 'Phone' },
      { t: 'Tue 09:24', what: 'Discovery booked', detail: 'Thu 11:30', src: 'Calendar' },
      { t: 'Thu 11:31', what: 'She showed', detail: '44 min', src: 'Calendar' },
    ] },
  { id: 'tom', name: 'Tom Reyes', company: 'Reyes & Wolfe', revenue: '$180K/mo', source: 'Paid social', stage: 'Won', rep: 'reza', next: 'Hand to onboarding', due: 'Tomorrow',
    quote: 'If it pays for itself by month two, we’re in. I don’t need the whole tour.', self: ['I'], chose: 'month two',
    matters: 'Speed to payback. Wants the short version.', type: 'Dominator', typeConf: 71,
    words: ['“By month two”', '“Not the whole tour”'],
    events: [
      { t: 'Mon 15:02', what: 'Lead came in', detail: 'Paid social', src: 'Form' },
      { t: 'Mon 15:04', what: 'Call connected', detail: '6m 10s · Reza', src: 'Phone' },
      { t: 'Tue 10:00', what: 'He showed', detail: '22 min', src: 'Calendar' },
      { t: 'Tue 10:24', what: 'Paid', detail: '$6,000', src: 'Payments' },
    ] },
  { id: 'lena', name: 'Lena Park', company: 'Park Studio', revenue: '$120K/mo', source: 'Web form', stage: 'Leads', rep: 'jordan', next: 'First call', due: 'Now', hot: true,
    quote: '—', self: [], chose: '', matters: 'Not heard yet. First call not made.', type: 'Belonger', typeConf: 0, words: [],
    events: [{ t: 'Today 1:14', what: 'Lead came in', detail: 'Web form · waiting 0:42', src: 'Form' }] },
  { id: 'sam', name: 'Sam Okafor', company: 'Okafor Digital', revenue: '$300K/mo', source: 'Paid social', stage: 'Booked', rep: 'jordan', next: 'Confirm agenda', due: 'Today 5:00 PM',
    quote: 'Sure, any time is fine. What was this about again?', self: [], chose: 'any time', matters: 'Unclear. Agenda never confirmed.', type: 'People Pleaser', typeConf: 52,
    words: ['“Any time is fine”'],
    events: [
      { t: 'Tue 16:40', what: 'Lead came in', detail: 'Paid social', src: 'Form' },
      { t: 'Wed 09:05', what: 'Call connected', detail: '3m 12s · Jordan', src: 'Phone' },
      { t: 'Wed 09:08', what: 'Discovery booked', detail: 'Mon 3:00 · no agenda, no timezone', src: 'Calendar' },
    ] },
  { id: 'elena', name: 'Elena Vasquez', company: 'Brightpath Agency', revenue: '$520K/mo', source: 'Podcast', stage: 'Qualified', rep: 'andre', next: 'Close call', due: 'Tomorrow 10:00',
    quote: 'Every agency like ours I talk to is dealing with this. Who else have you done it for?', self: [], chose: 'agency like ours', matters: 'Being in good company. Wants proof from peers.', type: 'Belonger', typeConf: 66,
    words: ['“Agency like ours”', '“Who else”'],
    events: [
      { t: 'Mon 11:00', what: 'Lead came in', detail: 'Podcast', src: 'Form' },
      { t: 'Mon 11:20', what: 'Call connected', detail: '14m 02s · Andre', src: 'Phone' },
      { t: 'Wed 14:00', what: 'She showed', detail: '52 min', src: 'Calendar' },
      { t: 'Wed 14:52', what: 'Qualified', detail: '81 of 100', src: 'From the call' },
    ] },
];

export type MoveStatus = 'assigned' | 'doing' | 'checking' | 'worked' | 'missed';
export type Move = {
  id: string; rep: string; step: StepIndex; text: string; status: MoveStatus;
  done: number; of: number; before: number; after: number | null; created: string; check: string;
};

export const MOVES: Move[] = [
  { id: 'm1', rep: 'jordan', step: 1, text: PLAYBOOK[1].move, status: 'doing', done: 18, of: 21, before: 32, after: 47, created: 'Mon', check: 'Fri' },
  { id: 'm2', rep: 'andre', step: 3, text: PLAYBOOK[3].move, status: 'assigned', done: 0, of: 0, before: 13, after: null, created: 'Today', check: 'Next Fri' },
  { id: 'm3', rep: 'reza', step: 0, text: PLAYBOOK[0].move, status: 'worked', done: 64, of: 70, before: 51, after: 59, created: '2 weeks ago', check: 'Last Fri' },
];

/** Eight weeks of show rate for the team, oldest first, for the trend line. */
export const TREND: Record<StepIndex, number[]> = {
  0: [60, 61, 63, 60, 62, 61, 63, 62],
  1: [58, 56, 55, 53, 52, 51, 49, 50],
  2: [72, 74, 73, 71, 74, 73, 72, 73],
  3: [27, 29, 28, 30, 28, 29, 30, 29],
};
