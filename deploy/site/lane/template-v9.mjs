// The confirmation email for a Texas dealer who applied to the lane on
// obavia.co (template version waitlist-confirmation-v9). One action: see how
// the lane works. No fee is named: none exists before Obavia's GDN issues
// (43 TAC 215.85). No outcome is promised. No en or em dashes.
//
// Standalone ES module with no imports. The obavia-waitlist bundle
// (deploy/site/live-worker.js) carries a verbatim copy, written by
// deploy/site/lane/sync-bundle.mjs. v2 to v8 stay as they are.

// The endpoint's full-name rule (normalizeName(value, 160) in endpoint.ts), copied
// so this module stands alone. The stored greeting name has already passed it.
function laneNormalizeFullName(value) {
  if (typeof value !== "string" || /[\p{Cc}\p{Cs}\p{Zl}\p{Zp}\u061c\u200e-\u200f\u202a-\u202e\u2066-\u2069]/u.test(value)) return null;
  const name = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  return [...name].length >= 1 && [...name].length <= 160 ? name : null;
}
const escapeHTML3 = (value) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const waitlistV9 = Object.freeze({
  subject: "Your Obavia lane application is in",
  text: "Hello,\n\nYour application for the Obavia lane is in.\n\nThe lane is for licensed Texas dealers, so we check your GDN number against the TxDMV dealer list and then write to you at this address.\n\nSee how the lane works: https://obavia.co/#how\n",
  html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Your Application Is In</title><style>@media(prefers-reduced-motion:reduce){.motion{display:none!important}.still{display:block!important}}a:focus-visible{outline:3px solid #607ab4;outline-offset:4px}</style></head><body style="margin:0;padding:0;background:#ffffff;color:#28344f;-webkit-text-size-adjust:100%;"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">We check your GDN number against the TxDMV dealer list, then write to you here.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff"><tr><td align="center" style="padding:24px 16px 56px;">
<!--[if mso]><table role="presentation" width="560"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;"><tr><td align="center"><img class="motion" src="https://obavia.co/email-assets/waitlist-v4/cloud.gif" width="560" alt="Obavia" style="display:block;width:100%;max-width:560px;height:auto;border:0;"><!--[if !mso]><!--><img class="still" src="https://obavia.co/email-assets/waitlist-v4/cloud.png" width="560" alt="Obavia" style="display:none;width:100%;max-width:560px;height:auto;border:0;mso-hide:all;"><!--<![endif]--></td></tr>
<tr><td align="center" style="padding:12px 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;"><p style="margin:0 0 16px;color:#526173;font-size:16px;line-height:24px;overflow-wrap:anywhere;word-break:break-word;">Hello,</p><h1 style="margin:0;font-size:32px;line-height:1.2;font-weight:600;letter-spacing:-1px;color:#28344f;">Your Application Is In.</h1></td></tr>
<tr><td align="center" style="padding:16px 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;line-height:24px;color:#526173;">The lane is for licensed Texas dealers, so we check your GDN number against the TxDMV dealer list and then write to you at this address.</td></tr>
<tr><td align="center" style="padding:32px 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#e7eefe" style="border:1px solid #dce5f6;border-radius:24px;mso-padding-alt:14px 24px;"><a href="https://obavia.co/#how" style="display:inline-block;padding:14px 24px;font-size:14px;line-height:20px;font-weight:600;color:#28344f;text-decoration:none;border-radius:24px;">See how the lane works</a></td></tr></table></td></tr>
<tr><td align="center" style="padding:12px 0 0;"><img class="motion" src="https://obavia.co/email-assets/waitlist-v7/cloud-footer.gif" width="560" alt="" role="presentation" style="display:block;width:100%;max-width:560px;height:auto;border:0;"><!--[if !mso]><!--><img class="still" src="https://obavia.co/email-assets/waitlist-v7/cloud-footer.png" width="560" alt="" role="presentation" style="display:none;width:100%;max-width:560px;height:auto;border:0;mso-hide:all;"><!--<![endif]--></td></tr>
</table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>
`
});
export function renderWaitlistV9(fullName) {
  const name = laneNormalizeFullName(fullName);
  const greeting = name ? `Hi ${name},` : "Hello,";
  const html = waitlistV9.html.replace(">Hello,</p>", () => `>${escapeHTML3(greeting)}</p>`);
  return { ...waitlistV9, html, text: waitlistV9.text.replace(/^Hello,/, () => greeting) };
}
export function renderLaneConfirmation(fullName) {
  return renderWaitlistV9(fullName);
}
