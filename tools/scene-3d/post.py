"""Stage 3 (python3, numpy, Pillow, libimagequant): publish assets/scene-3d.

  python3 post.py WORK OUT [names...]        default: every object
  python3 post.py WORK OUT --contact          the contact sheet and the placements only

For each object: grade the still (frame 23) into light and dark, size it to
@2x (the master) and @1x, and write a 256-colour palette PNG (libimagequant,
dithered) and a WebP (lossy with alpha, quality 82, method 6) of each, straight
alpha. For the four moments: the 24 frames at @2x (512 master) and @1x, as
WebP frames for the web and a 3 x 8 sprite sheet with a 4 px gap and a JSON of
rects for the phone (the cloud sheet contract: fps 60, 400 ms, rects exclude
the gap, the still is index 23).
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
import grade  # noqa: E402

try:  # libimagequant (pip install imagequant; IMAGEQUANT_PATH adds a --target dir)
    if os.environ.get("IMAGEQUANT_PATH"):
        sys.path.insert(0, os.environ["IMAGEQUANT_PATH"])
    import imagequant
except ImportError:
    imagequant = None

NAMES = ["car", "key", "title", "plate", "pass", "clock", "hammer", "coin", "bleed", "licence", "insurance"]
MOMENTS = {"clock": "the arc sweeps from twelve to its mark (expo out)",
           "hammer": "the gavel falls (0 to 6), the cloud takes it (6 to 9), the puff opens and freezes (9 to 23)",
           "coin": "the deposit comes back toward the viewer, spinning down, with motion blur",
           "bleed": "the drop gathers under the arc and hangs"}
SKY_FAR, SKY_NEAR, INK = (0xDC, 0xE6, 0xFA), (0xF2, 0xF6, 0xFF), (0x1C, 0x24, 0x36)
FEATHER = 0.04


def premul_resize(rgba, w, h):
    a = rgba[..., 3:4].astype(np.float32) / 255.0
    pm = np.concatenate([rgba[..., :3].astype(np.float32) * a, a * 255.0], -1)
    chans = [np.asarray(Image.fromarray(pm[..., i].astype(np.float32), "F").resize((w, h), Image.LANCZOS))
             for i in range(4)]
    out = np.stack(chans, -1)
    al = np.clip(out[..., 3:4], 0, 255)
    rgb = np.where(al > 0.5, out[..., :3] / np.maximum(al / 255.0, 1e-6), 0)
    return np.clip(np.concatenate([rgb, al], -1) + 0.5, 0, 255).astype(np.uint8)


def feather(rgba, frac=FEATHER):
    """Alpha falls to zero over the outer band, so a long shade never ends in a
    hard edge at the canvas wall."""
    h, w = rgba.shape[:2]

    def ramp(n):
        t = (np.arange(n) + 0.5) / n
        d = np.clip(np.minimum(t, 1 - t) / frac, 0, 1)
        return d * d * (3 - 2 * d)
    out = rgba.copy()
    out[..., 3] = (out[..., 3].astype(np.float32) * ramp(h)[:, None] * ramp(w)[None, :] + 0.5).astype(np.uint8)
    return out


def save_png(arr, path):
    im = Image.fromarray(arr, "RGBA")
    if imagequant is not None:
        im = imagequant.quantize_pil_image(im, dithering_level=1.0, max_colors=256)
    im.save(path, optimize=True)


def save_webp(arr, path, quality=82):
    Image.fromarray(arr, "RGBA").save(path, "WEBP", quality=quality, method=6, alpha_quality=90, exact=False)


def save_both(arr, png):
    save_png(arr, png)
    save_webp(arr, png[:-4] + ".webp")


def graded(work, name, frame, variant):
    p = grade.load(os.path.join(work, "final", name, f"{frame:02d}.npz"))
    return feather(grade.grade(p, variant))


def publish_still(work, out, name):
    for v in ("light", "dark"):
        d = os.path.join(out, name, v)
        os.makedirs(d, exist_ok=True)
        m = graded(work, name, 23, v)
        h, w = m.shape[:2]
        save_both(m, os.path.join(d, "still@2x.png"))
        save_both(premul_resize(m, w // 2, h // 2), os.path.join(d, "still.png"))
    print("still", name, flush=True)


def publish_moment(work, out, name):
    for v in ("light", "dark"):
        d = os.path.join(out, name, v)
        os.makedirs(os.path.join(d, "frames"), exist_ok=True)
        frames = [graded(work + "/seq", name, f, v) if os.path.exists(os.path.join(work, "seq", "final", name, f"{f:02d}.npz"))
                  else None for f in range(24)]
        if any(f is None for f in frames):
            print("moment", name, "missing frames", [i for i, f in enumerate(frames) if f is None])
            continue
        h, w = frames[0].shape[:2]
        for s in (1, 2):
            sw, sh = (w, h) if s == 2 else (w // 2, h // 2)
            sized = [f if s == 2 else premul_resize(f, sw, sh) for f in frames]
            sfx = "" if s == 1 else "@2x"
            for i, f in enumerate(sized):
                save_webp(f, os.path.join(d, "frames", f"{i:03d}{sfx}.webp"))
            cols, gap = 3, 4
            rows = 8
            sheet = np.zeros((rows * sh + (rows - 1) * gap, cols * sw + (cols - 1) * gap, 4), np.uint8)
            rects = []
            for i, f in enumerate(sized):
                cx, cy = (i % cols) * (sw + gap), (i // cols) * (sh + gap)
                sheet[cy:cy + sh, cx:cx + sw] = f
                rects.append(dict(i=i, x=cx, y=cy, w=sw, h=sh))
            save_png(sheet, os.path.join(d, f"sheet{sfx}.png"))  # phone only: no webp
            json.dump(dict(image=f"sheet{sfx}.png", fps=60, duration_ms=400, gap=gap, frames=rects, rest=23,
                           scale=s, css=dict(w=w // 2, h=h // 2), moment=MOMENTS[name],
                           note="play 0 to 23 once at 60 fps and hold 23; 23 is the still"),
                      open(os.path.join(d, f"sheet{sfx}.json"), "w"), indent=1)
    print("moment", name, flush=True)


# ------------------------------------------------------------------ contact sheet and placements

def page(w, h, variant):
    if variant == "dark":
        return Image.new("RGBA", (w, h), INK + (255,))
    t = np.clip((np.arange(h) + 0.5) / h / 0.6, 0, 1)[:, None, None]
    c = np.array(SKY_FAR) * (1 - t) + np.array(SKY_NEAR) * t
    return Image.fromarray(np.broadcast_to(c, (h, w, 3)).astype(np.uint8), "RGB").convert("RGBA")


def still(out, name, variant, scale="@2x"):
    return Image.open(os.path.join(out, name, variant, f"still{scale}.png")).convert("RGBA")


def fit_into(im, box):
    im = im.copy()
    im.thumbnail(box, Image.LANCZOS)
    return im


def scan_frame(kind, h):
    """The Scan screen's frame (auction/src/screens/won/Scan.tsx, `Frame`),
    redrawn from its own SVG numbers on the ink viewfinder, for the side by side
    only: the rect (rx 14, cloud stroke at 70 percent), the licence's photo
    well, the read lines at 28 percent white."""
    s = 4                                           # supersample, then reduce
    x0, y0, x1, y1 = 14, 116, 306, 310              # the part of the 320 x 420 viewBox the card uses
    k = h / (y1 - y0)
    W, H = int((x1 - x0) * k), h
    im = Image.new("RGBA", (W * s, H * s), INK + (255,))
    lay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    dr = ImageDraw.Draw(lay)
    P = lambda x, y: ((x - x0) * k * s, (y - y0) * k * s)
    ch = 164 if kind == "licence" else 150
    dr.rounded_rectangle([P(30, 130), P(290, 130 + ch)], radius=14 * k * s, fill=(255, 255, 255, 10),
                         outline=(255, 255, 255, 178), width=max(1, int(1.5 * k * s)))
    if kind == "licence":
        dr.rounded_rectangle([P(50, 160), P(114, 240)], radius=8 * k * s, fill=(255, 255, 255, 36))
        lines = [(130, 170, 250), (130, 192, 220), (130, 214, 240), (130, 236, 200)]
    else:
        lines = [(50, 160, 200), (50, 190, 270), (50, 215, 230), (50, 250, 170)]
    for xa, y, xb in lines:
        dr.line([P(xa, y), P(xb, y)], fill=(255, 255, 255, 71), width=int(5 * k * s))
        r = 2.5 * k * s
        for x in (xa, xb):
            cx, cy = P(x, y)
            dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, 71))
    im.alpha_composite(lay)
    return im.resize((W, H), Image.LANCZOS)


def contact(out):
    T, pad = 220, 16
    names = [n for n in NAMES if os.path.exists(os.path.join(out, n, "light", "still.png"))]
    W = pad + len(names) * (T + pad)
    strip_names = [n for n in MOMENTS if os.path.exists(os.path.join(out, n, "light", "frames", "023.webp"))]
    cards = [n for n in ("licence", "insurance") if os.path.exists(os.path.join(out, n, "light", "still.png"))]
    H = pad + 2 * (T + pad) + 2 * (48 + pad) + len(strip_names) * (110 + pad) + (T + pad if cards else 0)
    sheet = Image.new("RGBA", (W, H), (236, 241, 250, 255))
    y = pad
    for v in ("light", "dark"):
        for i, n in enumerate(names):
            x = pad + i * (T + pad)
            tile = page(T, T, v)
            im = fit_into(still(out, n, v), (T, T))
            tile.alpha_composite(im, ((T - im.size[0]) // 2, (T - im.size[1]) // 2))
            sheet.alpha_composite(tile, (x, y))
        y += T + pad
    # the 48 px test: each still as it lands on a phone at 48 pt (from @2x, 96 px, shown at 48)
    for v in ("light", "dark"):
        for i, n in enumerate(names):
            x = pad + i * (T + pad) + (T - 48) // 2
            tile = page(48, 48, v)
            im = fit_into(still(out, n, v), (48, 48))
            tile.alpha_composite(im, ((48 - im.size[0]) // 2, (48 - im.size[1]) // 2))
            sheet.alpha_composite(tile, (x, y))
        y += 48 + pad
    # the moments: frames 0, 4, 8, 12, 16, 20, 23 on sky
    for n in strip_names:
        for k, f in enumerate((0, 4, 8, 12, 16, 20, 23)):
            im = Image.open(os.path.join(out, n, "light", "frames", f"{f:03d}.webp")).convert("RGBA")
            tile = page(110, 110, "light")
            im = fit_into(im, (110, 110))
            tile.alpha_composite(im, ((110 - im.size[0]) // 2, (110 - im.size[1]) // 2))
            sheet.alpha_composite(tile, (pad + k * (110 + 8), y))
        y += 110 + pad
    # the cards beside the Scan frame they stand for, on the ink viewfinder
    x = pad
    for n, kind in zip(cards, ("licence", "card")):
        fr = scan_frame(kind, T)
        tile = page(int(T * 1.5), T, "dark")
        im = fit_into(still(out, n, "dark"), (int(T * 1.5), T))
        tile.alpha_composite(im, ((tile.size[0] - im.size[0]) // 2, (T - im.size[1]) // 2))
        sheet.alpha_composite(tile, (x, y))
        sheet.alpha_composite(fr, (x + tile.size[0] + 8, y))
        x += tile.size[0] + 8 + fr.size[0] + pad * 2
    if cards:
        y += T + pad
    sheet.convert("RGB").save(os.path.join(out, "contact.png"), optimize=True)
    print("contact", sheet.size, flush=True)


BODONI = os.path.join(ROOT, "auction", "assets", "fonts", "Bodoni-Display.ttf")
INTER = os.path.join(ROOT, "tools", "cloud-3d", "fonts", "Inter.ttf")


def _font(path, px, weight=None):
    f = ImageFont.truetype(path, px)
    if weight is not None:
        try:
            f.set_variation_by_axes([weight, 0])
        except Exception:
            pass
    return f


def placement(out, fname, obj, variant, words, obj_h, gap=36, w=1080, h=560):
    """The Lego test: the object and the number or verb it means, side by side,
    sharing a centre line. No caption, no connector."""
    im = page(w, h, variant)
    ob = still(out, obj, variant)
    ob = fit_into(ob, (int(obj_h * ob.size[0] / ob.size[1]), obj_h))
    ink = (0xF2, 0xF6, 0xFF, 255) if variant == "dark" else (0x14, 0x1C, 0x30, 255)
    dr = ImageDraw.Draw(im)
    widths = []
    for text, font in words:
        track = font.size * 0.14 if text.isupper() else 0.0   # spaced capitals
        b = list(dr.textbbox((0, 0), text, font=font))
        b[2] += track * (len(text) - 1)
        widths.append((b, text, font, track))
    tw = sum(b[2] - b[0] for b, _, _, _ in widths) + 18 * (len(widths) - 1)
    total = ob.size[0] + gap + tw
    x0 = int((w - total) // 2)
    im.alpha_composite(ob, (x0, (h - ob.size[1]) // 2))
    x = x0 + ob.size[0] + gap
    # one baseline for all the words, on the object's centre line
    base = h // 2 + max(b[3] for b, _, _, _ in widths) // 2 - 4
    for b, text, font, track in widths:
        cx = x - b[0]
        for ch in text:
            dr.text((cx, base - b[3]), ch, font=font, fill=ink)
            cx += dr.textlength(ch, font=font) + track
        x += b[2] - b[0] + 18
    d = os.path.join(out, "placements")
    os.makedirs(d, exist_ok=True)
    im.convert("RGB").save(os.path.join(d, fname), optimize=True)
    print("placement", fname, flush=True)


def placements(out):
    bod = lambda px: _font(BODONI, px)
    inter = lambda px: _font(INTER, px, 600)
    # the car beside the price (the lane is ink); the price is a seeded figure
    placement(out, "car-price-seeded.png", "car", "dark", [("$8,400", bod(132))], 300)
    placement(out, "title-before-day-21.png", "title", "light", [("BEFORE DAY 21", inter(44))], 330)
    placement(out, "plate-10.png", "plate", "light", [("$10", bod(140))], 260)
    placement(out, "coin-250-back.png", "coin", "light", [("$250", bod(132)), ("BACK", inter(44))], 300)


if __name__ == "__main__":
    work, out = sys.argv[1], sys.argv[2]
    args = sys.argv[3:]
    if "--contact" not in args:
        for n in (args or NAMES):
            publish_still(work, out, n)
            if n in MOMENTS:
                publish_moment(work, out, n)
    contact(out)
    placements(out)
