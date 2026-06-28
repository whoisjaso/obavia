import { actorFromRequest, json, readAudit } from "../../_shared/vehicle-store.js";

export async function onRequestGet({ request, env }) {
  try {
    const actor = actorFromRequest(request, {}, env);
    const audit = await readAudit(env);
    return json({ actor, audit });
  } catch (error) {
    return json({ error: error.message || "Unable to load audit log." }, 500);
  }
}
