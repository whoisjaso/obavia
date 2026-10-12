/* One theme. Icy blues and cloud atmosphere, the Obavia mark's own gradient.
   Nothing inline elsewhere. */
export const theme = {
  color: {
    sky: '#F2F6FF',          // page
    cloud: '#FFFFFF',
    well: '#EEF1F8',         // paper body lines, chips at rest
    ice: '#B8C8F1',          // the ring at rest (from the mark)
    iceDeep: '#869FD6',
    ink: '#1C2436',
    inkSoft: '#3F4759',
    muted: '#6B7385',
    faint: '#9AA1B0',
    line: 'rgba(28,36,54,0.09)',
    accent: '#4E6AA8',       // buttons
    blue: '#0A84FF',         // the last two minutes: one colour, only here
    good: '#2E8A60',
    warn: '#A8611F',
    scrim: 'rgba(8,14,30,0.60)',
  },
  font: {
    price: 'InstrumentSerif-Italic',
    sans: 'Manrope-600',
    sansBold: 'Manrope-700',
  },
  size: {
    price: 64,       // the hammer; the total is half (2:1)
    priceMax: 72,    // large-text clamp
    ringStroke: 4,
  },
  spring: {
    sheet: { damping: 18, stiffness: 220, mass: 0.9 },   // Bid sheet rise ≈ 320 ms
    punch: { damping: 12, stiffness: 420 },               // price punch, settles ≈ 180 ms
    lift: { damping: 20, stiffness: 300 },
  },
  ms: {
    punch: 90, settle: 180, overlay: 1200, hold: 600, ringTeach: 1200,
  },
} as const;
