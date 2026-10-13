"""Build assets/mark-3d from the raw 16-bit renders.

Reads the 16-bit RGBA PNGs through bpy (Pillow truncates 16-bit RGBA to 8 bits), composites in
float, resizes with Lanczos on premultiplied float, and writes 8-bit PNGs with a seeded TPDF
dither of one code value so the sky and the glass gradients do not band.
Run with the bpy venv python: post.py --raw tools/mark-3d/raw --out assets/mark-3d --marks a b
"""
import argparse, json, os
import numpy as np
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument('--raw', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--marks', nargs='+', default=['a', 'b'])
ap.add_argument('--fit', type=float, default=0.74, help='mark diameter / frame in the day and ink renders')
args = ap.parse_args()
RNG_SEED = 20261013

SKY_FAR, SKY_NEAR, INK = (0xDC, 0xE6, 0xFA), (0xF2, 0xF6, 0xFF), (0x1C, 0x24, 0x36)


def load16(path):
    import bpy
    img = bpy.data.images.load(path, check_existing=False)
    img.colorspace_settings.name = 'Non-Color'
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return px.reshape(h, w, 4)[::-1].astype(np.float64)  # straight alpha, sRGB-encoded values


def day_shadow(img, strength=0.55, edge=0.12):
    """The shadow catcher writes black at some alpha. The house shade is ink, soft and light
    (cloud-system section 5: cloud-shade is ink at about 10 percent), so shadow-only pixels are
    re-tinted to ink and lightened; the mark's own pixels are bright and untouched. Alpha then
    fades to zero over the outer edge of the frame so the PNG never ends in a hard square."""
    out = img.copy()
    s = 1 - np.clip(img[..., :3].max(-1) / 0.15, 0, 1)
    out[..., 3] = img[..., 3] * (1 - (1 - strength) * s)
    out[..., :3] = img[..., :3] * (1 - s[..., None]) + (np.array(INK) / 255) * s[..., None]
    h, w = img.shape[:2]
    def ramp(n):
        t = (np.arange(n) + 0.5) / n
        d = np.minimum(t, 1 - t) / edge
        d = np.clip(d, 0, 1)
        return d * d * (3 - 2 * d)
    out[..., 3] *= ramp(h)[:, None] * ramp(w)[None, :]
    return out


def sky(h, w):
    """The house sky: linear-gradient(180deg, #DCE6FA 0%, #F2F6FF 60%), as the browser draws it."""
    t = np.clip((np.arange(h) + 0.5) / h / 0.6, 0, 1)[:, None, None]
    c = (np.array(SKY_FAR) * (1 - t) + np.array(SKY_NEAR) * t) / 255
    return np.broadcast_to(c, (h, w, 3)).copy()


def flat(h, w, rgb):
    return np.broadcast_to(np.array(rgb) / 255, (h, w, 3)).copy()


def over(rgba, bg):
    a = rgba[..., 3:4]
    return rgba[..., :3] * a + bg * (1 - a)


def resize(img, size):
    """Lanczos on premultiplied float, then back to straight alpha."""
    h, w, c = img.shape
    if c == 4:
        pre = np.concatenate([img[..., :3] * img[..., 3:4], img[..., 3:4]], -1)
    else:
        pre = img
    chans = [np.asarray(Image.fromarray(pre[..., i].astype(np.float32), 'F').resize((size, size), Image.LANCZOS))
             for i in range(c)]
    out = np.clip(np.stack(chans, -1).astype(np.float64), 0, 1)
    if c == 4:
        a = out[..., 3:4]
        out[..., :3] = np.where(a > 1e-6, out[..., :3] / np.maximum(a, 1e-6), 0)
        out = np.clip(out, 0, 1)
    return out


_rng = np.random.default_rng(RNG_SEED)


def to8(img):
    """TPDF dither, one code value, seeded: deterministic and band-free."""
    n = _rng.random(img.shape) - _rng.random(img.shape)
    return np.clip(np.floor(img * 255 + 0.5 + n), 0, 255).astype(np.uint8)


def save(img, path):
    Image.fromarray(to8(img), 'RGBA' if img.shape[2] == 4 else 'RGB').save(path, optimize=True)


def pil(img):
    return Image.fromarray(to8(img), 'RGBA' if img.shape[2] == 4 else 'RGB')


def build(m):
    raw, out = os.path.join(args.raw, m), os.path.join(args.out, m)
    os.makedirs(os.path.join(out, 'turn'), exist_ok=True)
    made = {}
    if os.path.exists(os.path.join(raw, 'hero.png')):
        hero = day_shadow(load16(os.path.join(raw, 'hero.png')))
        H = hero.shape[0]
        save(hero, f'{out}/mark-hero.png')
        h1 = resize(hero, H // 2)
        pil(h1).save(f'{out}/mark-hero@1x.webp', quality=92, method=6, alpha_quality=100)
        save(np.concatenate([over(hero, sky(H, H)), np.ones((H, H, 1))], -1)[..., :3], f'{out}/mark-on-sky.png')
        save(h1, f'{out}/splash-icon.png')
        # app icon: opaque house sky, the mark at 62 percent of the canvas, no rounding (iOS masks it)
        S = 1024
        scale = 0.62 * S / (args.fit * H)
        side = int(round(H * scale))
        small = resize(hero, side)
        canvas = sky(S, S)
        o = (S - side) // 2
        canvas[o:o + side, o:o + side] = over(small, canvas[o:o + side, o:o + side])
        save(canvas, f'{out}/icon-1024.png')
        for s in (512, 192):
            save(resize(canvas, s), f'{out}/icon-{s}.png')
        made['hero'] = hero
    if os.path.exists(os.path.join(raw, 'ink.png')):
        ink = load16(os.path.join(raw, 'ink.png'))
        H = ink.shape[0]
        save(over(ink, flat(H, H, INK)), f'{out}/mark-on-ink.png')
    if os.path.exists(os.path.join(raw, 'small.png')):
        sm = load16(os.path.join(raw, 'small.png'))
        for s in (32, 16):
            save(resize(sm, s), f'{out}/favicon-{s}.png')
    tdir = os.path.join(raw, 'turn')
    frames = []
    if os.path.isdir(tdir) and len([f for f in os.listdir(tdir) if f.endswith('.png')]) >= 60:
        for i in range(60):
            fr = day_shadow(load16(os.path.join(tdir, f'{i:03d}.png')))
            save(fr, f'{out}/turn/{i:03d}.png')
            frames.append(fr)
        T = frames[0].shape[0]
        cols, rows = 10, 6
        sheet = np.zeros((rows * T, cols * T, 4))
        for i, fr in enumerate(frames):
            r, c = divmod(i, cols)
            sheet[r * T:(r + 1) * T, c * T:(c + 1) * T] = fr
        save(sheet, f'{out}/turn-sheet.png')
        json.dump({'image': 'turn-sheet.png', 'frames': 60, 'fps': 30, 'duration_ms': 2000,
                   'cell': [T, T], 'columns': cols, 'rows': rows, 'order': 'row-major',
                   'loop': True, 'reduced_motion_frame': 0,
                   'motion': 'turns 12 degrees about the vertical axis and back on sine in-out; one light sweep, left to right, zero at both ends'},
                  open(f'{out}/turn-sheet.json', 'w'), indent=2)
        ims = [pil(fr) for fr in frames]
        ims[0].save(f'{out}/turn.webp', save_all=True, append_images=ims[1:], duration=33, loop=0,
                    quality=86, method=4, alpha_quality=90, minimize_size=False)
        made['frames'] = frames
    return made


def contact(m, made):
    """Hero on sky and on ink, the icon at 1024, 192, 32 and 16 at 1:1, six turn frames."""
    out = os.path.join(args.out, m)
    W, pad = 2160, 40
    bg = (0xF2, 0xF6, 0xFF)
    sheet = Image.new('RGB', (W, 2600), bg)
    y = pad
    for name in ('mark-on-sky.png', 'mark-on-ink.png'):
        p = os.path.join(out, name)
        if os.path.exists(p):
            im = Image.open(p).resize((1020, 1020), Image.LANCZOS)
            sheet.paste(im, (pad if name.endswith('sky.png') else pad + 1060, y))
    y += 1020 + pad
    x = pad
    for name in ('icon-1024.png', 'icon-192.png', 'favicon-32.png', 'favicon-16.png'):
        p = os.path.join(out, name)
        if os.path.exists(p):
            im = Image.open(p)
            if im.mode == 'RGBA':
                sheet.paste(im, (x, y), im)
            else:
                sheet.paste(im, (x, y))
            x += im.size[0] + pad
    # favicons again on ink at 1:1, they live in dark tab bars too
    ink_tile = Image.new('RGB', (120, 60), INK)
    for i, name in enumerate(('favicon-32.png', 'favicon-16.png')):
        p = os.path.join(out, name)
        if os.path.exists(p):
            im = Image.open(p); ink_tile.paste(im, (10 + i * 50, 14), im)
    sheet.paste(ink_tile, (x, y))
    y += 1024 + pad
    tdir = os.path.join(out, 'turn')
    xs = pad
    for i in (0, 10, 20, 30, 40, 50):
        p = os.path.join(tdir, f'{i:03d}.png')
        if os.path.exists(p):
            im = Image.open(p).resize((320, 320), Image.LANCZOS)
            tile = Image.fromarray((sky(320, 320) * 255 + 0.5).astype(np.uint8))
            tile.paste(im, (0, 0), im)
            sheet.paste(tile, (xs, y))
        xs += 320 + 24
    y += 320 + pad
    sheet = sheet.crop((0, 0, W, y))
    sheet.save(os.path.join(out, 'contact.png'), optimize=True)
    return sheet


sheets = []
for m in args.marks:
    made = build(m)
    sheets.append(contact(m, made))
if len(sheets) == 2:
    w = max(s.size[0] for s in sheets)
    both = Image.new('RGB', (w, sum(s.size[1] for s in sheets) + 8), (0x1C, 0x24, 0x36))
    both.paste(sheets[0], (0, 0)); both.paste(sheets[1], (0, sheets[0].size[1] + 8))
    both.save(os.path.join(args.out, 'contact.png'), optimize=True)
total = 0
for dp, dn, fn in os.walk(args.out):
    for f in fn:
        total += os.path.getsize(os.path.join(dp, f))
print(f'POST done, {total} bytes in {args.out}')
