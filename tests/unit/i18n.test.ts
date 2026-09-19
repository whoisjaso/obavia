import { describe, expect, it } from "vitest";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { containsBannedLanguage } from "@/lib/domain/check";

function flatten(o: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof o === "string") return { [prefix]: o };
  for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
    Object.assign(out, flatten(v, prefix ? `${prefix}.${k}` : k));
  }
  return out;
}

describe("EN/ES parity and claims lint (AC-10, AC-12)", () => {
  const en = flatten(dictionaries.en);
  const es = flatten(dictionaries.es);
  it("every key exists in both languages", () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  });
  it("no empty strings", () => {
    for (const [k, v] of [...Object.entries(en), ...Object.entries(es)]) expect(v.trim(), k).not.toBe("");
  });
  it("no banned bare labels in any UI string", () => {
    for (const [k, v] of [...Object.entries(en), ...Object.entries(es)]) {
      expect(containsBannedLanguage(v), `${k}: ${v}`).toBeNull();
    }
  });
});
