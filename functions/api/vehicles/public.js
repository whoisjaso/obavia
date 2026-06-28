import { json, publicVehicle, readVehicles } from "../../_shared/vehicle-store.js";

export async function onRequestGet({ env }) {
  try {
    const vehicles = (await readVehicles(env))
      .filter((vehicle) => vehicle.status !== "hidden")
      .map(publicVehicle);
    return json({ vehicles });
  } catch (error) {
    return json({ error: error.message || "Unable to load vehicles." }, 500);
  }
}
