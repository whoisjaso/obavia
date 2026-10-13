// The lane link's page, for the obavia-waitlist Worker: GET /lane/<lotId>.
// The phone's Share sheet (auction/src/store.ts laneLink) and the Desk's
// Marketplace text (desk/src/lib/post.ts laneLink) both send people to
// https://obavia.co/lane/<lotId>. This serves obavia-co/lane/index.html for
// that path; the page reads the lot id from its own address and the lot from
// the auction Worker's public GET /lots/:id (auction/worker/README.md), so one
// static page answers every lot and the Worker here reads nothing.
//
// The lot id is the auction Worker's own shape ([A-Za-z0-9_-]{1,64}). The path
// may sit under /obavia/ as the pages do. Only GET and HEAD; /lane, /lane/,
// anything deeper or a dot in the id is 404. The query is left alone: a buyer's
// share link carries ?r=<code> (gap-table.md W4-E) and the page itself passes it
// to the app and store links; nothing here reads it or logs it. Headers
// follow the pages branch: the ASSETS response's own, plus nosniff and
// no-referrer, with the Content-Type set to HTML on a 200. A path outside
// /lane/ answers null, so the caller's other branches run unchanged.
//
// Standalone ES module with no imports. The obavia-waitlist bundle
// (deploy/site/live-worker.js) carries a verbatim copy, written by
// deploy/site/lane/sync-bundle.mjs.

export const LANE_PAGE = "/lane/index.html";
const LANE_ROOT = /^\/(?:obavia\/)?lane(?:\/|$)/;
const LANE_LOT = /^\/(?:obavia\/)?lane\/([A-Za-z0-9_-]{1,64})$/;
const LANE_MISS = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

// The lot id a lane path names, or null when the path is not a lane link.
export function lanePageLot(pathname) {
  if (typeof pathname !== "string") return null;
  const m = pathname.match(LANE_LOT);
  return m ? m[1] : null;
}

export async function serveLanePage(request, env, url = new URL(request.url)) {
  if (!LANE_ROOT.test(url.pathname)) return null;
  const lot = lanePageLot(url.pathname);
  if (!["GET", "HEAD"].includes(request.method) || !lot || !env?.ASSETS) return new Response("Not Found", { status: 404, headers: LANE_MISS });
  const page = new URL(LANE_PAGE, url.origin);
  const response = await env.ASSETS.fetch(new Request(page, { method: request.method, headers: request.headers }));
  const headers = new Headers(response.headers);
  if (response.ok) headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, headers });
}
