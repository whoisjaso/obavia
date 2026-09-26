/* One agency, one month. The same shapes are filled from the phone system,
   calendar and payments once they are connected. */

export const AGENCY = { name: 'Northstar Agency', owner: 'Alex Rivera', initials: 'AR' };

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
/** A word they used, and the word they could have used instead. */
export type Signal = { said: string; over: string; means: string };
/** A name or picture they reached for, out of everything they could have said. */
export type Reference = { name: string; over: string[]; means: string };
/** The string: every step a sale has to hit, whoever hits it. The set covers the first five. */
export const STRING = ['Goal', 'Approach', 'Catalyst', 'Pain', 'Gap', 'Do it yourself', 'Past attempts', 'Future', 'Consequence', 'Commitments'] as const;
export type StringStep = (typeof STRING)[number];
/** The setter's notes to the closer, written by Obavia from the call. */
export type Handoff = {
  from: string; when: string;
  goal: string; implies: string;
  awareness: { stage: 'Lost' | 'Problem aware' | 'Solution aware' | 'Product aware' | 'Most aware'; sell: string };
  approach: { said: string; label: string };
  catalyst?: string;
  pain?: { what: string; since: string; impact: string };
  gap?: { now: string; want: string };
  identity: string; significant: string;
  handled: { q: string; a: string }[];
  asset?: { name: string; watched: boolean; takeaway?: string };
  hit: StringStep[];
  close: { open: string; pillar: string; consequence: string; words: string[] };
};
export type Lead = {
  id: string; name: string; company: string; revenue: string; source: string;
  stage: (typeof STAGES)[number]; rep: string; next: string; due: string; hot?: boolean;
  quote: string; marks: string[]; signals: Signal[]; reference?: Reference;
  type: Significance; read: [Significance, number][]; say: string; avoid: string; events: LeadEvent[];
  handoff?: Handoff;
};

/** The need behind each type, in plain words. */
export const NEED: Record<Significance, string> = {
  'Status Seeker': 'Needs to feel significant', 'People Pleaser': 'Needs approval', 'Belonger': 'Needs to belong',
  'Intellectual': 'Needs to be seen as smart', 'Victim': 'Needs to be understood', 'Dominator': 'Needs to be in control',
};

export const LEADS: Lead[] = [
  { id: 'marcus', name: 'Marcus Hale', company: 'Hale Growth Co.', revenue: '$240K/mo', source: 'Paid social', stage: 'Qualified', rep: 'dana', next: 'Close call', due: 'Today 2:00 PM', hot: true,
    quote: 'Some months I’m fine. Other months, my team is waiting for someone to pull a Babe Ruth and save the quarter.',
    marks: ['I’m', 'my', 'Babe Ruth'],
    signals: [
      { said: 'I’m fine', over: 'we’re fine', means: 'He puts himself at the center.' },
      { said: 'my team', over: 'our team', means: 'He owns it. The team is his.' },
    ],
    reference: { name: 'Babe Ruth', over: ['Michael Jordan', 'LeBron James', 'Serena Williams', 'Tom Brady', 'Michael Jackson'], means: 'Baseball. A legend. The one who steps up and saves the game.' },
    type: 'Status Seeker', read: [['Status Seeker', 74], ['Belonger', 15], ['People Pleaser', 11]],
    say: '“You’ve built something most owners never reach. Let’s get every rep hitting like your Babe Ruth.”',
    avoid: 'Talking down to him, or leading with other agencies’ results.',
    events: [
      { t: 'Mon 12:31', what: 'Lead came in', detail: 'Paid social · agency form', src: 'Form' },
      { t: 'Mon 12:33', what: 'Call connected', detail: '7m 42s · Jordan', src: 'Phone' },
      { t: 'Mon 12:41', what: 'Discovery booked', detail: 'Wed 10:00 · agenda confirmed', src: 'Calendar' },
      { t: 'Wed 10:02', what: 'He showed', detail: '38 min', src: 'Calendar' },
      { t: 'Wed 10:40', what: 'Qualified', detail: '86 of 100', src: 'From the call' },
    ],
    handoff: {
      from: 'jordan', when: 'Mon 12:41',
      awareness: { stage: 'Problem aware', sell: 'The burning building: he already feels the swings. Name them, then the fix.' },
      goal: 'The team closing without him on every big call.', implies: 'Right now every big deal waits on him.',
      approach: { said: 'I jump on the big calls myself, and we do a Monday review.', label: 'the jump-in approach' },
      catalyst: 'Lost two $20K deals in March while he was traveling. That was the moment.',
      pain: { what: 'Revenue swings with his calendar', since: 'About 8 months', impact: 'He can’t take a week off. His last vacation, he took six calls.' },
      gap: { now: '$240K a month, swinging by $60K', want: '$400K a month, steady, without him on the calls' },
      identity: 'The closer the team waits on', significant: 'Being the one who steps up and saves the game. Credit for what he built.',
      handled: [
        { q: 'Why not just coach the reps yourself?', a: 'I’ve tried. I don’t have the hours, and they don’t hear it from me.' },
        { q: 'Tried help before?', a: 'A sales coach last year. Bad result: generic scripts, nothing from his own calls.' },
        { q: 'What would make it work this time?', a: 'Built from his own team’s calls, not a template.' },
      ],
      asset: { name: 'The six-minute leak breakdown', watched: true, takeaway: 'Show rate is where his money goes.' },
      hit: ['Goal', 'Approach', 'Catalyst', 'Pain', 'Gap', 'Do it yourself', 'Past attempts'],
      close: {
        open: 'Confirm the jump-in approach in his words, then ask what he took from the video.',
        pillar: 'Lead with “built from your own calls”. It answers exactly why the coach failed.',
        consequence: 'At $400K he is still the one stepping up on every call, and the team never learns to hit.',
        words: ['my team', 'save the quarter', 'Babe Ruth'],
      },
    },
  },
  { id: 'priya', name: 'Priya Nair', company: 'Northline Media', revenue: '$410K/mo', source: 'Referral', stage: 'Showed', rep: 'maya', next: 'Send recap', due: 'Today 4:00 PM',
    quote: 'We did two-forty last month. I just need it predictable, we keep guessing.',
    marks: ['two-forty', 'predictable', 'guessing'],
    signals: [
      { said: 'two-forty', over: 'pretty good', means: 'She speaks in exact numbers.' },
      { said: 'predictable', over: 'bigger', means: 'She wants certainty more than growth.' },
    ],
    type: 'Intellectual', read: [['Intellectual', 68], ['Belonger', 20], ['Status Seeker', 12]],
    say: '“Here are your numbers, step by step. You’ll see exactly where the guessing comes from.”',
    avoid: 'Hype, round numbers and big promises.',
    events: [
      { t: 'Tue 09:10', what: 'Lead came in', detail: 'Referral from Hale Growth', src: 'Form' },
      { t: 'Tue 09:12', what: 'Call connected', detail: '11m 05s · Maya', src: 'Phone' },
      { t: 'Tue 09:24', what: 'Discovery booked', detail: 'Thu 11:30', src: 'Calendar' },
      { t: 'Thu 11:31', what: 'She showed', detail: '44 min', src: 'Calendar' },
    ] },
  { id: 'tom', name: 'Tom Reyes', company: 'Reyes & Wolfe', revenue: '$180K/mo', source: 'Paid social', stage: 'Won', rep: 'reza', next: 'Hand to onboarding', due: 'Tomorrow',
    quote: 'If it pays for itself by month two, we’re in. I don’t need the whole tour.',
    marks: ['month two', 'I don’t need'],
    signals: [
      { said: 'by month two', over: 'eventually', means: 'He sets the deadline, not you.' },
      { said: 'I don’t need the whole tour', over: 'walk me through it', means: 'He wants control of the pace.' },
    ],
    type: 'Dominator', read: [['Dominator', 71], ['Status Seeker', 19], ['Intellectual', 10]],
    say: '“Two options. Both pay back by month two. You pick.”',
    avoid: 'Long explanations and a full tour.',
    events: [
      { t: 'Mon 15:02', what: 'Lead came in', detail: 'Paid social', src: 'Form' },
      { t: 'Mon 15:04', what: 'Call connected', detail: '6m 10s · Reza', src: 'Phone' },
      { t: 'Tue 10:00', what: 'He showed', detail: '22 min', src: 'Calendar' },
      { t: 'Tue 10:24', what: 'Paid', detail: '$6,000', src: 'Payments' },
    ] },
  { id: 'lena', name: 'Lena Park', company: 'Park Studio', revenue: '$120K/mo', source: 'Web form', stage: 'Leads', rep: 'jordan', next: 'First call', due: 'Now', hot: true,
    quote: '', marks: [], signals: [], type: 'Belonger', read: [], say: '', avoid: '',
    events: [{ t: 'Today 1:14', what: 'Lead came in', detail: 'Web form · waiting 0:42', src: 'Form' }] },
  { id: 'sam', name: 'Sam Okafor', company: 'Okafor Digital', revenue: '$300K/mo', source: 'Paid social', stage: 'Booked', rep: 'jordan', next: 'Confirm agenda', due: 'Today 5:00 PM',
    quote: 'Sure, any time is fine. What was this about again?',
    marks: ['any time is fine', 'What was this about again?'],
    signals: [
      { said: 'any time is fine', over: 'Tuesday at three', means: 'He agrees easily. A soft yes, not a commitment.' },
    ],
    type: 'People Pleaser', read: [['People Pleaser', 52], ['Belonger', 28], ['Status Seeker', 20]],
    say: '“So I don’t waste your time, here’s what we’ll cover. If Monday slips, just move it here.”',
    avoid: 'Taking “sure” as a yes.',
    events: [
      { t: 'Tue 16:40', what: 'Lead came in', detail: 'Paid social', src: 'Form' },
      { t: 'Wed 09:05', what: 'Call connected', detail: '3m 12s · Jordan', src: 'Phone' },
      { t: 'Wed 09:08', what: 'Discovery booked', detail: 'Mon 3:00 · no agenda, no timezone', src: 'Calendar' },
    ],
    handoff: {
      from: 'jordan', when: 'Wed 09:08',
      awareness: { stage: 'Lost', sell: 'No problem named yet. Sell the dream house: what a steady month would look like.' },
      goal: 'More calls, probably.', implies: 'Not clear yet. A soft goal usually hides the real one.',
      approach: { said: 'Mostly referrals, and some Instagram.', label: 'the referral approach' },
      identity: 'Easygoing. Says yes to everything', significant: 'Not letting anyone down.',
      handled: [],
      asset: { name: 'The six-minute leak breakdown', watched: false },
      hit: ['Goal', 'Approach'],
      close: {
        open: 'Confirm the agenda and his timezone first. “Any time is fine” is a soft yes.',
        pillar: 'Don’t pitch yet. Find the catalyst: what changed that made him book?',
        consequence: 'Not uncovered yet. Get it before the pitch.',
        words: ['any time is fine', 'I guess'],
      },
    },
  },
  { id: 'elena', name: 'Elena Vasquez', company: 'Brightpath Agency', revenue: '$520K/mo', source: 'Podcast', stage: 'Qualified', rep: 'andre', next: 'Close call', due: 'Tomorrow 10:00',
    quote: 'Every agency like ours I talk to is dealing with this. Who else have you done it for?',
    marks: ['agency like ours', 'Who else'],
    signals: [
      { said: 'agency like ours', over: 'my agency', means: 'She sees herself as one of a group.' },
      { said: 'Who else', over: 'What will it do', means: 'Proof from peers matters more than features.' },
    ],
    type: 'Belonger', read: [['Belonger', 66], ['People Pleaser', 20], ['Status Seeker', 14]],
    say: '“Want to see how agencies your size run it, before we talk about yours?”',
    avoid: 'Making her feel like the first to try it.',
    events: [
      { t: 'Mon 11:00', what: 'Lead came in', detail: 'Podcast', src: 'Form' },
      { t: 'Mon 11:20', what: 'Call connected', detail: '14m 02s · Jordan', src: 'Phone' },
      { t: 'Wed 14:00', what: 'She showed', detail: '52 min', src: 'Calendar' },
      { t: 'Wed 14:52', what: 'Qualified', detail: '81 of 100', src: 'From the call' },
    ],
    handoff: {
      from: 'jordan', when: 'Mon 11:34',
      awareness: { stage: 'Solution aware', sell: 'She is comparing. Show why ours works where Gong went unused.' },
      goal: 'Hire two more closers without the close rate falling.', implies: 'New closers have been costing her money.',
      approach: { said: 'We review calls on Fridays and keep a shared Loom library.', label: 'the Friday-review approach' },
      catalyst: 'Hired three closers in the spring. Two washed out in 60 days and burned the podcast leads.',
      pain: { what: 'New reps take 90 days to ramp', since: 'Since April', impact: 'About $80K of podcast leads went to reps who didn’t make it.' },
      gap: { now: '$520K a month with 4 closers', want: '$750K a month with 6 closers, ramped in 30 days' },
      identity: 'The operator who does it by the book', significant: 'What agencies like hers are doing. Proof from peers.',
      handled: [
        { q: 'Why not keep the Friday reviews?', a: 'They cover maybe ten calls. We run three hundred a week.' },
        { q: 'Tried help before?', a: 'Looked at Gong last year, didn’t move forward: too heavy, nobody would use it.' },
        { q: 'What changed now?', a: 'Losing podcast leads to reps who wash out.' },
      ],
      asset: { name: 'How an agency her size ramps reps', watched: true, takeaway: 'They ramped a rep in 30 days.' },
      hit: ['Goal', 'Approach', 'Catalyst', 'Pain', 'Gap', 'Do it yourself', 'Past attempts', 'Future'],
      close: {
        open: 'Start with who else like her runs it: two agencies her size.',
        pillar: 'Lead with trial mode: new reps proven on cheap leads before they touch a podcast lead.',
        consequence: 'Another hiring round that burns $80K of leads, and a team that stays at four.',
        words: ['agency like ours', 'burned', 'by the book'],
      },
    },
  },
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

/* ---------- the daily report: yesterday, read from every call ---------- */
export type DayNote = { kind: 'win' | 'miss'; text: string; quote?: string; mark?: string; call?: string };
export type RepDay = { rep: string; booked: number; showed: number; won: number; note: DayNote; today: string; lead?: string };

export const DAY = {
  of: 'Thursday', sent: '7:00 AM', heard: 84, talk: '31h 20m',
  reps: [
    { rep: 'dana', booked: 6, showed: 5, won: 2, today: 'Marcus Hale at 2:00. Let him lead the story, then reflect his wins back.', lead: 'marcus',
      note: { kind: 'win', text: 'Recapped their words before the price on both closes.', quote: 'So what you’re telling me is the team waits on you. That’s what we fix.', mark: 'the team waits on you', call: 'Call 588' } },
    { rep: 'maya', booked: 7, showed: 5, won: 1, today: 'Send Priya Nair the recap by 4:00. Exact numbers, no hype.', lead: 'priya',
      note: { kind: 'win', text: 'Asked who decides before booking. No calls without the owner.', quote: 'Before we book, will Sam be on it too?', mark: 'will Sam be on it', call: 'Call 579' } },
    { rep: 'andre', booked: 8, showed: 5, won: 0, today: 'Recap first, then the price, then ask for the decision today.', lead: 'elena',
      note: { kind: 'miss', text: 'Named the price before the recap on 4 of 5 calls.', quote: 'Six grand? Before I even know what I’m getting?', mark: 'Before I even know', call: 'Call 590' } },
    { rep: 'reza', booked: 9, showed: 4, won: 1, today: 'Set a day, a time and their timezone on every booking.', lead: 'tom',
      note: { kind: 'miss', text: 'Five no-shows. Four were booked for “any time”.', quote: 'Sure, any time is fine.', mark: 'any time is fine', call: 'Call 571' } },
    { rep: 'jordan', booked: 6, showed: 6, won: 1, today: 'Call Lena Park now. She has been waiting since 1:14.', lead: 'lena',
      note: { kind: 'win', text: 'Confirmed the agenda on every booking. All six showed.', quote: 'So Thursday at ten your time, and we’ll cover the leak, the fix, and the price.', mark: 'the leak, the fix, and the price', call: 'Call 566' } },
  ] as RepDay[],
  /** The same pool of leads, split by where they came from. */
  sources: [
    { src: 'Paid social', leads: 41, booked: 21, showed: 14, won: 3 },
    { src: 'Referral', leads: 6, booked: 6, showed: 6, won: 2 },
    { src: 'Podcast', leads: 11, booked: 9, showed: 5, won: 0 },
  ],
  /** Every objection heard yesterday, and the offer change that would stop it coming up. */
  objections: [
    { said: '“We need to think about the price.”', tag: 'Budget', count: 9, lost: 3, change: 'Offer monthly terms before any discount. Same price, spread out.' },
    { said: '“I have to run it by my partner.”', tag: 'Authority', count: 6, lost: 2, change: 'A refundable start: bring the partner to onboarding, full refund if it isn’t right.' },
    { said: '“Sounds great, if it actually works.”', tag: 'Trust', count: 5, lost: 2, change: 'Guarantee the outcome they named, with simple conditions.' },
    { said: '“We’d need to set all that up first.”', tag: 'Readiness', count: 3, lost: 1, change: 'Add setup to the offer. We connect every tool for them.' },
  ],
  sentTo: [
    { who: 'Alex Rivera', role: 'Owner', gets: 'Everything' },
    { who: 'Kai Brooks', role: 'Marketing', gets: 'Lead quality by source' },
    { who: 'Five reps', role: 'Sales', gets: 'Their own page: one win or one fix, and their first call' },
  ],
};
