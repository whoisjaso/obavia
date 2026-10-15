import { writeFileSync } from 'node:fs';
import { buildPkpass, walletConfigured } from '../functions/wallet/pass.mjs';

const out = process.argv[2] || 'obavia-launch.pkpass';
if (!walletConfigured(process.env)) {
  console.error('Set PASS_TYPE_ID, TEAM_ID, PASS_CERT, and PASS_KEY. See docs/apple-wallet-pass.md.');
  process.exit(1);
}
writeFileSync(out, buildPkpass(process.env));
console.log(out);
