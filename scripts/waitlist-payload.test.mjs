import assert from 'node:assert/strict';
import { CHANNELS, LAUNCH_MS, buildPayload, cleanName, cleanObjection, cleanCalls, cleanPhone, utmJson, waitlistEndpoint, chicagoLaunchLabel } from '../obavia-co/waitlist.js';

const answers = {
  fullName: 'Ada Lovelace',
  email: 'ada@agency.com',
  website: '',
  sellChannel: 'video',
  callsPerWeek: 12,
  topObjection: 'It’s too expensive.',
  phone: '+1 312 555 0100',
  search: '?utm_source=ig&utm_medium=story&ref=skip',
};

const legacy = buildPayload({ ...answers, v2: false });
assert.deepEqual(Object.keys(legacy), ['fullName', 'email', 'website']);
assert.equal(JSON.stringify(legacy).includes('callsPerWeek'), false);
assert.equal(JSON.stringify(legacy).includes('phone'), false);
assert.equal(legacy.website, '');

const next = buildPayload({ ...answers, v2: true });
assert.equal(next.sellChannel, 'video');
assert.equal(next.callsPerWeek, 12);
assert.equal(next.topObjection, 'It’s too expensive.');
assert.equal(next.phone, '+1 312 555 0100');
assert.equal(Object.hasOwn(next, 'role'), false);
assert.equal(Object.hasOwn(next, 'teamSize'), false);
assert.equal(next.utm, JSON.stringify({ utm_source: 'ig', utm_medium: 'story' }));
assert.equal(Object.hasOwn(next, 'ref'), false);

const emptyExtras = buildPayload({ ...answers, topObjection: '', phone: '', search: '', v2: true });
assert.equal(Object.hasOwn(emptyExtras, 'topObjection'), false);
assert.equal(Object.hasOwn(emptyExtras, 'phone'), false);
assert.equal(Object.hasOwn(emptyExtras, 'utm'), false);

assert.equal(buildPayload({ ...answers, v2: 'true' }).sellChannel, undefined);
assert.equal(cleanName('  Ada   Lovelace '), 'Ada Lovelace');
assert.equal(cleanName(''), null);
assert.equal(cleanName('A'.repeat(161)), null);
assert.equal(cleanName('Ada\u0000Lovelace'), null);
assert.equal(cleanObjection(''), '');
assert.equal(cleanObjection('x'.repeat(281)), null);
assert.equal(cleanObjection('Too\nexpensive'), 'Too expensive');
assert.equal(cleanCalls('0'), 0);
assert.equal(cleanCalls('12'), 12);
assert.equal(cleanCalls('999'), 999);
assert.equal(cleanCalls(''), null);
assert.equal(cleanCalls('12.5'), null);
assert.equal(cleanCalls('1000'), null);
assert.equal(cleanCalls('-1'), null);
assert.equal(cleanPhone(''), '');
assert.equal(cleanPhone('  +1 (312) 555-0100 '), '+1 (312) 555-0100');
assert.equal(cleanPhone('123'), null);
assert.equal(cleanPhone('call me'), null);

const huge = utmJson('?utm_source=' + 'a'.repeat(400) + '&utm_campaign=' + 'b'.repeat(400));
assert.ok(huge.length <= 512);

assert.equal(waitlistEndpoint('https://obavia.co'), 'https://obavia.co/api/waitlist');
assert.equal(waitlistEndpoint('https://www.obavia.co'), 'https://www.obavia.co/api/waitlist');
assert.equal(waitlistEndpoint('http://127.0.0.1:4173'), null);

assert.deepEqual(CHANNELS, ['phone', 'video', 'both']);

const chicago = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
}).format(new Date(LAUNCH_MS));
assert.equal(chicago, '04/24/2027, 00:00');
assert.equal(chicagoLaunchLabel(LAUNCH_MS), 'April 24, 2027');

console.log('waitlist payload checks passed');
