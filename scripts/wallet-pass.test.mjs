import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPkpass, walletConfigured, LAUNCH_RELEVANT_DATE } from '../functions/wallet/pass.mjs';

const ics = readFileSync(new URL('../obavia-co/assets/obavia-launch.ics', import.meta.url));
assert.equal(ics.toString('latin1').replaceAll('\r\n', '').includes('\n'), false);
const calendar = ics.toString('utf8');
assert.match(calendar, /DTSTART;TZID=America\/Chicago:20270424T090000/);
assert.match(calendar, /DTEND;TZID=America\/Chicago:20270424T100000/);
assert.match(calendar, /TRIGGER:-P1D/);
assert.match(calendar, /TRIGGER:PT0S/);
assert.equal((calendar.match(/BEGIN:VALARM/g) || []).length, 2);

assert.equal(LAUNCH_RELEVANT_DATE, '2027-04-24T09:00:00-05:00');
assert.equal(walletConfigured({}), false);
assert.equal(walletConfigured({ PASS_TYPE_ID: 'pass.co.obavia.launch', TEAM_ID: 'TEAMID1234', PASS_CERT: 'x', PASS_KEY: ' ' }), false);

const dir = mkdtempSync(join(tmpdir(), 'obavia-pass-'));
try {
  const key = join(dir, 'key.pem');
  const cert = join(dir, 'cert.pem');
  const pkcs8 = join(dir, 'key8.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-keyout', key, '-out', cert, '-days', '30', '-nodes', '-subj', '/CN=Obavia Pass Test']);
  execFileSync('openssl', ['pkcs8', '-topk8', '-nocrypt', '-in', key, '-out', pkcs8]);
  const env = {
    PASS_TYPE_ID: 'pass.co.obavia.launch',
    TEAM_ID: 'TEAMID1234',
    PASS_CERT: readFileSync(cert, 'utf8'),
    PASS_KEY: readFileSync(pkcs8, 'utf8'),
    PASS_WWDR: readFileSync(cert, 'utf8'),
  };
  const pass = buildPkpass(env);
  const zipPath = join(dir, 'pass.pkpass');
  writeFileSync(zipPath, pass);
  execFileSync('unzip', ['-o', zipPath, '-d', join(dir, 'unzipped')]);
  const unpacked = join(dir, 'unzipped');
  const manifest = JSON.parse(readFileSync(join(unpacked, 'manifest.json'), 'utf8'));
  const passJson = JSON.parse(readFileSync(join(unpacked, 'pass.json'), 'utf8'));
  assert.equal(passJson.relevantDate, LAUNCH_RELEVANT_DATE);
  assert.equal(passJson.eventTicket.primaryFields[0].value, 'Obavia opens');
  for (const [name, hex] of Object.entries(manifest)) {
    const digest = execFileSync('openssl', ['dgst', '-sha1', '-r', join(unpacked, name)], { encoding: 'utf8' }).slice(0, 40);
    assert.equal(digest, hex, name);
  }
  assert.equal(manifest.signature, undefined);
  execFileSync('openssl', [
    'cms', '-verify', '-binary', '-inform', 'DER',
    '-in', join(unpacked, 'signature'),
    '-content', join(unpacked, 'manifest.json'),
    '-certfile', cert,
    '-noverify',
    '-out', '/dev/null',
  ]);
  const pkcs1 = { ...env, PASS_KEY: readFileSync(key, 'utf8') };
  assert.ok(buildPkpass(pkcs1).byteLength > 500);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log('wallet-pass.test.mjs ok');
