/* obavia.co: serves the new site, and hands the waitlist API, the email
   assets and the confirmation cron to the live waitlist Worker unchanged
   (live-worker.js is its code, as deployed). */
import live from './live-worker.js';

const PAGES = new Set(['/', '/about', '/ads', '/owners', '/pricing', '/product', '/team', '/waitlist']);
const MOVED = { '/teams': '/team', '/for-teams': '/team', '/setup': '/product', '/blog': '/', '/privacy': '/' };
const ASSET = /^\/(?:[\w-]+\/)*[\w-]+\.(?:css|js|svg|png|webp|jpg|gif|ico|mp4|woff2)$/;
const LONG = /^\/(?:sky|logos|ads|shots)\//;

function origins(env) {
  return [env.PUBLIC_ORIGIN, env.SECONDARY_ORIGIN].filter(Boolean);
}

function withHeaders(res, status, extra = {}) {
  const h = new Headers(res.headers);
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return new Response(res.body, { status: status ?? res.status, headers: h });
}

async function notFound(req, env) {
  const page = await env.ASSETS.fetch(new Request(new URL('/404', req.url)));
  return withHeaders(page, 404, { 'Cache-Control': 'no-store' });
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    let path = url.pathname;
    if (path === '/api/waitlist' || path.startsWith('/email-assets/')) return live.fetch(req, env, ctx);
    if (!origins(env).includes(url.origin)) return live.fetch(req, env, ctx);
    if (!['GET', 'HEAD'].includes(req.method)) return new Response('Method Not Allowed', { status: 405 });

    // Old and .html links land on the clean URL.
    let to = path.replace(/^\/obavia(?=\/|$)/, '') || '/';
    to = to === '/index.html' ? '/' : to.replace(/\.html$/, '');
    to = MOVED[to] ?? to;
    if (to !== path) return Response.redirect(new URL(to + url.search, url.origin).toString(), 301);

    if (PAGES.has(path)) {
      const res = await env.ASSETS.fetch(req);
      return res.ok ? withHeaders(res) : notFound(req, env);
    }
    if (ASSET.test(path)) {
      const res = await env.ASSETS.fetch(req);
      if (res.status === 404) return notFound(req, env);
      return withHeaders(res, undefined, LONG.test(path) && res.ok ? { 'Cache-Control': 'public, max-age=604800' } : {});
    }
    return notFound(req, env);
  },
  scheduled(controller, env, ctx) {
    return live.scheduled(controller, env, ctx);
  },
};
