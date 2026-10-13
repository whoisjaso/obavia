"""Stage 2e and 3e: the label imprints (the owner: "etched into the clouds,
real and clean blended").

Each label in labels.json is carved into the rest volume inside Cycles, the
same way as the etched reference (render_etched.py): a glyph mask and the
front-surface depth map projected along the view axis remove density from
the visible surface, and the same sun shades the cut. Only the safe rect
region of the canvas is rendered (a border crop), once plain and once per
label, at the same seed and settings, so the difference between the two is
the carve and nothing else.

What ships is the imprint: the carved frame minus the plain frame, unblended
into a transparent RGBA layer (the shadowed wall, the lit lip, the darkened
floor, each with its own alpha), cut to the safe rect at every size and
scale. The phone lays it over any frame of the sheet. A lip layer (the lit
wall alone) lets the landed swell brighten the lip.

  python3      render_labels.py WORK masks
  $BLENDER_PY  render_labels.py WORK render WIDTH SPP [--labels=bid,pay]
  python3      render_labels.py WORK post OUT [--width=1280] [--labels=bid]

masks writes WORK/label-<slug>-mask.png (16-bit, blurred, the carve) and
WORK/label-<slug>.npz (the sharp glyph coverage, for the floor). render
writes WORK/label-plain-<W>.npz and WORK/label-<slug>-<W>.npz. post writes
OUT/labels/{light,dark}/{320,440,640}/<slug>@{1x,2x}.png and -lip, the floor
masks OUT/labels/{320,440,640}/<slug>-floor@{1x,2x}.png (for the contrast
test, not shipped), OUT/labels/labels.json and OUT/labels/contact.png.
"""
import json
import os
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import field  # noqa: E402

CFG = json.load(open(os.path.join(HERE, "labels.json")))
SIZES = {320: 128, 440: 176, 640: 256}
SCALES = (1, 2)
SAFE = (0.25, 0.52, 0.75, 0.74)                 # canvas fractions, as post.py
# the rendered region, canvas fractions from the top left: the safe rect plus
# a margin for the walls and the light the carve lets in; exact pixel edges at
# 1280 x 512 (280 to 1000, 240 to 416) and at every power-of-two division
CROP = (0.21875, 0.46875, 0.78125, 0.8125)
INK, ICE, SKY = "#1C2436", "#E9EFFE", "#EEF2FC"
# the dark lane: the carve alone does not read on ink, so the floor takes a
# thin ice fill at 90 percent, shaded by the same sun (brighter where it falls)
DARK_FILL = dict(colour=ICE, opacity=0.90, shade=(0.80, 1.0))
# the light cloud: the cut's floor in Cycles is a soft blue-grey; deepened to
# ink with the cloud's blue in it, shaded by the same sun, so it holds 4.5:1
LIGHT_FILL = dict(colour="#0F1626", opacity=0.97, shade=(0.94, 1.04))
LIP = "#F8FAFF"
# the walls of the cut, from the same sun (upper left, 30 degrees): a cut is seen by its walls, and the walls are
# seen where the cut's soft edge slopes. The wall that faces the sun is the lower-right edge of each stroke, lit;
# the wall that faces away is the upper-left edge, in shade. Width as a share of the cap height.
SUN_AWAY = (0.819, 0.574)       # image x right, y down: the direction the light travels
WALL = dict(width=0.075,
            light=dict(lit=("#FBF8F2", 0.85), shade=None),
            dark=dict(lit=("#FFFFFF", 0.55), shade=("#0E1424", 0.55)))
SURROUND = 0.5      # the surround the floor is read against: the cloud blurred at half a cap height


def slug(text):
    return "".join(ch for ch in text.lower() if ch.isalnum() or ch == " ").strip().replace(" ", "-")


def hexrgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255.0


# ----------------------------------------------------------------- masks

def _font(size):
    from PIL import ImageFont
    f = ImageFont.truetype(os.path.join(HERE, CFG["font"]), size)
    f.set_variation_by_axes([CFG["weight"], 0])
    return f


def masks(work):
    """The glyph masks, in the etch texture's frame (build_fields.etch): x0 to
    x1 and z1 to z0 in world units, 2048 wide. Upright spaced capitals."""
    from PIL import Image, ImageDraw, ImageFilter
    e = dict(np.load(os.path.join(work, "etch.npz")))
    x0, x1, z0, z1 = (float(e[k]) for k in ("x0", "x1", "z0", "z1"))
    th, tw = e["mask"].shape
    upx = tw / (x1 - x0)
    B = field.BUTTON
    cw = B["ortho"]                                  # canvas width in world units
    chh = B["ortho"] / B["aspect"]
    top = B["center"][1] + chh / 2
    zc = top - CFG["cap_centre_y"] * chh              # the cap line's centre, on the sunlit face
    em0 = CFG["em_of_canvas_w"] * cw * upx            # texture px
    fit = CFG["fit_of_safe_w"] * (SAFE[2] - SAFE[0]) * cw * upx
    out = {}
    for text in CFG["labels"]:
        s = slug(text)
        cap = text.upper()

        def layout(em):
            f = _font(int(round(em)))
            ws = [f.getlength(ch) for ch in cap]
            return f, ws, sum(ws) + CFG["tracking_em"] * em * (len(cap) - 1)
        em = em0
        f, ws, total = layout(em)
        if total > fit:
            em = em0 * fit / total
            f, ws, total = layout(em)
        img = Image.new("L", (tw, th), 0)
        d = ImageDraw.Draw(img)
        bb = f.getbbox("H")
        y = (z1 - zc) * upx - (bb[1] + bb[3]) / 2
        x = (tw - total) / 2
        for ch, w in zip(cap, ws):
            d.text((x, y), ch, font=f, fill=255)
            x += w + CFG["tracking_em"] * em
        sharp = np.asarray(img).astype(np.float32) / 255.0
        cap_h = (bb[3] - bb[1]) / upx
        soft = img.filter(ImageFilter.GaussianBlur(cap_h * upx * 0.035))
        Image.fromarray((np.asarray(soft).astype(np.float32) / 255.0 * 65535 + 0.5).astype(np.uint16)).save(
            os.path.join(work, f"label-{s}-mask.png"))
        np.savez_compressed(os.path.join(work, f"label-{s}.npz"), sharp=sharp, em=em / upx, cap=cap_h)
        out[s] = dict(text=text, em_world=em / upx, cap_world=cap_h, fitted=bool(em < em0))
        print(f"mask {s} em {em / upx:.4f} cap {cap_h:.4f}{' (fitted)' if em < em0 else ''}", flush=True)
    with open(os.path.join(work, "labels-masks.json"), "w") as fh:
        json.dump(out, fh, indent=1)


# ----------------------------------------------------------------- render (bpy)

def render(work, width, spp, only):
    import scene  # bpy
    from render_button import DENSITY, ANISO, DETAIL
    B = field.BUTTON
    meta = json.load(open(os.path.join(work, "button-23.npy.json")))
    d = np.load(os.path.join(work, "button-23.npy")).astype(np.float32)
    e = dict(np.load(os.path.join(work, "etch.npz")))
    common = {k: float(e[k]) for k in ("x0", "x1", "z0", "z1", "depth", "feather", "fmin", "fscale")}
    jobs = [("plain", None)] + [(slug(t), slug(t)) for t in CFG["labels"] if not only or slug(t) in only]
    for name, s in jobs:
        out = os.path.join(work, f"label-{name}-{width}.npz")
        if os.path.exists(out):
            continue
        etch = None
        if s is not None:
            etch = dict(mask_png=os.path.abspath(os.path.join(work, f"label-{s}-mask.png")),
                        front_png=os.path.abspath(os.path.join(work, "etch-front.png")), **common)
        t = scene.render_grid(d, tuple(meta["lo"]), tuple(meta["hi"]), tuple(meta["res"]), out,
                              width, int(round(width / B["aspect"])), B["ortho"], B["center"],
                              samples=spp, density_scale=DENSITY, anisotropy=ANISO, bounces=12,
                              step_rate=1.0, detail=DETAIL, etch=etch, border=CROP)
        print(f"render label {name} {width}px {spp}spp {t:.1f} s", flush=True)


# ----------------------------------------------------------------- post (python3)

def _lum(c):
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return lin @ np.array([0.2126, 0.7152, 0.0722], np.float32)


def _resize(a, w, h):
    """LANCZOS resize of a float (h, w[, c]) array, channel by channel."""
    from PIL import Image
    if a.ndim == 2:
        return np.asarray(Image.fromarray(a.astype(np.float32), "F").resize((w, h), Image.LANCZOS))
    return np.stack([_resize(a[..., i], w, h) for i in range(a.shape[-1])], -1)


def _canvas(passes, W, H):
    """Paste the cropped passes into a full canvas of zeros."""
    x0, y0 = int(round(CROP[0] * W)), int(round(CROP[1] * H))
    full = {}
    for k, v in passes.items():
        a = np.zeros((H, W) + v.shape[2:], np.float32)
        a[y0:y0 + v.shape[0], x0:x0 + v.shape[1]] = v.astype(np.float32)
        full[k] = a
    return full


def _over_page(rgba, page):
    f = rgba.astype(np.float32) / 255.0
    return f[..., :3] * f[..., 3:] + page * (1 - f[..., 3:])


def _texture_to_canvas(tex, e, W, H):
    """Sample a mask in the etch texture's frame onto the canvas grid."""
    from PIL import Image
    B = field.BUTTON
    th, tw = tex.shape
    x0, x1, z0, z1 = (float(e[k]) for k in ("x0", "x1", "z0", "z1"))
    cw, chh = B["ortho"], B["ortho"] / B["aspect"]
    left = B["center"][0] - cw / 2
    top = B["center"][1] + chh / 2
    # canvas px (X, Y) -> world (left + X / W * cw, top - Y / H * chh) -> texture px
    sx = (cw / W) * tw / (x1 - x0)
    ox = (left - x0) * tw / (x1 - x0)
    sy = (chh / H) * th / (z1 - z0)
    oy = (z1 - top) * th / (z1 - z0)
    # box-filter down first so the affine sample does not alias
    k = max(1, int(sx))
    t = Image.fromarray(tex.astype(np.float32), "F")
    if k > 1:
        t = t.resize((tw // k, th // k), Image.BOX)
        sx, ox, sy, oy = sx / k, ox / k, sy / k, oy / k
    im = t.transform((W, H), Image.AFFINE, (sx, 0, ox + sx / 2 - 0.5, 0, sy, oy + sy / 2 - 0.5), Image.BILINEAR)
    return np.asarray(im)


def _grow(m, r):
    """A soft dilation: max filter then blur, in pixels."""
    from PIL import Image, ImageFilter
    im = Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8))
    n = 2 * int(r) + 1
    im = im.filter(ImageFilter.MaxFilter(n if n % 2 else n + 1)).filter(ImageFilter.GaussianBlur(max(0.5, r / 2)))
    return np.asarray(im).astype(np.float32) / 255.0


def _blur(x, sigma):
    """Separable Gaussian, edges extended (the cloud continues past the rect)."""
    r = max(1, int(3 * sigma))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    p = np.pad(x, r, mode="edge")
    p = np.apply_along_axis(lambda v: np.convolve(v, k, "valid"), 1, p)
    return np.apply_along_axis(lambda v: np.convolve(v, k, "valid"), 0, p)


def _shift(a, dx, dy):
    """a sampled at (x + dx, y + dy), bilinear, zero outside."""
    from PIL import Image
    im = Image.fromarray(a.astype(np.float32), "F")
    return np.asarray(im.transform(im.size, Image.AFFINE, (1, 0, dx, 0, 1, dy), Image.BILINEAR, fillcolor=0))


def _unblend(C, P, keep=None, eps=1e-4):
    """The layer (colour c, alpha a) with the least alpha such that c over P
    gives C, per pixel (a decal that reproduces the carve over this frame).
    Where the fills cover the cut (keep), the alpha is at least theirs, so the
    floor stays the floor over any frame, not a tint of whatever is under it."""
    d = C - P
    up = np.where(d > 0, d / np.maximum(1 - P, eps), 0)
    dn = np.where(d < 0, -d / np.maximum(P, eps), 0)
    a = np.clip(np.maximum(up, dn).max(-1), 0, 1)
    if keep is not None:
        a = np.maximum(a, np.clip(keep, 0, 1))
    c = np.clip(P + d / np.maximum(a, eps)[..., None], 0, 1)
    return c, a


def _save_q(arr, path):
    from PIL import Image
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im = Image.fromarray(arr, "RGBA")
    if IQ is not None:
        im = IQ.quantize_pil_image(im, dithering_level=1.0, max_colors=256)
    im.save(path, optimize=True)


def _shade(L, core, lo, hi):
    """The sun's term across the floor: the carved floor's luminance in the
    light grade, normalised over the floor (5th to 95th percentile) to lo..hi."""
    v = L[core > 0.5]
    if v.size < 8:
        return np.full_like(L, (lo + hi) / 2)
    a, b = np.percentile(v, 5), np.percentile(v, 95)
    return lo + (hi - lo) * np.clip((L - a) / max(b - a, 1e-4), 0, 1)


def post(work, out, width, only):
    sys.path.insert(0, HERE)
    import grade
    plain = dict(np.load(os.path.join(work, f"label-plain-{width}.npz")))
    W, H = width, int(round(width / field.BUTTON["aspect"]))
    plain = _canvas(plain, W, H)
    e = dict(np.load(os.path.join(work, "etch.npz")))
    pages = dict(light=hexrgb(SKY), dark=hexrgb(INK))
    g_plain = {v: grade.grade(plain, v) for v in ("light", "dark")}
    P_m = {v: _over_page(g_plain[v], pages[v]) for v in pages}
    sz = json.load(open(os.path.join(out, "button", "safe-zone.json")))["sizes"]
    root = os.path.join(out, "labels")
    manifest = dict(note=("Label imprints carved in Cycles into the rest cloud (render_labels.py). Each file is the "
                          "safe rect of its size and scale; lay it over any frame of the sheet at rect. -lip is the "
                          "lit wall alone (the landed swell brightens it). The floor masks are for the contrast test "
                          "only and do not ship."),
                    font="Inter SemiBold (OFL) for the platform face at weight 600", source_width=width,
                    surround_of_cap=SURROUND, sizes={}, labels={}, contrast={},
                    contrast_note="per label, variant and size: [floor against the cloud around it, floor against the pixel under it], worst pixel of the floor at rest")
    for s_ in SIZES:
        manifest["sizes"][str(s_)] = {f"@{k}x": dict(canvas=sz[str(s_)][f"@{k}x"]["canvas"], rect=sz[str(s_)][f"@{k}x"]["safe"]) for k in SCALES}
    texts = [t for t in CFG["labels"] if not only or slug(t) in only]
    for text in texts:
        s = slug(text)
        pth = os.path.join(work, f"label-{s}-{width}.npz")
        if not os.path.exists(pth):
            print("missing", pth, flush=True)
            continue
        carved = _canvas(dict(np.load(pth)), W, H)
        lm = dict(np.load(os.path.join(work, f"label-{s}.npz")))
        sharp_m = _texture_to_canvas(lm["sharp"], e, W, H)
        g_carved = {v: grade.grade(carved, v) for v in ("light", "dark")}
        C_m = {v: _over_page(g_carved[v], pages[v]) for v in pages}
        manifest["labels"][s] = dict(text=text, caps=text.upper(), cap_of_canvas_w=round(float(lm["cap"]) / field.BUTTON["ortho"], 5))
        for size, ch in SIZES.items():
            for k in SCALES:
                cw_, chh_ = size * k, ch * k
                r = sz[str(size)][f"@{k}x"]["safe"]
                ys, xs = slice(r["y"], r["y"] + r["h"]), slice(r["x"], r["x"] + r["w"])
                cov = np.clip(_resize(sharp_m, cw_, chh_), 0, 1)[ys, xs]
                sigma = SURROUND * float(lm["cap"]) / field.BUTTON["ortho"] * cw_
                core = (cov >= 0.9).astype(np.float32)
                reach = _grow(cov, max(2.0, 6.0 * cw_ / W))   # where the carve may change the light
                Lc_light = _lum(np.clip(_resize(C_m["light"], cw_, chh_), 0, 1)[ys, xs])
                cap_px = float(lm["cap"]) / field.BUTTON["ortho"] * cw_
                # the floor fill follows the glyph with the carve's own soft edge (the mask Cycles cut with is
                # blurred at 3.5 percent of the cap; the fill at 2.5), so it sits in the cut, not on it
                floor = np.clip((_blur(cov, max(0.35, 0.025 * cap_px)) - 0.2) / 0.6, 0, 1)
                wpx = WALL["width"] * float(lm["cap"]) / field.BUTTON["ortho"] * cw_
                lit = np.clip(cov - _shift(cov, SUN_AWAY[0] * wpx, SUN_AWAY[1] * wpx), 0, 1)
                shd = np.clip(cov - _shift(cov, -SUN_AWAY[0] * wpx, -SUN_AWAY[1] * wpx), 0, 1)
                # a wall is a wall where it is a tenth of a pixel or more: its tail does not wash over the floor
                lit, shd = np.clip((lit - 0.1) / 0.4, 0, 1), np.clip((shd - 0.1) / 0.4, 0, 1)
                core = core * (lit == 0) * (shd == 0)            # the floor proper: inside the walls
                for v in ("light", "dark"):
                    P = np.clip(_resize(P_m[v], cw_, chh_), 0, 1)[ys, xs]
                    C = np.clip(_resize(C_m[v], cw_, chh_), 0, 1)[ys, xs]
                    fill = DARK_FILL if v == "dark" else LIGHT_FILL
                    shade = _shade(Lc_light, core, *fill["shade"])[..., None]
                    col = np.clip(hexrgb(fill["colour"]) * shade, 0, 1)
                    fa = (fill["opacity"] * floor)[..., None]
                    Cf = col * fa + C * (1 - fa)
                    keep = fa[..., 0]                            # what the fills cover: never thinner than this
                    for band, spec in ((shd, WALL[v]["shade"]), (lit, WALL[v]["lit"])):
                        if spec is not None:
                            ba = (spec[1] * band)[..., None]
                            Cf = hexrgb(spec[0]) * ba + Cf * (1 - ba)
                            keep = 1 - (1 - keep) * (1 - ba[..., 0])
                    c, a = _unblend(Cf, P, keep)
                    a = np.where(a < 2.0 / 255, 0, a) * np.maximum(reach, np.clip(keep, 0, 1))
                    rgba = np.concatenate([c, a[..., None]], -1)
                    rgba = (np.clip(rgba, 0, 1) * 255 + 0.5).astype(np.uint8)
                    base = os.path.join(root, v, str(size), f"{s}@{k}x.png")
                    _save_q(rgba, base)
                    # the lip: where the carve is brighter than the cloud
                    Lp, Lf = _lum(P), _lum(Cf)
                    la = np.clip((Lf - Lp) / np.maximum(1 - Lp, 1e-3), 0, 1) * reach
                    lip = np.zeros(la.shape + (4,), np.uint8)
                    lip[..., :3] = (hexrgb(LIP) * 255 + 0.5).astype(np.uint8)
                    lip[..., 3] = (la * 255 + 0.5).astype(np.uint8)
                    _save_q(lip, os.path.join(root, v, str(size), f"{s}-lip@{k}x.png"))
                    # contrast on the master's own composite (etch.test.ts re-measures on the shipped sprites):
                    # the floor against the cloud around it (the cloud blurred at half a cap height, what the
                    # eye reads the letter against), and against the very pixel under it (strict)
                    out_c = _over_page(rgba, P)
                    lo_, ln_ = _lum(out_c), _lum(P)
                    sur = _blur(ln_, sigma)
                    m = core > 0.5
                    if m.any():
                        rt = (np.maximum(lo_, sur) + 0.05) / (np.minimum(lo_, sur) + 0.05)
                        st = (np.maximum(lo_, ln_) + 0.05) / (np.minimum(lo_, ln_) + 0.05)
                        manifest["contrast"].setdefault(s, {})[f"{v}/{size}@{k}x"] = [round(float(rt[m].min()), 2), round(float(st[m].min()), 2)]
                fm = (core * 255).astype(np.uint8)
                from PIL import Image
                os.makedirs(os.path.join(root, str(size)), exist_ok=True)
                Image.fromarray(fm, "L").save(os.path.join(root, str(size), f"{s}-floor@{k}x.png"), optimize=True)
        print("imprint", s, manifest["contrast"][s], flush=True)
    mp = os.path.join(root, "labels.json")
    if only and os.path.exists(mp):
        old = json.load(open(mp))
        old["labels"].update(manifest["labels"]); old["contrast"].update(manifest["contrast"])
        manifest = old
    with open(mp, "w") as fh:
        json.dump(manifest, fh, indent=1)
    contact(out, manifest)


def contact(out, manifest):
    """Every imprint over the rest sprite, light on the sky and dark on ink, at
    640 @2x, one row per label; the 440 @2x crop beside it at the phone's size."""
    from PIL import Image
    root = os.path.join(out, "labels")
    rows = []
    for s in manifest["labels"]:
        tiles = []
        for v in ("light", "dark"):
            page = SKY if v == "light" else INK
            bg = Image.new("RGBA", (1280, 512), tuple(int(x * 255 + 0.5) for x in hexrgb(page)) + (255,))
            bg.alpha_composite(Image.open(os.path.join(out, "button", v, "640", "shadow-rest@2x.png")).convert("RGBA"))
            bg.alpha_composite(Image.open(os.path.join(out, "button", v, "640", "rest@2x.png")).convert("RGBA"))
            r = manifest["sizes"]["640"]["@2x"]["rect"]
            bg.alpha_composite(Image.open(os.path.join(root, v, "640", f"{s}@2x.png")).convert("RGBA"), (r["x"], r["y"]))
            tiles.append(bg.crop((160, 160, 1120, 448)))
        rows.append(tiles)
    tw, th, pad = 960, 288, 8
    sheet = Image.new("RGB", (2 * tw + 3 * pad, len(rows) * (th + pad) + pad), (236, 241, 250))
    for i, tiles in enumerate(rows):
        for j, t in enumerate(tiles):
            sheet.paste(t.convert("RGB"), (pad + j * (tw + pad), pad + i * (th + pad)))
    sheet.save(os.path.join(root, "contact.png"), optimize=True)
    print("contact", sheet.size, flush=True)


IQ = None
if __name__ == "__main__":
    work, what = sys.argv[1], sys.argv[2]
    only = []
    width = 1280
    for a in sys.argv[3:]:
        if a.startswith("--labels="):
            only = a.split("=", 1)[1].split(",")
        if a.startswith("--width="):
            width = int(a.split("=", 1)[1])
    if what == "masks":
        masks(work)
    elif what == "render":
        render(work, int(sys.argv[3]), int(sys.argv[4]), only)
    elif what == "post":
        try:
            if os.environ.get("IMAGEQUANT_PATH"):
                sys.path.insert(0, os.environ["IMAGEQUANT_PATH"])
            import imagequant as IQ  # noqa: N811
        except ImportError:
            IQ = None
        t = time.time()
        post(work, sys.argv[3], width, only)
        print(f"post labels {time.time() - t:.1f} s", flush=True)
