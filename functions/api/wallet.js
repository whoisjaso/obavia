import { buildPkpass, walletConfigured } from '../wallet/pass.mjs';

function missing() {
  return new Response(null, { status: 404, headers: { 'cache-control': 'private, no-store' } });
}

export async function onRequest(context) {
  const { request, env } = context;
  if (!walletConfigured(env)) return missing();
  if (request.method === 'HEAD') {
    return new Response(null, { status: 204, headers: { 'cache-control': 'private, no-store' } });
  }
  if (request.method !== 'GET') return new Response(null, { status: 405 });
  try {
    const pass = buildPkpass(env);
    return new Response(pass, {
      headers: {
        'content-type': 'application/vnd.apple.pkpass',
        'content-disposition': 'attachment; filename="obavia-launch.pkpass"',
        'cache-control': 'private, no-store',
      },
    });
  } catch {
    return new Response('pass_unavailable', { status: 500, headers: { 'cache-control': 'private, no-store' } });
  }
}
