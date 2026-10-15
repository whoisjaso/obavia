import assert from 'node:assert/strict';
import { CHANNELS, ROLES, TEAMS, LAUNCH_MS, buildPayload, cleanName, cleanObjection, utmJson, waitlistEndpoint, chicagoLaunchLabel } from '../obavia-co/waitlist.js';

const answers = {
  fullName: 'Ada Lovelace',
  email: 'ada@agency.com',
  website: '',
  sellChannel: 'video',
  role: 'founder',
  teamSize: '2-10',
  topObjection: 'It’s too expensive.',
  search: '?utm_source=ig&utm_medium=story&ref=skip',
};

const legacy = buildPayload({ ...answers, v2: false });
assert.deepEqual(Object.keys(legacy), ['fullName', 'email', 'website']);
assert.equal(JSON.stringify(legacy).includes('sellChannel'), false);
assert.equal(legacy.website, '');

const next = buildPayload({ ...answers, v2: true });
assert.equal(next.sellChannel, 'video');
assert.equal(next.role, 'founder');
assert.equal(next.teamSize, '2-10');
assert.equal(next.topObjection, 'It’s too expensive.');
assert.equal(next.utm, JSON.stringify({ utm_source: 'ig', utm_medium: 'story' }));
assert.equal(Object.hasOwn(next, 'ref'), false);

const emptyObjection = buildPayload({ ...answers, topObjection: '', search: '', v2: true });
assert.equal(Object.hasOwn(emptyObjection, 'topObjection'), false);
assert.equal(Object.hasOwn(emptyObjection, 'utm'), false);

assert.equal(buildPayload({ ...answers, v2: 'true' }).sellChannel, undefined);
assert.equal(cleanName('  Ada   Lovelace '), 'Ada Lovelace');
assert.equal(cleanName(''), null);
assert.equal(cleanName('A'.repeat(161)), null);
assert.equal(cleanName('Ada\u0000Lovelace'), null);
assert.equal(cleanObjection(''), '');
assert.equal(cleanObjection('x'.repeat(281)), null);
assert.equal(cleanObjection('Too\nexpensive'), 'Too expensive');

const huge = utmJson('?utm_source=' + 'a'.repeat(400) + '&utm_campaign=' + 'b'.repeat(400));
assert.ok(huge.length <= 512);

assert.equal(waitlistEndpoint('https://obavia.co'), 'https://obavia.co/api/waitlist');
assert.equal(waitlistEndpoint('https://www.obavia.co'), 'https://www.obavia.co/api/waitlist');
assert.equal(waitlistEndpoint('http://127.0.0.1:4173'), null);

assert.deepEqual(CHANNELS, ['phone', 'video', 'both']);
assert.deepEqual(ROLES, ['ae_closer', 'sdr_setter', 'founder', 'manager']);
assert.deepEqual(TEAMS, ['1', '2-10', '11-50', '51+']);

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
