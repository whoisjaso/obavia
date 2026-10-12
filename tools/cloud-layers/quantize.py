# Fallback for render.mjs when pngquant is absent: 256-colour RGBA palette, dithered.
import sys
from PIL import Image
for p in sys.argv[1:]:
    im = Image.open(p)
    if p.endswith('grain.png'):              # grain is neutral grey: one channel
        im.convert('L').save(p, optimize=True); continue
    im = im.convert('RGBA')
    q = im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG)
    q.save(p, optimize=True)
