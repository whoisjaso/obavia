import {
  actorFromRequest,
  appendAudit,
  diffVehicles,
  json,
  publicVehicle,
  readVehicles,
  requiresConfirm,
  sanitizeVehicle,
  savePhoto,
  validateConfirm,
  validatePhotoDataUrl,
  writeVehicles
} from "../../_shared/vehicle-store.js";

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function onRequestGet({ request, env }) {
  try {
    const actor = actorFromRequest(request, {}, env);
    const vehicles = await readVehicles(env);
    return json({ actor, vehicles, publicVehicles: vehicles.filter((v) => v.status !== "hidden").map(publicVehicle) });
  } catch (error) {
    return json({ error: error.message || "Unable to load vehicles." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await readBody(request);
    const actor = actorFromRequest(request, body, env);
    const confirmError = validateConfirm(actor, body.confirmText);
    if (confirmError) return json({ error: confirmError, requiresConfirm: true }, 403);

    const photoError = validatePhotoDataUrl(body.photoDataUrl);
    if (photoError) return json({ error: photoError }, 400);

    const vehicles = await readVehicles(env);
    const idx = vehicles.findIndex((vehicle) => vehicle.id === body.vehicle?.id);
    const existing = idx >= 0 ? vehicles[idx] : {};
    let next = sanitizeVehicle(body.vehicle || {}, existing);

    let photoChanged = false;
    if (body.photoDataUrl) {
      next.photoKey = await savePhoto(env, next.id, body.photoDataUrl);
      next.photoUpdatedAt = new Date().toISOString();
      photoChanged = true;
    }

    const changes = diffVehicles(idx >= 0 ? existing : null, next, photoChanged);
    if (!changes.length) {
      return json({ ok: true, changed: false, vehicle: next, actor, requiresConfirm: requiresConfirm(actor) });
    }

    if (idx >= 0) vehicles[idx] = next;
    else vehicles.unshift(next);
    await writeVehicles(env, vehicles);

    const audit = await appendAudit(env, {
      action: idx >= 0 ? "vehicle.updated" : "vehicle.created",
      actor,
      requiresConfirm: requiresConfirm(actor),
      confirmedByText: requiresConfirm(actor),
      vehicleId: next.id,
      vehicleName: publicVehicle(next).name,
      changes
    });

    return json({ ok: true, changed: true, vehicle: next, audit, actor, requiresConfirm: requiresConfirm(actor) });
  } catch (error) {
    return json({ error: error.message || "Unable to save vehicle." }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    const body = await readBody(request);
    const actor = actorFromRequest(request, body, env);
    const confirmError = validateConfirm(actor, body.confirmText);
    if (confirmError) return json({ error: confirmError, requiresConfirm: true }, 403);

    const id = String(body.id || "").trim();
    const vehicles = await readVehicles(env);
    const idx = vehicles.findIndex((vehicle) => vehicle.id === id);
    if (idx < 0) return json({ error: "Vehicle was not found." }, 404);

    const existing = vehicles[idx];
    const next = sanitizeVehicle({ ...existing, status: "hidden" }, existing);
    vehicles[idx] = next;
    await writeVehicles(env, vehicles);

    const audit = await appendAudit(env, {
      action: "vehicle.hidden",
      actor,
      requiresConfirm: requiresConfirm(actor),
      confirmedByText: requiresConfirm(actor),
      vehicleId: next.id,
      vehicleName: publicVehicle(next).name,
      changes: [{ field: "status", label: "Status", before: existing.status, after: "hidden" }]
    });

    return json({ ok: true, vehicle: next, audit, actor });
  } catch (error) {
    return json({ error: error.message || "Unable to hide vehicle." }, 500);
  }
}
