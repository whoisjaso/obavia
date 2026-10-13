/* Higgsfield: Seedance 2.5 text-to-video, through the official SDK.

   Credentials stay server-side. They are read at runtime from HF_CREDENTIALS
   ("key-id:key-secret"): either the environment, or films/.env.local, which
   Git ignores. The value is never printed.

   npx tsx higgsfield/index.ts          # one billable 5-second generation */
import { config as loadEnv } from "dotenv";
import { config, higgsfield } from "@higgsfield/client/v2";

loadEnv({ path: new URL("../.env.local", import.meta.url).pathname, quiet: true });

const credentials = process.env.HF_CREDENTIALS;
if (!credentials || !/^[^:\s]+:[^:\s]+$/.test(credentials)) {
  console.error("HF_CREDENTIALS is not set (expected key-id:key-secret in the environment or films/.env.local).");
  process.exit(2);
}
config({ credentials });

const MODEL = "bytedance/seedance-2.5/text-to-video";

async function main() {
  const result = await higgsfield.subscribe(MODEL, {
    input: { prompt: "A cinematic scene at sunset", duration: 5, resolution: "720p", aspect_ratio: "16:9" },
    withPolling: true,
  });
  const status = result.status as string;
  if (status === "completed" && result.video?.url) {
    console.log(`completed ${result.request_id}`);
    console.log(result.video.url);
    return;
  }
  // failed, nsfw (moderated), canceled, or completed without a file: none of these is a success
  const why = status === "nsfw" ? "moderated (nsfw)" : status === "completed" ? "completed without a video URL" : status;
  console.error(`not generated: ${why} (request ${result.request_id})`);
  process.exit(1);
}

main().catch(err => {
  // the SDK's errors carry status and message only; never the credentials
  console.error(`request failed: ${err?.name ?? "Error"}: ${err?.message ?? err}`);
  process.exit(1);
});
