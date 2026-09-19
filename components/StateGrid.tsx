import type { DealStates } from "@/lib/domain/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const tone: Record<string, "ok" | "warn" | "bad" | ""> = {
  signed: "ok", received: "ok", delivered: "ok", recorded_complete: "ok", accepted: "ok", completed: "ok", closed: "ok",
  correction_required: "warn", exception: "warn", returned: "warn", awaiting_signatures: "warn", pending: "warn", ready: "warn", submitted: "warn",
  disputed: "bad", cancelled: "bad",
};

export function StateGrid({ states, t, dims }: { states: DealStates; t: Dictionary; dims?: (keyof DealStates)[] }) {
  const keys = dims ?? (["documentation", "funding", "delivery", "registration"] as (keyof DealStates)[]);
  return (
    <ul className="ledger">
      {keys.map((k) => {
        const dict = t.states[k] as Record<string, string>;
        const v = states[k] as string;
        return (
          <li key={k} data-dim={k} data-state={v}>
            <span className="k">{dict.label}</span>
            <span className={`v ${tone[v] ?? ""}`}>{dict[v] ?? v}</span>
          </li>
        );
      })}
    </ul>
  );
}
