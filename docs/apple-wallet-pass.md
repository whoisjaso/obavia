# Apple Wallet pass for the April 24, 2027 launch

`/thanks` can offer **Add to Apple Wallet**. The button stays hidden until Pages can sign a pass. The generator is the Pages Function `functions/api/wallet.js`, which answers `HEAD` and `GET` on `/api/wallet`.

The pass is an `eventTicket`. Its `relevantDate` is `2027-04-24T09:00:00-05:00` (9:00 AM Central, the morning early access opens). It expires at midnight Chicago the next day (`2027-04-25T05:00:00Z`). The barcode opens `https://obavia.co/waitlist`.

## What you create in Apple Developer

1. Enroll in the Apple Developer Program. Wallet passes require a paid membership.
2. Open Certificates, Identifiers & Profiles → Identifiers → Pass Type IDs. Register an identifier such as `pass.co.obavia.launch`. That string is `PASS_TYPE_ID`.
3. On the same Pass Type ID, create a certificate and download the `.cer`.
4. Membership details show a 10-character Team ID. That string is `TEAM_ID`.
5. On a Mac, install the `.cer` into Keychain, export it with its private key as a `.p12`, then turn that into PEM files. Do this on a machine you control. Do not commit the `.p12`, the key, or the certificate.

```sh
openssl pkcs12 -in pass.p12 -clcerts -nokeys -out pass.pem
openssl pkcs12 -in pass.p12 -nocerts -nodes -out pass.key
```

`pass.pem` is `PASS_CERT`. `pass.key` is `PASS_KEY`. An unencrypted PKCS#1 (`BEGIN RSA PRIVATE KEY`) or PKCS#8 (`BEGIN PRIVATE KEY`) key is accepted. If the key stays encrypted, set `PASS_KEY_PASSPHRASE` as well.

The Apple WWDR G4 intermediate (valid through December 10, 2030) is already bundled in `functions/wallet/wwdr.mjs`. It is a public certificate, not a secret. If Apple replaces it, set `PASS_WWDR` to the new PEM.

## Cloudflare Pages environment

Project `obavia`. Add these as encrypted variables (Production, and Preview if you want the button on preview URLs):

| Name | Value |
|---|---|
| `PASS_TYPE_ID` | The Pass Type ID, for example `pass.co.obavia.launch` |
| `TEAM_ID` | The 10-character Team ID |
| `PASS_CERT` | Full `pass.pem`, including the `BEGIN CERTIFICATE` lines |
| `PASS_KEY` | Full `pass.key`, including the `BEGIN` line |
| `PASS_KEY_PASSPHRASE` | Only if the key is encrypted |
| `PASS_WWDR` | Optional replacement for the bundled WWDR PEM |

Paste multiline PEM values as a single secret. A missing or blank required variable makes `HEAD /api/wallet` return 404, and the button stays hidden. When all four required values are set, `HEAD` returns 204 and `GET` returns `application/vnd.apple.pkpass`.

`npm ci` at the repo root installs `node-forge`, which the Function uses to build the detached PKCS#7 signature. The deploy workflow installs it before `wrangler pages deploy`. Wrangler reads `functions/` from the repo root. Do not copy the function into `obavia-co/`.

## Local file, without deploying

```sh
npm ci
PASS_TYPE_ID=pass.co.obavia.launch \
TEAM_ID=YOURTEAMID \
PASS_CERT="$(cat pass.pem)" \
PASS_KEY="$(cat pass.key)" \
node scripts/build-wallet-pass.mjs obavia-launch.pkpass
```

Open the `.pkpass` on an iPhone signed into a device that trusts the Pass Type ID certificate. A throwaway self-signed certificate will build a file and will not install on a phone.
