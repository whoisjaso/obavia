/** Cars are stored with a swatch colour; paperwork names it the way a title does. */
const PAINT: [string, number[]][] = [['Black', [28, 30, 34]], ['White', [238, 240, 244]], ['Silver', [192, 197, 206]], ['Gray', [128, 134, 144]], ['Blue', [52, 78, 140]], ['Red', [168, 58, 58]], ['Green', [52, 110, 70]], ['Beige', [214, 198, 166]], ['Brown', [110, 76, 50]], ['Gold', [196, 160, 80]], ['Orange', [214, 110, 40]], ['Yellow', [230, 200, 60]]];
export function colourName(c: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(c?.trim() ?? '');
  if (!m) return c;
  const rgb = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
  return PAINT.reduce((best, p) => { const d = p[1].reduce((t, v, i) => t + (v - rgb[i]) ** 2, 0); return d < best[1] ? [p[0], d] as [string, number] : best; }, ['', Infinity] as [string, number])[0];
}

