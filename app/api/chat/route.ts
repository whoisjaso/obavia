import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { Locale } from "@/lib/domain/types";
import { isLocale } from "@/lib/i18n/dictionaries";
import { advise, type AdvisorResult } from "@/lib/fit/advisor";
import type { BuyerProfile } from "@/lib/fit/engine";
import { containsBannedLanguage } from "@/lib/domain/check";

export const runtime = "nodejs";

interface ChatTurn { role: "user" | "assistant"; text: string }
interface ChatRequest { locale?: string; profile?: BuyerProfile; turns: ChatTurn[] }
export interface ChatResponse { text: string; result: AdvisorResult | null; source: "claude" | "engine" }

const SYSTEM = `You are Obavia, a car-buying assistant for people in Texas (Houston first). You help a buyer understand what they can realistically get, in plain language, in the language they write in (English or Spanish).

Hard rules:
- Everything you say about money is an ESTIMATE built from what the buyer told you. You never pull credit, never decide credit, never approve, never prequalify, never quote an offer. Do not use the words "approved", "guaranteed", "prequalified", or "verified" about the buyer or a vehicle.
- Use the assess_fit tool for every number. Never do payment math yourself and never invent prices. The tool's market prices are estimates for the Houston area, not live listings; say so once when you first show numbers.
- Ask for at most one missing fact at a time (credit band, down payment, desired vehicle or monthly budget). Keep replies short: two to four sentences, no headers, no bullet lists, no emojis.
- Be warm and direct, like a knowledgeable friend who sells cars. Explain jargon in a phrase when you use it.
- When the tool says a vehicle is a stretch or unlikely, say so honestly and point to what would change it (more down, longer term, a different vehicle) and to the alternatives the tool returned.
- Never recommend a specific dealer or a specific lender. Never discuss the buyer's identity documents. Never ask for a Social Security number, date of birth, or account numbers.`;

const tool: Anthropic.Tool = {
  name: "assess_fit",
  description: "Runs the affordability math for the buyer's current facts and the latest message. Returns estimate cards (payment range, fit, reasons, alternatives) and which facts are still missing. Call this on every buyer message.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      latestText: { type: "string", description: "The buyer's latest message verbatim." },
      creditScore: { type: "number", description: "Self-reported score if the buyer gave one." },
      creditBand: { type: "string", enum: ["deep_subprime", "subprime", "near_prime", "prime", "super_prime"], description: "If the buyer described credit in words." },
      downPayment: { type: "number" },
      monthlyBudget: { type: "number" },
      monthlyIncome: { type: "number" },
      termMonths: { type: "number" },
      desiredVehicle: { type: "string" },
    },
    required: ["latestText"],
  },
  strict: false,
};

export async function POST(req: Request) {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const locale: Locale = body.locale && isLocale(body.locale) ? body.locale : "en";
  const turns = (body.turns ?? []).slice(-12);
  const latest = turns.filter((t) => t.role === "user").at(-1)?.text ?? "";
  const profile: BuyerProfile = body.profile ?? {};

  // Deterministic answer is always computed; it is the ground truth for numbers.
  const engine = advise(profile, latest, locale);

  const viaClaude = await tryClaude(turns, engine, locale);
  if (viaClaude) return NextResponse.json({ text: viaClaude, result: engine, source: "claude" } satisfies ChatResponse);

  const text = engine.nextQuestion ? `${engine.summary} ${engine.nextQuestion}` : engine.summary;
  return NextResponse.json({ text, result: engine, source: "engine" } satisfies ChatResponse);
}

async function tryClaude(turns: ChatTurn[], engine: AdvisorResult, locale: Locale): Promise<string | null> {
  if (process.env.OBAVIA_DISABLE_MODEL === "1") return null;
  const client = new Anthropic({ maxRetries: 1, timeout: 20_000 });
  const messages: Anthropic.MessageParam[] = turns.map((t) => ({ role: t.role, content: t.text }));
  if (messages.length === 0 || messages[0].role !== "user") return null;
  try {
    const first = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1200,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      tools: [tool],
      tool_choice: { type: "auto" },
      output_config: { effort: "low" },
      messages,
    });
    if (first.stop_reason === "refusal") return null;
    const toolUse = first.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!toolUse) {
      const text = first.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";
      return guard(text);
    }
    // The tool result is the engine's output; the model narrates it.
    const followup = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1200,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      tools: [tool],
      output_config: { effort: "low" },
      messages: [
        ...messages,
        { role: "assistant", content: first.content },
        {
          role: "user",
          content: [{ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify({ locale, ...engine }) }],
        },
      ],
    });
    if (followup.stop_reason === "refusal") return null;
    const text = followup.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";
    return guard(text);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.APIConnectionError) return null;
    if (err instanceof Anthropic.APIError) return null;
    return null;
  }
}

// Claims guard: if the model slips into banned language, fall back to the
// engine's own wording rather than ship the sentence.
function guard(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  if (containsBannedLanguage(t) || /prequalif|pre-qualif/i.test(t)) return null;
  return t;
}
