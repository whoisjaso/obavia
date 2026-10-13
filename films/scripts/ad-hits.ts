// Prints the ad's score hits as JSON for scripts/ad-score.py.
import { FPS, SECONDS, hits } from "../src/ad/timeline";
process.stdout.write(JSON.stringify({ fps: FPS, seconds: SECONDS, hits: hits() }));
