import { clean, readPhoto } from "../../_shared/vehicle-store.js";

function dataUrlToBytes(dataUrl) {
  const match = /^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/i.exec(dataUrl || "");
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { contentType: match[1], bytes };
}

export async function onRequestGet({ params, env }) {
  const key = clean(params.key, 180);
  if (!key) return new Response("Not found", { status: 404 });
  const dataUrl = await readPhoto(env, key);
  const parsed = dataUrlToBytes(dataUrl);
  if (!parsed) return new Response("Not found", { status: 404 });
  return new Response(parsed.bytes, {
    headers: {
      "content-type": parsed.contentType,
      "cache-control": "public, max-age=3600, must-revalidate",
      "x-content-type-options": "nosniff"
    }
  });
}
