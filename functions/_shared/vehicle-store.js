const VEHICLES_KEY = "vehicles:v1";
const AUDIT_INDEX_KEY = "audit:index:v1";
const PHOTO_PREFIX = "vehicle-photo:";
const MAX_PHOTO_DATA_URL_BYTES = 9 * 1024 * 1024;
const PUBLIC_STATUSES = new Set(["available", "reserved", "rented", "service"]);
const STATUS_MAP = new Set(["available", "reserved", "rented", "service", "hidden"]);
const TIERS = new Set(["Standard", "Reserve", "Noir"]);

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers
    }
  });
}

export function requireStore(env) {
  if (!env || !env.OBAVIA_KV) {
    throw new Error("OBAVIA_KV binding is not configured.");
  }
  return env.OBAVIA_KV;
}

export async function readVehicles(env) {
  const kv = requireStore(env);
  const raw = await kv.get(VEHICLES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeVehicles(env, vehicles) {
  const kv = requireStore(env);
  await kv.put(VEHICLES_KEY, JSON.stringify(vehicles));
}

export async function readAudit(env) {
  const kv = requireStore(env);
  let index = [];
  try {
    index = JSON.parse((await kv.get(AUDIT_INDEX_KEY)) || "[]");
  } catch {
    index = [];
  }
  const keys = Array.isArray(index) ? index.slice(0, 200) : [];
  const events = await Promise.all(keys.map(async (key) => {
    try {
      return JSON.parse(await kv.get(key));
    } catch {
      return null;
    }
  }));
  return events.filter(Boolean);
}

export async function appendAudit(env, event) {
  const kv = requireStore(env);
  const key = `audit:${Date.now()}:${crypto.randomUUID().slice(0, 8)}`;
  const record = {
    id: key,
    at: new Date().toISOString(),
    ...event
  };
  await kv.put(key, JSON.stringify(record));

  let index = [];
  try {
    index = JSON.parse((await kv.get(AUDIT_INDEX_KEY)) || "[]");
  } catch {
    index = [];
  }
  index = Array.isArray(index) ? index : [];
  index.unshift(key);
  await kv.put(AUDIT_INDEX_KEY, JSON.stringify(index.slice(0, 200)));
  return record;
}

export function clean(value, max = 160) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function numberValue(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
}

export function sanitizeVehicle(input, existing = {}) {
  const now = new Date().toISOString();
  const id = clean(input.id || existing.id, 80).replace(/[^a-zA-Z0-9_-]/g, "-") || `veh-${Date.now()}`;
  const tier = TIERS.has(clean(input.tier, 24)) ? clean(input.tier, 24) : "Standard";
  const status = STATUS_MAP.has(clean(input.status, 24)) ? clean(input.status, 24) : "hidden";
  const make = clean(input.make ?? existing.make, 50);
  const model = clean(input.model ?? existing.model, 60);
  const year = numberValue(input.year ?? existing.year, 0);

  return {
    id,
    unit: clean(input.unit ?? existing.unit, 40),
    year,
    make,
    model,
    color: clean(input.color ?? existing.color, 50),
    tier,
    rate: numberValue(input.rate ?? existing.rate, 0),
    status,
    description: clean(input.description ?? existing.description, 800),
    mileagePolicy: clean(input.mileagePolicy ?? existing.mileagePolicy ?? "Unlimited within Texas", 120),
    term: clean(input.term ?? existing.term ?? "Weekly, open-ended", 120),
    photoKey: clean(input.photoKey ?? existing.photoKey, 180),
    photoUpdatedAt: clean(input.photoUpdatedAt ?? existing.photoUpdatedAt, 40),
    createdAt: existing.createdAt || now,
    updatedAt: now
  };
}

export function publicVehicle(vehicle) {
  const name = vehicle.year ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`.trim() : `${vehicle.make} ${vehicle.model}`.trim();
  const status = PUBLIC_STATUSES.has(vehicle.status) ? vehicle.status : "hidden";
  let avail = status;
  if (status === "reserved") avail = "rented";

  return {
    id: vehicle.id,
    unit: vehicle.unit,
    name: name || vehicle.unit || "OBAVIA vehicle",
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    color: vehicle.color,
    tier: vehicle.tier,
    rate: vehicle.rate,
    avail,
    status,
    description: vehicle.description,
    mileagePolicy: vehicle.mileagePolicy,
    term: vehicle.term,
    photoUrl: vehicle.photoKey ? `/api/vehicle-image/${encodeURIComponent(vehicle.photoKey)}` : "",
    hasPhoto: Boolean(vehicle.photoKey)
  };
}

export function diffVehicles(before, after, photoChanged = false) {
  const fields = [
    ["unit", "Unit"],
    ["year", "Year"],
    ["make", "Make"],
    ["model", "Model"],
    ["color", "Color"],
    ["tier", "Class"],
    ["rate", "Weekly rate"],
    ["status", "Status"],
    ["description", "Description"],
    ["mileagePolicy", "Mileage policy"],
    ["term", "Term"]
  ];
  const changes = [];
  for (const [key, label] of fields) {
    const oldVal = before ? before[key] : "";
    const newVal = after[key];
    if (String(oldVal ?? "") !== String(newVal ?? "")) {
      changes.push({ field: key, label, before: oldVal ?? "", after: newVal ?? "" });
    }
  }
  if (photoChanged) {
    changes.push({ field: "photo", label: "Vehicle photo", before: before?.photoKey ? "Previous image" : "", after: "Updated image" });
  }
  return changes;
}

export function actorFromRequest(request, body = {}, env = {}) {
  const headers = request.headers;
  const accessEmail = clean(headers.get("cf-access-authenticated-user-email") || headers.get("x-authenticated-user-email"), 160).toLowerCase();
  const supplied = body.actor || {};
  const email = clean(accessEmail || supplied.email || headers.get("x-obavia-actor-email"), 160).toLowerCase();
  const ownerEmails = String(env.OBAVIA_OWNER_EMAILS || "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  const verifiedOwner = Boolean(email && ownerEmails.includes(email));
  let role = clean(supplied.role || headers.get("x-obavia-actor-role") || "team", 24).toLowerCase();
  if (verifiedOwner) role = "owner";
  else if (role === "owner") role = "admin";
  if (!["owner", "admin", "team"].includes(role)) role = "team";

  return {
    name: clean(supplied.name || headers.get("x-obavia-actor-name") || email || "Unknown operator", 120),
    email,
    role,
    verifiedOwner,
    source: accessEmail ? "cloudflare-access" : "operator-entry"
  };
}

export function requiresConfirm(actor) {
  return !actor.verifiedOwner;
}

export function validateConfirm(actor, confirmText) {
  if (!requiresConfirm(actor)) return null;
  return clean(confirmText, 24) === "CONFIRM" ? null : "Team changes require spelling CONFIRM before saving.";
}

export function validatePhotoDataUrl(dataUrl) {
  if (!dataUrl) return null;
  if (typeof dataUrl !== "string" || dataUrl.length > MAX_PHOTO_DATA_URL_BYTES) {
    return "Photo is too large. Use an image under about 6 MB.";
  }
  if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(dataUrl)) {
    return "Photo must be a PNG, JPG, or WebP image.";
  }
  return null;
}

export async function savePhoto(env, vehicleId, dataUrl) {
  const kv = requireStore(env);
  const error = validatePhotoDataUrl(dataUrl);
  if (error) throw new Error(error);
  const key = `${vehicleId}-primary-${Date.now()}`;
  await kv.put(`${PHOTO_PREFIX}${key}`, dataUrl);
  return key;
}

export async function readPhoto(env, key) {
  const kv = requireStore(env);
  return kv.get(`${PHOTO_PREFIX}${clean(key, 180)}`);
}
