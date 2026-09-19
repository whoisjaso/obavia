// Scans UI source for banned bare labels outside the dictionaries.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const BANNED = [/\bVerified\b/, /\bSold\b/, /No hidden fees/i, /\bVerificado\b/, /\bVendido\b/];
const roots = ["app", "components"];
let bad = 0;

function walk(p) {
  for (const f of readdirSync(p)) {
    const fp = join(p, f);
    if (statSync(fp).isDirectory()) walk(fp);
    else if (/\.(tsx?|css)$/.test(f)) {
      const src = readFileSync(fp, "utf8");
      for (const re of BANNED) {
        if (re.test(src)) {
          console.error(`${fp}: matches ${re}`);
          bad++;
        }
      }
    }
  }
}

for (const r of roots) walk(r);
if (bad) process.exit(1);
console.log("claims lint: ok");
