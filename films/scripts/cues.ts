// Prints a film's sound cues as JSON for scripts/score.py: npx tsx scripts/cues.ts evening|pain|bill
import * as evening from "../src/evening/timeline";
import * as pain from "../src/pain/timeline";
import * as bill from "../src/bill/timeline";
const films = { evening, pain, bill } as const;
const film = films[(process.argv[2] ?? "evening") as keyof typeof films];
if (!film) { console.error("unknown film"); process.exit(2); }
process.stdout.write(JSON.stringify({ seconds: film.SECONDS, cues: film.CUES }));
