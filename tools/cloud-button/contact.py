# Contact sheet for review: the 440 rest, pressed and dark sprites with "LET A CAR GO", the hero with
# "GET ON THE LANE", each on the sky (#F2F6FF) and the ink lane (#1C2436), plus 320 and 640 unlabelled.
# Usage: python3 tools/cloud-button/contact.py   (writes assets/cloud-button/contact.png)
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
D = os.path.join(ROOT, 'assets', 'cloud-button') + '/'
SKY, INK = (242, 246, 255, 255), (28, 36, 54, 255)
LABEL = (28, 36, 54, 255)          # ink on every cloud: the ice cloud is light, so ice text would not read
M = 40                             # shadow margin, CSS px


def font(px):
    for f in ('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
              '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, px)
    return ImageFont.load_default()


def tile(size, state, s, bg):
    shadow = {'rest': 'shadow-rest', 'pressed': 'shadow-pressed', 'dark': 'dark-shadow'}[state]
    sh = Image.open(f'{D}{size}/{shadow}@{s}x.png').convert('RGBA')
    cl = Image.open(f'{D}{size}/{state}@{s}x.png').convert('RGBA')
    t = Image.new('RGBA', (sh.width + 40 * s, sh.height), bg)
    t.alpha_composite(sh, (20 * s, 0)); t.alpha_composite(cl, (20 * s + M * s, M * s))
    return t, (20 * s + M * s, M * s, cl.width, cl.height)


def label(img, box, text, px):
    """Upright spaced capitals, centred on x 50 percent and y 62.5 percent of the sprite (the middle of the
    label band y 40 to 85 percent)."""
    x0, y0, w, h = box
    dr = ImageDraw.Draw(img); f = font(px); track = px * 0.24
    widths = [dr.textlength(c, font=f) for c in text]
    tw = sum(widths) + track * (len(text) - 1)
    asc, desc = f.getmetrics(); cap = f.getbbox('H')
    x = x0 + (w - tw) / 2
    y = y0 + h * 0.625 - (cap[3] + cap[1]) / 2
    for c, wd in zip(text, widths):
        dr.text((x, y), c, font=f, fill=LABEL); x += wd + track


rows = []
for bg in (SKY, INK):
    row = []
    for st in ('rest', 'pressed', 'dark'):
        t, b = tile('440', st, 2, bg); label(t, b, 'LET A CAR GO', 30); row.append(t)
    rows.append(row)
for bg, st in ((SKY, 'rest'), (INK, 'dark')):
    t, b = tile('hero', st, 1, bg); label(t, b, 'GET ON THE LANE', 54); rows.append([t])
for bg in (SKY, INK):
    rows.append([tile('320', st, 2, bg)[0] for st in ('rest', 'pressed', 'dark')])
    rows.append([tile('640', st, 2, bg)[0] for st in ('rest', 'pressed')] if bg == SKY else
                [tile('640', 'dark', 2, bg)[0]])

G = 24
W = max(sum(t.width for t in r) + G * (len(r) + 1) for r in rows)
H = sum(max(t.height for t in r) for r in rows) + G * (len(rows) + 1)
sheet = Image.new('RGBA', (W, H), SKY); y = G
for r in rows:
    h = max(t.height for t in r)
    sheet.paste(Image.new('RGBA', (W, h + G), r[0].getpixel((0, 0))), (0, y - G // 2))
    x = (W - sum(t.width for t in r) - G * (len(r) - 1)) // 2
    for t in r: sheet.alpha_composite(t, (x, y)); x += t.width + G
    y += h + G
sheet.convert('RGB').save(D + 'contact.png', optimize=True)
print('contact.png', sheet.size, os.path.getsize(D + 'contact.png') // 1024, 'KB')
