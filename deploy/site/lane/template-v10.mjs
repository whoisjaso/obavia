// The confirmation email for a buyer who signed up on obavia.co/waitlist.html
// (template version waitlist-confirmation-v10). That page posts {email} and
// nothing else, so there is no name to greet. One action: see the lane. The
// three pairs are the page's own: the $250 deposit and back if you lose; a
// Texas driver's license; a price, a time, a name. No fee is named, no outcome
// and no saving is promised. No en or em dashes.
//
// waitlistTemplateVersion is the one rule that picks the confirmation for a
// POST /api/waitlist body: an application gets v9, a body with no application
// and no fullName gets v10, anything else keeps the legacy version the worker
// is configured with (WAITLIST_TEMPLATE_VERSION).
//
// Standalone ES module with no imports. The obavia-waitlist bundle
// (deploy/site/live-worker.js) carries a verbatim copy, written by
// deploy/site/lane/sync-bundle.mjs. v2 to v9 stay as they are.

export const BUYER_TEMPLATE_VERSION = "waitlist-confirmation-v10";
const APPLICATION_TEMPLATE_VERSION = "waitlist-confirmation-v9";

export function waitlistTemplateVersion(body, legacyVersion) {
  const has = (key) => body !== null && typeof body === "object" && body[key] !== undefined && body[key] !== null;
  if (has("application")) return APPLICATION_TEMPLATE_VERSION;
  if (!has("fullName")) return BUYER_TEMPLATE_VERSION;
  return legacyVersion;
}

export const waitlistV10 = Object.freeze({
  subject: "You're on the lane",
  text: "Hello,\n\nYou're on the lane.\n\nA $250 deposit to bid. Back if you lose.\nA Texas driver's license.\nA price, a time, a name.\n\nSee the lane: https://obavia.co/waitlist.html#deposit\n",
  html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>You're on the lane</title><style>@media(prefers-reduced-motion:reduce){.motion{display:none!important}.still{display:block!important}}a:focus-visible{outline:3px solid #607ab4;outline-offset:4px}</style></head><body style="margin:0;padding:0;background:#ffffff;color:#28344f;-webkit-text-size-adjust:100%;"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">A $250 deposit to bid, back if you lose. A Texas driver's license. A price, a time, a name.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff"><tr><td align="center" style="padding:24px 16px 56px;">
<!--[if mso]><table role="presentation" width="560"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;"><tr><td align="center"><img class="motion" src="https://obavia.co/email-assets/waitlist-v4/cloud.gif" width="560" alt="Obavia" style="display:block;width:100%;max-width:560px;height:auto;border:0;"><!--[if !mso]><!--><img class="still" src="https://obavia.co/email-assets/waitlist-v4/cloud.png" width="560" alt="Obavia" style="display:none;width:100%;max-width:560px;height:auto;border:0;mso-hide:all;"><!--<![endif]--></td></tr>
<tr><td align="center" style="padding:12px 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;"><p style="margin:0 0 16px;color:#526173;font-size:16px;line-height:24px;">Hello,</p><h1 style="margin:0;font-size:32px;line-height:1.2;font-weight:600;letter-spacing:-1px;color:#28344f;">You're on the lane.</h1></td></tr>
<tr><td align="center" style="padding:24px 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:17px;line-height:28px;color:#28344f;"><p style="margin:0 0 8px;">A $250 deposit to bid. Back if you lose.</p><p style="margin:0 0 8px;">A Texas driver's license.</p><p style="margin:0;">A price, a time, a name.</p></td></tr>
<tr><td align="center" style="padding:32px 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#e7eefe" style="border:1px solid #dce5f6;border-radius:24px;mso-padding-alt:14px 24px;"><a href="https://obavia.co/waitlist.html#deposit" style="display:inline-block;padding:14px 24px;font-size:14px;line-height:20px;font-weight:600;color:#28344f;text-decoration:none;border-radius:24px;">See the lane</a></td></tr></table></td></tr>
<tr><td align="center" style="padding:12px 0 0;"><img class="motion" src="https://obavia.co/email-assets/waitlist-v7/cloud-footer.gif" width="560" alt="" role="presentation" style="display:block;width:100%;max-width:560px;height:auto;border:0;"><!--[if !mso]><!--><img class="still" src="https://obavia.co/email-assets/waitlist-v7/cloud-footer.png" width="560" alt="" role="presentation" style="display:none;width:100%;max-width:560px;height:auto;border:0;mso-hide:all;"><!--<![endif]--></td></tr>
</table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>
`
});
export function renderWaitlistV10() {
  return { ...waitlistV10 };
}
