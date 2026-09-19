export function isValidVin(vin: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin.trim());
}

// vPIC lookup is a later concern (network). Front-end-first: manual entry with
// a decodeSource flag the UI shows honestly.
export function decodeVinStub(vin: string): { year?: number; make?: string; model?: string; decodeSource: "manual" } {
  return { decodeSource: "manual" };
}
