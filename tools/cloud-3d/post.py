"""Stage 3 (python3 + numpy + Pillow): grade, size, pack and publish.

  python3 post.py WORK OUT [button|sky|contact|all]

Reads the linear passes in WORK, writes the shipping assets to OUT
(assets/cloud-3d). Every PNG is a 256-colour RGBA palette made by
libimagequant (dithered), every WebP is lossy with alpha at quality 82; straight alpha in
both, as the formats define.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import grade  # noqa: E402

SIZES = {320: 128, 440: 176, 640: 256}        # CSS width: CSS height (2.5:1 canvas)
SCALES = (1, 2)
FRAMES = 24
REST, PRESSED = 23, 5
# the label safe zone, as fractions of the canvas (checked against alpha below)
SAFE = (0.25, 0.52, 0.75, 0.74)               # x0, y0, x1, y1
INK, ICE = "#1C2436", "#E9EFFE"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def premul_resize(rgba, w, h):
    """Resize straight-alpha uint8 RGBA without dark or bright fringes."""
    f = rgba.astype(np.float32) / 255.0
    pm = np.concatenate([f[..., :3] * f[..., 3:], f[..., 3:]], -1)
    chans = [np.asarray(Image.fromarray(pm[..., i]).resize((w, h), Image.LANCZOS)) for i in range(4)]
    pm = np.clip(np.stack(chans, -1), 0, 1)
    a = pm[..., 3:]
    rgb = np.where(a > 1e-4, pm[..., :3] / np.maximum(a, 1e-4), 0)
    out = np.concatenate([np.clip(rgb, 0, 1), a], -1)
    return (out * 255 + 0.5).astype(np.uint8)


try:  # libimagequant (pip install imagequant; IMAGEQUANT_PATH adds a --target dir)
    if os.environ.get("IMAGEQUANT_PATH"):
        sys.path.insert(0, os.environ["IMAGEQUANT_PATH"])
    import imagequant
except ImportError:  # never fall back to octree: it posterizes the volume
    imagequant = None


def save_png(arr, path):
    """256-colour palette PNG through libimagequant (dithered), or a
    full-colour RGBA PNG when libimagequant is missing."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im = Image.fromarray(arr, "RGBA")
    if imagequant is not None:
        im = imagequant.quantize_pil_image(im, dithering_level=1.0, max_colors=256)
    im.save(path, optimize=True)


def save_webp(arr, path, quality=82):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.fromarray(arr, "RGBA").save(path, "WEBP", quality=quality, method=6, alpha_quality=90, exact=False)


def save_both(arr, path_png):
    save_png(arr, path_png)
    save_webp(arr, path_png[:-4] + ".webp")


# ----------------------------------------------------------------- shadows

def contact_shadow(work, pressed, variant, width):
    """The ray-traced contact shadow (render_shadow.py): the page's lost light
    under the cloud, coloured with the house shade (cloud-system section 5:
    ink on light, a deeper ink on the dark lane) and scaled per variant.
    Pressed is shorter, sharper and darker by the render's own optics."""
    sh = np.load(os.path.join(work, f"shadow-{'pressed' if pressed else 'rest'}-{width}.npz"))["shadow"].astype(np.float32)
    strength = (0.30 if pressed else 0.24) if variant == "light" else (0.60 if pressed else 0.50)
    colour = grade.hexrgb(INK) if variant == "light" else (8, 11, 18)
    out = np.zeros(sh.shape + (4,), np.uint8)
    out[..., :3] = colour
    out[..., 3] = (np.clip(sh * strength, 0, 1) * 255 + 0.5).astype(np.uint8)
    return out


# ----------------------------------------------------------------- button

def load_button(work):
    frames = {}
    for f in range(FRAMES):
        frames[f] = dict(np.load(os.path.join(work, f"button-{f:02d}.npz")))
    return frames


def edge_feather(rgba, frac=0.035):
    """Fade alpha to zero over the outer 3.5 percent of the canvas so the
    puff's outward wisps (frames 8 to 13) never end on a hard canvas edge."""
    h, w = rgba.shape[:2]

    def ramp(n):
        k = max(1, int(round(n * frac)))
        r = np.ones(n, np.float32)
        t = (np.arange(k, dtype=np.float32) + 0.5) / k
        s = t * t * (3 - 2 * t)
        r[:k] = s
        r[-k:] = s[::-1]
        return r
    m = ramp(h)[:, None] * ramp(w)[None, :]
    out = rgba.copy()
    out[..., 3] = (out[..., 3].astype(np.float32) * m + 0.5).astype(np.uint8)
    return out


def build_button(work, out):
    frames = load_button(work)
    graded = {v: [edge_feather(grade.grade(frames[f], v)) for f in range(FRAMES)] for v in ("light", "dark")}
    H0, W0 = graded["light"][0].shape[:2]
    # safe zone check: the rect must be solid (alpha >= 0.97) in every frame
    def _amin(a):
        h, w = a.shape
        return float(a[int(SAFE[1] * h):int(SAFE[3] * h), int(SAFE[0] * w):int(SAFE[2] * w)].astype(np.float32).min())
    amin = min(_amin(frames[f]["alpha"]) for f in range(FRAMES))
    safe = dict(note="Label safe rect per size, in CSS px and in device px at each scale. "
                     "Canvas is the full sprite; the label is centred in the rect, upright spaced capitals, "
                     "ink #1C2436 on light, ice #E9EFFE on dark.",
                fractions=dict(x=SAFE[0], y=SAFE[1], w=SAFE[2] - SAFE[0], h=SAFE[3] - SAFE[1]),
                min_alpha_in_rect_all_frames=round(amin, 3), sizes={})
    for W, H in SIZES.items():
        r = dict(x=round(SAFE[0] * W), y=round(SAFE[1] * H), w=round((SAFE[2] - SAFE[0]) * W),
                 h=round((SAFE[3] - SAFE[1]) * H))
        safe["sizes"][str(W)] = dict(canvas=dict(w=W, h=H), safe=r,
                                     label_cap_height_max=round(r["h"] * 0.42),
                                     **{f"@{s}x": dict(canvas=dict(w=W * s, h=H * s),
                                                       safe={k: v * s for k, v in r.items()}) for s in SCALES})
    os.makedirs(os.path.join(out, "button"), exist_ok=True)
    json.dump(safe, open(os.path.join(out, "button", "safe-zone.json"), "w"), indent=2)
    print("safe zone min alpha across frames:", round(amin, 3))
    for v in ("light", "dark"):
        shadows = {p: contact_shadow(work, p, v, W0) for p in (False, True)}
        for W, H in SIZES.items():
            d = os.path.join(out, "button", v, str(W))
            for s in SCALES:
                w, h = W * s, H * s
                sfx = "" if s == 1 else f"@{s}x"
                sized = [premul_resize(graded[v][f], w, h) if graded[v][f].shape[:2] != (h, w) else graded[v][f]
                         for f in range(FRAMES)]
                save_both(sized[REST], os.path.join(d, f"rest{sfx}.png"))
                save_both(sized[PRESSED], os.path.join(d, f"pressed{sfx}.png"))
                for f in range(FRAMES):
                    save_both(sized[f], os.path.join(d, "press", f"{f:03d}{sfx}.png"))
                for p, name in ((False, "shadow-rest"), (True, "shadow-pressed")):
                    sh = shadows[p] if shadows[p].shape[:2] == (h, w) else premul_resize(shadows[p], w, h)
                    save_both(sh, os.path.join(d, f"{name}{sfx}.png"))
                # sprite sheet: 3 columns x 8 rows, a 4 px transparent gap between
                # frames (rects exclude it) so no neighbour ever bleeds. The hero
                # @2x sheet is 3848 x 4124: over 4096 tall, inside 8192.
                cols, gap = 3, 4
                rows = (FRAMES + cols - 1) // cols
                sheet = np.zeros((rows * h + (rows - 1) * gap, cols * w + (cols - 1) * gap, 4), np.uint8)
                rects = []
                for f in range(FRAMES):
                    cx, cy = (f % cols) * (w + gap), (f // cols) * (h + gap)
                    sheet[cy:cy + h, cx:cx + w] = sized[f]
                    rects.append(dict(i=f, x=cx, y=cy, w=w, h=h))
                save_png(sheet, os.path.join(d, f"sheet{sfx}.png"))  # phone only: no webp
                json.dump(dict(image=f"sheet{sfx}.png", fps=60, duration_ms=400, gap=gap, frames=rects,
                               rest=REST, pressed=PRESSED, scale=s, css=dict(w=W, h=H),
                               safe=safe["sizes"][str(W)][f"@{s}x"]["safe"], safe_css=safe["sizes"][str(W)]["safe"],
                               phases=dict(sink=[0, 5], puff=[6, 15], settle=[16, 23]),
                               note="frames 6 to 23 carry the re-inflation baked in; play them linearly at 60 fps"),
                          open(os.path.join(d, f"sheet{sfx}.json"), "w"), indent=1)
                print("button", v, W, f"@{s}x", flush=True)


def build_fx(work, out):
    """wisp (128 px) and ring (256 px) at @1x and @2x, both variants."""
    for name, px in (("wisp", 128), ("ring", 256)):
        p = dict(np.load(os.path.join(work, f"fx-{name}.npz")))
        for v in ("light", "dark"):
            g = grade.grade(p, v)
            tag = "" if v == "light" else "-dark"
            save_both(premul_resize(g, px, px), os.path.join(out, "button", f"{name}{tag}.png"))
            save_both(g if g.shape[0] == 2 * px else premul_resize(g, 2 * px, 2 * px),
                      os.path.join(out, "button", f"{name}{tag}@2x.png"))
        print("fx", name, flush=True)


def build_etched(work, out, width=1280):
    """The etched-label reference: rest cloud with GET ON THE LANE carved
    into the volume in Cycles. Reference only; never baked into sprites."""
    p = dict(np.load(os.path.join(work, f"etched-{width}.npz")))
    for v in ("light", "dark"):
        g = grade.grade(p, v)
        save_png_full(g, os.path.join(out, "button", v, "640", "etched-reference.png"))
    print("etched reference", flush=True)


def save_png_full(arr, path):
    """Full-colour RGBA PNG (no palette): the reference is judged, not shipped."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.fromarray(arr, "RGBA").save(path, optimize=True)


# ----------------------------------------------------------------- sky

def wrap_blend(p, width):
    """A layer rendered one period wide plus an overlap each side (render_sky.py)
    becomes one period: the left overlap band is crossfaded, in premultiplied
    linear, between the columns inside the period and the same columns one
    period to the right, so the wrap's two edges are the same cloud at the
    same light and meet without a seam."""
    w2 = next(iter(p.values())).shape[1]
    ov = (w2 - width) // 2
    if ov <= 0:
        return p, 0
    t = (np.arange(ov, dtype=np.float32) + 0.5) / ov          # 0 at the edge, 1 inside
    s = (t * t * (3 - 2 * t))[None, :]
    out = {}
    for k, v in p.items():
        v = v.astype(np.float32)
        a, b = v[:, ov:ov + width], v[:, ov + width:ov + width + ov]   # the period, the wrap's continuation
        band = a[:, :ov] * s[..., None] if a.ndim == 3 else a[:, :ov] * s
        band = band + (b * (1 - s[..., None]) if a.ndim == 3 else b * (1 - s))
        a = a.copy()
        a[:, :ov] = band
        out[k] = a
    return out, ov


def build_sky(work, out, width=2048):
    for layer in ("far", "mid", "near"):
        p = dict(np.load(os.path.join(work, f"sky-{layer}-{width}.npz")))
        p, ov = wrap_blend(p, width)
        for v in ("light", "dark"):
            g = grade.grade(p, v)
            save_both(g, os.path.join(out, "sky", v, f"{layer}.png"))
            seam = float(np.abs(g[:, 0].astype(np.float32) - g[:, -1].astype(np.float32)).mean())
            inner = float(np.abs(g[:, width // 3].astype(np.float32) - g[:, width // 3 + 1].astype(np.float32)).mean())
            print("sky", layer, v, "seam mean abs diff", round(seam, 2), "inside", round(inner, 2), "overlap", ov, flush=True)


# ----------------------------------------------------------------- contact

def _label(img, rect, text, colour, px):
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(FONT, px)
    spaced = " ".join(text)  # upright spaced capitals
    spaced = spaced.replace("   ", "  ")
    tw = d.textlength(spaced, font=f)
    x = rect[0] + (rect[2] - tw) / 2
    asc, desc = f.getmetrics()
    y = rect[1] + (rect[3] - asc) / 2
    d.text((x, y), spaced, font=f, fill=colour)


def build_contact(out):
    W, s = 640, 1
    H = SIZES[W]
    sw, sh = W * s, H * s
    pad = 24
    frames_show = [0, 3, 5, 8, 11, 15]
    cols = 4
    tile_w, tile_h = sw + pad, sh + pad
    rows_btn = []
    for v, bgname in (("light", "sky"), ("dark", "ink")):
        d = os.path.join(out, "button", v, str(W))
        names = ["rest", "pressed"] + [f"press/{f:03d}" for f in frames_show]
        tiles = []
        for n in names:
            spr = Image.open(os.path.join(d, n + "@2x.png")).convert("RGBA").resize((sw, sh), Image.LANCZOS)
            shadow = Image.open(os.path.join(d, ("shadow-pressed" if n in ("pressed", "press/003", "press/005") else "shadow-rest") + "@2x.png")).convert("RGBA").resize((sw, sh), Image.LANCZOS)
            bg = Image.fromarray(grade.gradient_bg(sw, sh) if bgname == "sky" else grade.flat_bg(sw, sh, INK)).convert("RGBA")
            bg.alpha_composite(shadow)
            bg.alpha_composite(spr)
            if n in ("rest", "pressed"):
                r = (SAFE[0] * sw, SAFE[1] * sh, (SAFE[2] - SAFE[0]) * sw, (SAFE[3] - SAFE[1]) * sh)
                _label(bg, r, "LET A CAR GO", INK if v == "light" else ICE, int(sh * 0.085))
            tiles.append(bg)
        rows_btn.append(tiles)
    # sky panels, 1024 wide, over the house gradient and over ink
    sky_w, sky_h = 1024, 512
    sky_panels = []
    for v in ("light", "dark"):
        bg = Image.fromarray(grade.gradient_bg(sky_w, sky_h) if v == "light" else grade.flat_bg(sky_w, sky_h, INK)).convert("RGBA")
        for layer, op in (("far", 0.72), ("mid", 0.84), ("near", 0.94)):
            im = Image.open(os.path.join(out, "sky", v, f"{layer}.png")).convert("RGBA").resize((sky_w, sky_h), Image.LANCZOS)
            a = np.asarray(im).copy()
            a[..., 3] = (a[..., 3].astype(np.float32) * op).astype(np.uint8)
            bg.alpha_composite(Image.fromarray(a))
        sky_panels.append(bg)
    single = []
    for layer in ("far", "mid", "near"):
        for v in ("light", "dark"):
            bg = Image.fromarray(grade.gradient_bg(512, 256) if v == "light" else grade.flat_bg(512, 256, INK)).convert("RGBA")
            im = Image.open(os.path.join(out, "sky", v, f"{layer}.png")).convert("RGBA").resize((512, 256), Image.LANCZOS)
            bg.alpha_composite(im)
            single.append(bg)
    etched = []
    for v in ("light", "dark"):
        pth = os.path.join(out, "button", v, "640", "etched-reference.png")
        if os.path.exists(pth):
            spr = Image.open(pth).convert("RGBA").resize((sw, sh), Image.LANCZOS)
            shadow = Image.open(os.path.join(out, "button", v, "640", "shadow-rest@2x.png")).convert("RGBA").resize((sw, sh), Image.LANCZOS)
            bg = Image.fromarray(grade.gradient_bg(sw, sh) if v == "light" else grade.flat_bg(sw, sh, INK)).convert("RGBA")
            bg.alpha_composite(shadow)
            bg.alpha_composite(spr)
            etched.append(bg)
    CW = cols * tile_w + pad
    btn_h = 2 * ((len(rows_btn[0]) + cols - 1) // cols) * tile_h + (tile_h if etched else 0)
    CH = pad + btn_h + pad + sky_h + pad + 3 * (256 + pad) + pad
    sheet = Image.new("RGBA", (CW, CH), (236, 241, 250, 255))
    y = pad
    for tiles in rows_btn:
        for i, t in enumerate(tiles):
            sheet.alpha_composite(t, (pad + (i % cols) * tile_w, y + (i // cols) * tile_h))
        y += ((len(tiles) + cols - 1) // cols) * tile_h
    for i, t in enumerate(etched):
        sheet.alpha_composite(t, (pad + i * tile_w, y))
    if etched:
        y += tile_h
    y += pad
    sheet.alpha_composite(sky_panels[0], (pad, y))
    sheet.alpha_composite(sky_panels[1], (pad + sky_w + pad, y))
    y += sky_h + pad
    for i, t in enumerate(single):
        sheet.alpha_composite(t, (pad + (i % 2) * (512 + pad), y + (i // 2) * (256 + pad)))
    # the real cumulus photo for comparison, beside the single layers
    ref = os.path.join(os.path.dirname(out), "..", "obavia-co", "assets", "obavia-clouds.webp")
    if os.path.exists(ref):
        r = Image.open(ref).convert("RGBA")
        rw = CW - (2 * (512 + pad) + pad) - pad
        r = r.resize((rw, int(r.height * rw / r.width)), Image.LANCZOS)
        sheet.alpha_composite(r, (2 * (512 + pad) + pad, y))
    sheet.convert("RGB").save(os.path.join(out, "contact.png"), optimize=True)
    print("contact", sheet.size)


if __name__ == "__main__":
    work, out = sys.argv[1], sys.argv[2]
    what = sys.argv[3] if len(sys.argv) > 3 else "all"
    if what in ("button", "all"):
        build_button(work, out)
    if what in ("fx", "all"):
        build_fx(work, out)
    if what in ("sky", "all"):
        build_sky(work, out)
    if what in ("etched", "all"):
        build_etched(work, out)
    if what in ("contact", "all"):
        build_contact(out)
