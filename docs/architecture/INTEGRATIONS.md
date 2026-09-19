# Integrations — capability, rights, status, fallback
| Integration | Purpose | Program / access | Status | Fallback | Guardrail |
|---|---|---|---|---|---|
| Supabase | DB/auth/storage | own account | assumed present (verify) | — | RLS mandatory |
| Stripe Connect | dealer-as-MoR payments (deposits) | Stripe onboarding | not started | no payments in v1 | NL-1 |
| Stripe Identity | IDV $1.50/verify | Stripe | not started | manual review | TDPSA consent |
| Twilio | SMS, A2P 10DLC | brand $4 + campaign $1.5–10/mo, 1–3 wk | not started | email + in-app | TCPA |
| BoldSign / Dropbox Sign / Documenso | e-sign, cash deals | $30/mo+$0.75/env · $75/mo · AGPL/$250 | research | printed signing path | UETA Ch.322 |
| RouteOne / Dealertrack eContracting | financed RISC vault | certification-gated, months | research | dealer's existing tool; Obavia hands off | NL-3 |
| Dealertrack Opentrack / RouteOne DSP / CDK Fortellis / DealerCenter, Frazer APIs | DMS overlay data | partner programs, contracts | research | manual inventory entry / CSV | — |
| NHTSA vPIC | VIN decode | free API | not started | — | — |
| Meta Automotive Inventory Ads | buyer acquisition | ad account + catalog feed | not started | organic/SEO | claims registry for ad copy |
| 700Credit / lender widget | prequal (later) | partner, permissible purpose | parked | none | NL-3 |
| webDEALER | title/registration | dealer's own account only | n/a | — | NL-2 |
Rule: an integration assumption blocks the dependent production capability until access, permission, and behavior are validated in a disposable test.
