# Contact sheet: every sprite on the sky (#F2F6FF), the dark ones on ink (#1C2436), and the 440 rest and
# pressed with a sample label in upright spaced capitals. Usage: python3 contact.py assets/cloud-button
import sys, os
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1].rstrip('/') + '/'
SKY, INK, LABEL = (242, 246, 255, 255), (28, 36, 54, 255), (28, 36, 54, 255)
def font(px):
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf']:
        if os.path.exists(f): return ImageFont.truetype(f, px)
    return ImageFont.load_default()
def comp(cloud, shadow, bg, m):
    sh = Image.open(shadow).convert('RGBA'); cl = Image.open(cloud).convert('RGBA')
    c = Image.new('RGBA', sh.size, bg); c.alpha_composite(sh); c.alpha_composite(cl, (m, m)); return c
def label(img, text, m, cw, ch, color, px):
    dr = ImageDraw.Draw(img); f = font(px); track = px * 0.24
    widths = [dr.textlength(ch_, font=f) for ch_ in text]; tw = sum(widths) + track * (len(text) - 1)
    x = m + (cw - tw) / 2; y = m + ch * 0.5 - px * 0.62
    for ch_, wd in zip(text, widths): dr.text((x, y), ch_, font=f, fill=color); x += wd + track
tiles = []
for W in (320, 440, 640):
    for s in (1, 2):
        m = 40 * s
        for st in ('rest', 'pressed'):
            t = comp(f'{d}{W}/{st}@{s}x.png', f'{d}{W}/shadow-{st}@{s}x.png', SKY, m)
            if W == 440 and s == 2: label(t, 'LET A CAR GO', m, 440 * s, 96 * s, LABEL, 15 * s)
            tiles.append(t)
        t = comp(f'{d}{W}/dark@{s}x.png', f'{d}{W}/dark-shadow@{s}x.png', INK, m)
        if W == 440 and s == 2: label(t, 'LET A CAR GO', m, 440 * s, 96 * s, (242, 246, 255, 255), 15 * s)
        tiles.append(t)
hm = round(40 * 1600 / 384)
for st in ('rest', 'pressed'):
    t = comp(f'{d}hero/{st}.png', f'{d}hero/shadow-{st}.png', SKY, hm)
    label(t, 'GET EARLY ACCESS', hm, 1600, 400, LABEL, 46); tiles.append(t)
# layout: one column, scaled to a common width so the sheet stays readable
CW = 1440; G = 24; rows = []
for t in tiles:
    if t.width > CW: t = t.resize((CW, round(t.height * CW / t.width)), Image.LANCZOS)
    rows.append(t)
H = sum(r.height for r in rows) + G * (len(rows) + 1)
sheet = Image.new('RGBA', (CW + 2 * G, H), SKY); y = G
for r in rows:
    if r.getpixel((0, 0))[:3] == INK[:3]: sheet.paste(Image.new('RGBA', (CW + 2 * G, r.height + G), INK), (0, y - G // 2))
    sheet.alpha_composite(r, (G + (CW - r.width) // 2, y)); y += r.height + G
sheet.convert('RGB').save(d + 'contact.png', optimize=True)
print('contact.png', sheet.size)
