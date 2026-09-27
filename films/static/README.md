# Static ads

One headline, Obavia speaking once, the owner saying yes, one button. Soft white to blue.

- `ad.html`: the template. Variants live in the `V` object: headline, Obavia's line (bold the number), the reply.
- `render.cjs`: renders every variant to `out/` in story (1080×1920) and feed (1080×1350) formats.

```bash
cd films && node static/render.cjs   # needs Playwright
```
