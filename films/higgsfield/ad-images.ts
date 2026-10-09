/* Editorial stills for the Obavia ad, generated with Higgsfield Soul 2.
   Mood and brand only: no badges, no plates, no readable text, no real dealer.
   npx tsx higgsfield/ad-images.ts            (skips stills already on disk) */
import { config as loadEnv } from "dotenv";
import { config, higgsfield } from "@higgsfield/client/v2";
import { existsSync, writeFileSync } from "node:fs";

loadEnv({ path: `${__dirname}/../.env.local`, quiet: true });
const credentials = process.env.HF_CREDENTIALS;
if (!credentials) { console.error("HF_CREDENTIALS is not set."); process.exit(2); }
config({ credentials });

const HOUSE = "Editorial photograph, bright high-key daylight, clean white and pale icy-blue palette, crisp, minimal, generous negative space, shot on medium format, natural colour, no logos, no badges, no license plates, no readable text, no watermark.";
const SHOTS: { id: string; ar: string; prompt: string }[] = [
  { id: "auction", ar: "9:16", prompt: "A clean silver used sedan alone in a bright open-air auto auction lane, low three-quarter front angle, white overcast sky, wet reflective concrete" },
  { id: "keys", ar: "3:4", prompt: "Close-up of a man's hand holding a single car key fob up against a pure white wall, soft long shadow, still life" },
  { id: "photo", ar: "3:4", prompt: "Over-the-shoulder view of hands holding a smartphone photographing a white used SUV on a small sunny car lot, the phone screen showing the SUV" },
  { id: "lot", ar: "9:16", prompt: "A row of four clean used cars on a small independent car lot under a huge pale blue Texas sky, wide, architectural, very minimal" },
  { id: "text", ar: "3:4", prompt: "Close-up of two hands typing a text message on a smartphone, white desk, pale blue sleeve, the screen glowing softly and blurred" },
  { id: "sign", ar: "3:4", prompt: "Overhead shot of a hand signing a crisp white contract with a black pen on a white desk, paper stack, strong soft daylight" },
  { id: "deal", ar: "9:16", prompt: "Two men shaking hands next to the open driver door of a silver used sedan on a bright lot, candid, mid shot, warm genuine moment" },
  { id: "plate", ar: "3:4", prompt: "A blank metal license plate with no characters lying on a white surface next to a car key, top-down still life, soft shadow" },
  { id: "pay", ar: "3:4", prompt: "A hand holding a phone near a small card reader at a bright white counter, contactless payment, minimal" },
  { id: "detail", ar: "3:4", prompt: "Close-up of the headlight and front fender of a pearl white car, curved reflections of a pale blue sky, abstract and minimal" },
  { id: "wheel", ar: "3:4", prompt: "Inside a bright car, steering wheel and dashboard in soft daylight, windshield full of pale sky, minimal" },
  { id: "handover", ar: "3:4", prompt: "One hand passing a car key into another open hand, close-up, white background, editorial still life" },
];

async function one(s: (typeof SHOTS)[number]) {
  const out = `${process.env.AD_SRC ?? `${__dirname}/../out/ad-src`}/${s.id}.jpg`;
  if (existsSync(out)) return `${s.id}: on disk`;
  const r = await higgsfield.subscribe("higgsfield-ai/soul/v2/standard", {
    input: { prompt: `${s.prompt}. ${HOUSE}`, aspect_ratio: s.ar, resolution: "1080p", batch_size: 1, enhance_prompt: false, seed: 4242 },
    withPolling: true,
  });
  const url = r.status === "completed" ? r.images?.[0]?.url : undefined;
  if (!url) return `${s.id}: not generated (${r.status})`;
  writeFileSync(out, Buffer.from(await (await fetch(url)).arrayBuffer()));
  return `${s.id}: saved`;
}

Promise.allSettled(SHOTS.map(one)).then(results =>
  results.forEach((r, i) => console.log(r.status === "fulfilled" ? r.value : `${SHOTS[i].id}: failed ${r.reason?.message ?? r.reason}`)));
