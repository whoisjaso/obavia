/* What a lot carries about its car, written by the Desk at Go and read by the
   phone. Everything the glass shows that is not the price or the clock. */
export type RemotePhoto = { url: string; w: number; h: number };

export type CarMeta = {
  year: number; make: string; model: string;
  miles: number;
  vin: string;
  photos: RemotePhoto[];                 // the first is the lane photo; the three mandatory angles are among them
  grade: [number, number, number, number, number, number]; // paint, glass, tires, lights, A/C, drives: 0..1
  title: 'in hand' | 'at lender';
  dealer: { name: string; city: string; street: string; gdn: string; phone: string; afterHours: string; fees: { taxRate: number; title: number; registration: number; doc: number } };
  documents?: { guide?: string; bill?: string; title?: string };   // URLs on the Worker, as the Desk files them
  hours?: string[];                      // pickup windows the dealer offers, e.g. "Sat 10–2"
};

/** The sale after the hammer, as the object keeps it. */
export type SaleState = {
  buyer: string; hammer: number; wonAt: number; deadlineAt: number;
  paidAt?: number; startedAt?: number; forfeitedAt?: number;
};
