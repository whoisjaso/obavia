// Probe: is a Claude credential usable from this environment? Prints only
// success/failure class, never a key.
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();
try {
  const r = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 32,
    messages: [{ role: "user", content: "Reply with the single word: ok" }],
  });
  const text = r.content.find((b) => b.type === "text")?.text ?? "";
  console.log("anthropic: reachable, replied:", JSON.stringify(text.slice(0, 20)));
} catch (e) {
  console.log("anthropic: unavailable:", e?.constructor?.name ?? "Error", e?.status ?? "");
}
