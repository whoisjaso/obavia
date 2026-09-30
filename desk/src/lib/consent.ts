/* Terms a dealer accepts before a risky feature turns on. The text lives here,
   versioned; the acceptance records the version and a hash of the exact words
   shown, so a later change can never be passed off as what they agreed to.
   Source and legal notes: docs/legal/marketplace-posting-terms.md (DRAFT,
   attorney review before customers see it). */

export type Term = { title: string; body: string; ack: string };
export type Terms = { id: 'marketplace'; version: string; terms: Term[]; agreement: string };
export type Consent = { id: Terms['id']; version: string; hash: string; name: string; licence: string; at: string; timeZone: string };

export const MARKETPLACE_TERMS: Terms = {
  id: 'marketplace',
  version: '2026-09-30.1',
  terms: [
    { title: 'Here’s What This Does.', ack: 'Continue', body: 'We get each car’s Marketplace listing ready and fill it into Facebook on your phone, signed in as you. You look it over and choose to post it.' },
    { title: 'It’s Your Account.', ack: 'I Understand', body: 'Posting happens on your own Facebook account, under your control. Following Facebook’s rules is on you, including how often and how much you list.' },
    { title: 'Facebook Can Restrict Your Account.', ack: 'I Understand', body: 'Facebook decides, on its own and without warning, whether to limit, remove or ban listings or accounts. That can happen even when you follow every rule. We can’t stop it, undo it or appeal it for you.' },
    { title: 'We’re Not Responsible For Facebook’s Actions.', ack: 'I Understand', body: 'As far as the law allows, Obavia isn’t liable if Facebook restricts, suspends or bans your account or listings, or for any sales, leads or profits lost because of it. You use this by your own choice and at your own risk.' },
    { title: 'Your Listings Must Be True.', ack: 'I Understand', body: 'Every listing has to match the car on your lot: price, mileage, title and condition, and follow federal and Texas advertising rules. What you post is yours to stand behind.' },
    { title: 'Turn It Off Any Time.', ack: 'Continue', body: 'Turning it off stops us getting Marketplace listings ready. Anything already posted stays up until you take it down. If these terms change, we’ll ask you again first.' },
  ],
  agreement: 'I’ve read this. I understand Facebook may restrict my account, and that Obavia isn’t responsible if it does. I want to turn on Marketplace posting.',
};

/** FNV-1a over the exact words shown. The backend stores a SHA-256 of the same string. */
export function termsHash(t: Terms): string {
  const text = [t.id, t.version, ...t.terms.flatMap(x => [x.title, x.body]), t.agreement].join('\n');
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/** A name that looks like a person signing: two words, letters. */
export const isSignatureName = (s: string) => /^\s*[\p{L}'’.-]{2,}(\s+[\p{L}'’.-]{1,})+\s*$/u.test(s);

/** Consent only counts for the version on screen now. */
export const consentIsCurrent = (c: Consent | undefined, t: Terms) => !!c && c.version === t.version && c.hash === termsHash(t);
