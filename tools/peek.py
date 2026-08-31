#!/usr/bin/env python3
"""Kimlik kartının kenarından bakan figürü üretir.

Kaynak görselden karakteri kesip alfa kanallı PNG çıkarır:
    python3 tools/peek.py                       # varsayılan: content/bg/bg-13.jpg
    python3 tools/peek.py --src content/bg/x.jpg --out themes/geo/assets/peek.png

Yöntem: karakteri saç renginden bul → dar kırp → kenarlardan flood fill ile
zemini boşalt → küçük adacıkları at. Anime çizimlerinin siyah konturları
flood fill'i durdurduğu için karakter bozulmadan kalır.
"""
import argparse, itertools, pathlib, sys
from collections import deque, Counter

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("Pillow gerekli:  pip install --user Pillow")

ROOT = pathlib.Path(__file__).resolve().parent.parent
KEY = (255, 0, 255)          # flood fill işareti
GENISLIK = 380               # çıktı genişliği (ekranda ~170px, 2× için)

# Saç rengi kuralı: gökyüzü de mavi, ayrım b kanalı ve mavi-baskınlıkta.
#   gök  ≈ (32,112,240) → b 240, b-g 128     saç ≈ (96,144,208) → b 208, b-g 64
def sac_mi(c):
    r, g, b = c
    return 170 < b < 234 and 35 < b - g < 85 and b - r > 70


def bilesenler(op, w, h):
    lbl = [[-1] * h for _ in range(w)]
    boy = []
    for sx, sy in itertools.product(range(w), range(h)):
        if not op[sx][sy] or lbl[sx][sy] >= 0:
            continue
        i = len(boy); q = deque([(sx, sy)]); lbl[sx][sy] = i; n = 0
        while q:
            x, y = q.popleft(); n += 1
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and op[nx][ny] and lbl[nx][ny] < 0:
                    lbl[nx][ny] = i; q.append((nx, ny))
        boy.append(n)
    return lbl, boy


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default="content/bg/bg-13.jpg")
    ap.add_argument("--out", default="themes/geo/assets/peek.png")
    a = ap.parse_args()

    src = ROOT / a.src
    im0 = Image.open(src).convert("RGB")
    W, H = im0.size
    p = im0.load()

    # 1) karakteri saç renginden bul, seyrek yanlış eşleşmeleri ele
    pts = [(x, y) for x, y in itertools.product(range(W), range(H)) if sac_mi(p[x, y])]
    if not pts:
        sys.exit("Saç rengi bulunamadı — sac_mi() kuralını bu görsele göre ayarla.")
    cx, cy = Counter(q[0] for q in pts), Counter(q[1] for q in pts)
    xs = [x for x, n in cx.items() if n > 12]
    ys = [y for y, n in cy.items() if n > 12]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)

    # 2) elleri ve çeneyi de alacak şekilde genişletip kırp
    pad = int((x1 - x0) * 0.18)
    im = im0.crop((max(0, x0 - pad), max(0, y0 - 8),
                   min(W, x1 + pad), min(H, y1 + int((y1 - y0) * 0.55))))
    w, h = im.size

    # 3) kenarlardan flood fill — zemini boşalt
    kenar = ([(x, 1) for x in range(1, w - 1, 3)] + [(x, h - 2) for x in range(1, w - 1, 3)] +
             [(1, y) for y in range(1, h - 1, 3)] + [(w - 2, y) for y in range(1, h - 1, 3)])
    for s in kenar:
        if im.getpixel(s) != KEY:
            ImageDraw.floodfill(im, s, KEY, thresh=70)

    # 4) küçük adacıkları at
    px = im.load()
    op = [[px[x, y] != KEY for y in range(h)] for x in range(w)]
    lbl, boy = bilesenler(op, w, h)
    tut = {i for i, n in enumerate(boy) if n >= 500}

    out = im.convert("RGBA")
    o = out.load()
    for x, y in itertools.product(range(w), range(h)):
        r, g, b, _ = o[x, y]
        gok = b > 234 and b >= r              # gök/bulut mavi baskın; ten (240,208,192) değil
        cim = g > r + 25 and g > b + 25       # çimen
        if not op[x][y] or lbl[x][y] not in tut or gok or cim:
            o[x, y] = (0, 0, 0, 0)
            op[x][y] = False

    # aşındır: yumuşatma pikselleriyle yapışmış gök artıklarının bağını kopar
    for _ in range(1):
        yeni = [row[:] for row in op]
        for x, y in itertools.product(range(w), range(h)):
            if op[x][y] and any(not op[nx][ny]
                                for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1))
                                if 0 <= nx < w and 0 <= ny < h):
                yeni[x][y] = False
        op = yeni

    # bağ koptu, artık ayrı duran artıkları ele
    lbl, boy = bilesenler(op, w, h)
    tut = {i for i, n in enumerate(boy) if n >= 600}
    for x, y in itertools.product(range(w), range(h)):
        if not op[x][y] or lbl[x][y] not in tut:
            o[x, y] = (0, 0, 0, 0)

    out = out.crop(out.getbbox())
    oran = GENISLIK / out.width
    out = out.resize((GENISLIK, round(out.height * oran)), Image.LANCZOS)

    dst = ROOT / a.out
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst, optimize=True)
    print(f"  {dst.relative_to(ROOT)}  {out.width}x{out.height}  {dst.stat().st_size/1024:.0f} KB")


if __name__ == "__main__":
    main()
