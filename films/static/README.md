# Static ads

Two layouts, each with variants in its `V` object:

- `ad.html`, conversational: one headline, Obavia speaking once (bold the number), the owner's one-tap reply, one button. Soft white to blue. Variants: leak, price, closer, and the psychology set: babe, we, softyes.
- `offer.html`, offer: a bold blue field, one giant word (auto-fit to the margins), a tilted card of what they get, one button, one honest line. Variants: type, why, friday, and the psychology set: babe-offer, words. Only real offers and true terms; nothing invented.
- `render.cjs`: renders every variant of both templates to `out/` in story (1080×1920) and feed (1080×1350) formats.

```bash
cd films && node static/render.cjs   # needs Playwright
```
