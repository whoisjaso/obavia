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
  /* Bodoni Moda, cut at optical size 72, for every number and word that owns a
     page: the Didone of the fashion houses. The platform's own face (SF on
     iPhone, Roboto on Android) for everything small: labels, choices, the one
     verb, like Wallet and Apple Pay. Nothing trendy. */
  font: {
    price: 'Bodoni-Display',          // upright numbers
    priceItalic: 'Bodoni-DisplayItalic',   // a word that owns a page
    text: 'Bodoni-Text',              // Bodoni at reading size, rarely
    sans: 'System',
    sansBold: 'System',
  },
  type: {
    sans: { fontFamily: 'System', fontWeight: '500' as const },
    sansBold: { fontFamily: 'System', fontWeight: '600' as const },
  },
  size: {
    price: 64,       // the hammer; the total is half (2:1)
    priceMax: 72,    // large-text clamp
    ringStroke: 4,
    display: 44,     // a word or a number that owns a page
    title: 28,
    body: 16,
    label: 11,       // small, spaced, uppercase, faint
  },
  space: { xs: 8, s: 16, m: 24, l: 40, xl: 64 },   // room is the luxury
  // springs and curves live in ../motion (animate-expo's tables)
  ms: {
    overlay: 1200, hold: 600, ringTeach: 1200,
  },
} as const;
