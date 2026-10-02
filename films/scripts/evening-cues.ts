// Prints the film's sound cues as JSON for the score.
import { CUES, SECONDS } from "../src/evening/timeline";
process.stdout.write(JSON.stringify({ seconds: SECONDS, cues: CUES }));
