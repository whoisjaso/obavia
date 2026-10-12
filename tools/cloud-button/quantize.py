# Bring a sprite under the size limit without banding: keep RGBA truecolour and drop low bits, finest first.
# The baked grain (about 2.4 percent) dithers the coarser steps, so 6-bit and 5-bit channels show no bands.
# Usage: python3 quantize.py file.png [limit_bytes]
import sys, io
import numpy as np
from PIL import Image
p = sys.argv[1]; limit = int(sys.argv[2]) if len(sys.argv) > 2 else 180 * 1024
src = np.asarray(Image.open(p).convert('RGBA')).astype(np.int16)
best = None
for rgb_bits, a_bits in ((7, 7), (6, 7), (6, 6), (5, 6), (5, 5), (4, 5)):
    a = src.copy()
    for ch, bits in ((0, rgb_bits), (1, rgb_bits), (2, rgb_bits), (3, a_bits)):
        step = 1 << (8 - bits)
        a[..., ch] = np.clip(np.round(a[..., ch] / step) * step, 0, 255)
    a[a[..., 3] == 0, :3] = 0                      # invisible pixels carry no colour: they compress to nothing
    buf = io.BytesIO(); Image.fromarray(a.astype(np.uint8), 'RGBA').save(buf, 'PNG', optimize=True)
    best = (buf.getvalue(), rgb_bits, a_bits)
    if len(best[0]) <= limit: break
open(p, 'wb').write(best[0])
print(f'  quantized {p.split("/")[-1]}: rgb {best[1]} bit, alpha {best[2]} bit, {len(best[0]) // 1024} KB')
