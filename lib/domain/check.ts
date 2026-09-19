import type { CheckVerdict, DocumentKind, DocumentVersion, Finding } from "./types";

export const RULE_SET_VERSION = "obavia-s001-stub-0.1";

// Phrases the checker must never emit (AC-3). Extend via claims registry.
export const BANNED_PHRASES = [
  "approved",
  "guaranteed",
  "will be accepted",
  "no hidden fees",
  "verified",
  "aprobado",
  "garantizado",
  "sin cargos ocultos",
  "verificado",
];

export function containsBannedLanguage(text: string): string | null {
  const lower = text.toLowerCase();
  for (const p of BANNED_PHRASES) {
    // whole-word match so "unverified" style compounds are checked too
    const re = new RegExp(`(^|[^a-záéíóúñ])${p}([^a-záéíóúñ]|$)`, "i");
    if (re.test(lower)) return p;
  }
  return null;
}

export function verdictFrom(findings: Finding[]): CheckVerdict {
  if (findings.some((f) => f.status === "blocker")) return "BLOCKING_ISSUE_DETECTED";
  if (findings.some((f) => f.status === "review")) return "REVIEW_REQUIRED";
  return "NO_KNOWN_BLOCKER";
}

const REQUIRED: DocumentKind[] = [
  "form_130u",
  "bill_of_sale",
  "odometer",
  "title_front",
  "title_back",
];

// Front-end-first stub of the Apohenia rules core. It never reads document
// contents; it reasons only about presence and versions. Unknown facts become
// questions (AC-4). The real rules engine replaces this behind the same
// signature.
export function runPresenceCheck(docs: DocumentVersion[]): Finding[] {
  const latestByKind = new Map<DocumentKind, DocumentVersion>();
  for (const d of docs) {
    const cur = latestByKind.get(d.kind);
    if (!cur || d.version > cur.version) latestByKind.set(d.kind, d);
  }
  const findings: Finding[] = [];
  for (const kind of REQUIRED) {
    const d = latestByKind.get(kind);
    if (!d) {
      findings.push({
        ruleId: `TX_PRESENCE_${kind.toUpperCase()}`,
        status: "review",
        evidence: `No ${kind} page uploaded.`,
        question: `Do you have the ${kind.replace(/_/g, " ")} page for this sale?`,
      });
    } else {
      findings.push({
        ruleId: `TX_PRESENCE_${kind.toUpperCase()}`,
        status: "pass",
        evidence: `${d.fileName} (v${d.version}) present.`,
      });
    }
  }
  const idDoc = latestByKind.get("id_redacted");
  findings.push({
    ruleId: "TX_ID_REDACTION_001",
    status: idDoc ? "informational" : "review",
    evidence: idDoc
      ? `${idDoc.fileName} uploaded as redacted ID.`
      : "No redacted ID page uploaded.",
    question: idDoc ? undefined : "Was the buyer ID captured, and is it redacted per policy?",
  });
  for (const f of findings) {
    const hit = containsBannedLanguage(f.evidence + " " + (f.question ?? ""));
    if (hit) throw new Error(`Checker emitted banned phrase: ${hit}`);
  }
  return findings;
}
