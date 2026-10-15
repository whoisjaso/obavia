import forge from 'node-forge';
import { PASS_IMAGES } from './images.mjs';
import { WWDR_G4_PEM } from './wwdr.mjs';

export const LAUNCH_RELEVANT_DATE = '2027-04-24T09:00:00-05:00';
const REQUIRED = ['PASS_TYPE_ID', 'TEAM_ID', 'PASS_CERT', 'PASS_KEY'];

export function walletConfigured(env) {
  return REQUIRED.every((key) => typeof env?.[key] === 'string' && env[key].trim().length > 0);
}

function text(value) {
  return new TextEncoder().encode(value);
}

function bytesToBinary(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) out += String.fromCharCode(bytes[i]);
  return out;
}

function decodeBase64(encoded) {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function sha1Hex(bytes) {
  const md = forge.md.sha1.create();
  md.update(bytesToBinary(bytes), 'raw');
  return md.digest().toHex();
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const file of files) {
    const name = text(file.name);
    const crc = crc32(file.data);
    const local = new Uint8Array(30 + name.length + file.data.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0x21, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, file.data.length, true);
    view.setUint32(22, file.data.length, true);
    view.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(file.data, 30 + name.length);
    const central = new Uint8Array(46 + name.length);
    const directory = new DataView(central.buffer);
    directory.setUint32(0, 0x02014b50, true);
    directory.setUint16(4, 20, true);
    directory.setUint16(6, 20, true);
    directory.setUint16(12, 0, true);
    directory.setUint16(14, 0x21, true);
    directory.setUint32(16, crc, true);
    directory.setUint32(20, file.data.length, true);
    directory.setUint32(24, file.data.length, true);
    directory.setUint16(28, name.length, true);
    directory.setUint32(42, offset, true);
    central.set(name, 46);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  const out = new Uint8Array(offset + centralSize + end.length);
  let cursor = 0;
  for (const part of locals) {
    out.set(part, cursor);
    cursor += part.length;
  }
  for (const part of centrals) {
    out.set(part, cursor);
    cursor += part.length;
  }
  out.set(end, cursor);
  return out;
}

function loadPrivateKey(pem, passphrase) {
  const source = pem.trim();
  if (source.includes('BEGIN ENCRYPTED PRIVATE KEY')) {
    const message = forge.pem.decode(source)[0];
    const decrypted = forge.pki.decryptPrivateKeyInfo(forge.asn1.fromDer(message.body), passphrase || '');
    if (!decrypted) throw new Error('pass_key_passphrase');
    return forge.pki.privateKeyFromAsn1(decrypted);
  }
  if (passphrase && source.includes('BEGIN RSA PRIVATE KEY')) {
    const key = forge.pki.decryptRsaPrivateKey(source, passphrase);
    if (!key) throw new Error('pass_key_passphrase');
    return key;
  }
  if (source.includes('BEGIN RSA PRIVATE KEY')) return forge.pki.privateKeyFromPem(source);
  const message = forge.pem.decode(source)[0];
  const asn1 = forge.asn1.fromDer(message.body);
  return forge.pki.privateKeyFromAsn1(forge.asn1.fromDer(asn1.value[2].value));
}

function signDetached(manifestBytes, certPem, keyPem, wwdrPem, passphrase) {
  const certificate = forge.pki.certificateFromPem(certPem.trim());
  const wwdr = forge.pki.certificateFromPem(wwdrPem.trim());
  const key = loadPrivateKey(keyPem, passphrase);
  const signed = forge.pkcs7.createSignedData();
  signed.content = forge.util.createBuffer(bytesToBinary(manifestBytes), 'raw');
  signed.addCertificate(certificate);
  signed.addCertificate(wwdr);
  signed.addSigner({
    key,
    certificate,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date('2026-10-15T00:00:00Z') },
    ],
  });
  signed.sign({ detached: true });
  const der = forge.asn1.toDer(signed.toAsn1()).getBytes();
  const bytes = new Uint8Array(der.length);
  for (let i = 0; i < der.length; i += 1) bytes[i] = der.charCodeAt(i) & 0xff;
  return bytes;
}

export function passJson(env) {
  return {
    formatVersion: 1,
    passTypeIdentifier: env.PASS_TYPE_ID.trim(),
    serialNumber: 'obavia-launch-2027-04-24',
    teamIdentifier: env.TEAM_ID.trim(),
    organizationName: 'Obavia',
    description: 'Obavia early access opens',
    foregroundColor: 'rgb(28, 38, 64)',
    backgroundColor: 'rgb(244, 247, 255)',
    labelColor: 'rgb(78, 102, 160)',
    relevantDate: LAUNCH_RELEVANT_DATE,
    expirationDate: '2027-04-25T05:00:00Z',
    eventTicket: {
      headerFields: [{ key: 'day', label: 'CHICAGO', value: 'Apr 24' }],
      primaryFields: [{ key: 'event', label: 'EARLY ACCESS', value: 'Obavia opens' }],
      secondaryFields: [{ key: 'when', label: 'WHEN', value: 'April 24, 2027' }],
      auxiliaryFields: [{ key: 'time', label: 'MORNING', value: '9:00 AM' }],
      backFields: [{
        key: 'note',
        label: 'LAUNCH',
        value: 'Early access opens April 24, 2027, 9:00 AM Chicago time. https://obavia.co/waitlist',
      }],
    },
    barcodes: [{
      format: 'PKBarcodeFormatQR',
      message: 'https://obavia.co/waitlist',
      messageEncoding: 'iso-8859-1',
    }],
  };
}

export function buildPkpass(env) {
  if (!walletConfigured(env)) throw new Error('wallet_unconfigured');
  const files = [{ name: 'pass.json', data: text(`${JSON.stringify(passJson(env))}\n`) }];
  for (const [name, encoded] of Object.entries(PASS_IMAGES)) {
    files.push({ name, data: decodeBase64(encoded) });
  }
  const manifest = {};
  for (const file of files) manifest[file.name] = sha1Hex(file.data);
  const manifestBytes = text(`${JSON.stringify(manifest)}\n`);
  files.push({ name: 'manifest.json', data: manifestBytes });
  files.push({
    name: 'signature',
    data: signDetached(
      manifestBytes,
      env.PASS_CERT,
      env.PASS_KEY,
      (env.PASS_WWDR || WWDR_G4_PEM).trim(),
      env.PASS_KEY_PASSPHRASE,
    ),
  });
  return zipStore(files);
}
