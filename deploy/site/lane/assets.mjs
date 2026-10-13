// The site's asset folders below the top level, for the obavia-waitlist Worker.
// The bundle's own asset branch serves top-level files and /assets/ paths made
// of [\w./-] only, so these would 404 in production:
//   /sky/        cloud.css:8, 20 to 23 (sky/clouds/*.webp); shell.css:29, 33
//                (sky/paper.png, sky/grain.png); 404.html:26 to 42 and the legacy
//                about.html, product.html, team.html (sky/w0.webp to w7.webp)
//   /audio/      site.js:99, 114 (audio/cloud/cloud-<name>.wav)
//   /logos/      obavia-co/logos/*.svg exist; no page references them today
//   /connections/ no top-level folder today; the connection marks live in
//                assets/connections, which the existing branch already serves
//   /assets/cloud-3d/  cloud3d.js:17, cloud3d-engine.js:440, 444, 467 to 473
//                (far@2x.webp, rest@2x.png, sheet.json: the "@" fails the
//                existing /assets/ pattern)
// Each may sit under /obavia/ as the pages do. Only GET and HEAD, only the
// listed extensions, no dot-leading segment. Headers follow the existing
// branch: the ASSETS response's own, plus nosniff and no-referrer, with the
// Content-Type set from the extension. Anything else in these folders is 404.
// serveSiteAsset answers null for a path outside them, so the caller's other
// branches run unchanged.
//
// Standalone ES module with no imports. The obavia-waitlist bundle
// (deploy/site/live-worker.js) carries a verbatim copy, written by
// deploy/site/lane/sync-bundle.mjs.

export const SITE_ASSET_FOLDERS = Object.freeze(["sky", "audio", "logos", "connections", "assets/cloud-3d"]);
export const SITE_ASSET_TYPES = Object.freeze({
  webp: "image/webp",
  png: "image/png",
  svg: "image/svg+xml",
  wav: "audio/wav",
  woff2: "font/woff2",
  json: "application/json; charset=utf-8"
});
const SITE_ASSET_ROOT = /^\/(?:obavia\/)?(sky|audio|logos|connections|assets\/cloud-3d)\//;
const SITE_ASSET_PATH = /^\/(?:obavia\/)?(?:sky|audio|logos|connections|assets\/cloud-3d)(?:\/[A-Za-z0-9_@-][A-Za-z0-9_@.-]*)+$/;
const SITE_ASSET_MISS = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

// The Content-Type for a path in the folders, or null when the path is not one we serve.
export function siteAssetType(pathname) {
  if (typeof pathname !== "string" || !SITE_ASSET_PATH.test(pathname) || pathname.includes("..")) return null;
  const ext = pathname.slice(pathname.lastIndexOf("/") + 1).match(/\.([a-z0-9]+)$/)?.[1];
  return ext && Object.hasOwn(SITE_ASSET_TYPES, ext) ? SITE_ASSET_TYPES[ext] : null;
}

export async function serveSiteAsset(request, env, url = new URL(request.url)) {
  if (!SITE_ASSET_ROOT.test(url.pathname)) return null;
  const type = siteAssetType(url.pathname);
  if (!["GET", "HEAD"].includes(request.method) || !type || !env?.ASSETS) return new Response("Not Found", { status: 404, headers: SITE_ASSET_MISS });
  const response = await env.ASSETS.fetch(request);
  const headers = new Headers(response.headers);
  if (response.ok) headers.set("Content-Type", type);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, headers });
}
