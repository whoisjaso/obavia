/* Rows of `cols` cells; a sideways photo takes two. When one would not fit the
   space left in a row, the next upright photo is pulled forward instead, so the
   grid never shows a hole. Order otherwise holds. */
export function pack<T>(items: T[], cols: number, isWide: (t: T) => boolean): { p: T; i: number }[] {
  const rest = items.map((p, i) => ({ p, i, w: isWide(p) ? 2 : 1 }));
  const out: { p: T; i: number }[] = [];
  let left = cols;
  while (rest.length) {
    let k = rest.findIndex(it => it.w <= left);
    if (k < 0) { left = cols; k = 0; }
    const [it] = rest.splice(k, 1);
    out.push({ p: it.p, i: it.i }); left -= it.w; if (left === 0) left = cols;
  }
  return out;
}
