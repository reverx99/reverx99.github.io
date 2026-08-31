#!/usr/bin/env python3
"""Arkaplan mozaiği üreteci.

content/bg/ içindeki görselleri tek bir duotone mozaik karosuna dönüştürür.
Karo kendi kendine döşenir (background-repeat), yani tarayıcı tek dosya indirir.

    python3 tools/bg.py              # varsayılan palet (bsod)
    python3 tools/bg.py --palette yesil
    python3 tools/bg.py --all        # her paleti üret

Havuza görsel eklemek için: content/bg/ içine at, komutu tekrar çalıştır.
"""
import argparse, pathlib, random, sys

try:
    from PIL import Image, ImageEnhance, ImageOps
except ImportError:
    sys.exit("Pillow gerekli:  pip install --user Pillow")

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "content" / "bg"
OUT = ROOT / "themes" / "geo" / "assets"

# Duotone paletleri: (gölge, ışık). Yeni ton eklemek için buraya bir satır.
PALETTES = {
    "bsod":  ((0x08, 0x0c, 0x30), (0x7f, 0x9a, 0xd0)),
    "yesil": ((0x03, 0x0c, 0x06), (0x6f, 0xe0, 0x92)),
    "mor":   ((0x16, 0x06, 0x2c), (0xc8, 0x8f, 0xe0)),
}

TILE = 200      # tek karenin kenarı (px)
COLS = 6        # mozaik ızgarası
DIM = 0.80      # arkaplana çekmek için parlaklık çarpanı
CONTRAST = 0.85 # düzleştirme — hiçbir kare göz almasın
SEED = 99       # sabit karışım: her çalıştırmada aynı dizilim


def duotone(im, lo, hi):
    g = ImageOps.autocontrast(im.convert("L"), cutoff=2)
    g = ImageEnhance.Contrast(g).enhance(CONTRAST)
    return ImageEnhance.Brightness(ImageOps.colorize(g, lo, hi)).enhance(DIM)


def build(name, lo, hi, images):
    rows = -(-len(images) // COLS)          # yukarı yuvarla, her görsel en az bir kez
    sheet = Image.new("RGB", (COLS * TILE, rows * TILE))
    cells = list(images)
    while len(cells) < COLS * rows:         # boş kalan gözleri doldur
        cells.append(random.choice(images))
    random.Random(SEED).shuffle(cells)

    for i, path in enumerate(cells):
        im = Image.open(path).convert("RGB")
        im = ImageOps.fit(im, (TILE, TILE), Image.LANCZOS)
        sheet.paste(duotone(im, lo, hi), ((i % COLS) * TILE, (i // COLS) * TILE))

    OUT.mkdir(parents=True, exist_ok=True)
    dst = OUT / f"bg-{name}.jpg"
    sheet.save(dst, quality=72, optimize=True, progressive=True)
    kb = dst.stat().st_size / 1024
    print(f"  {dst.relative_to(ROOT)}  {sheet.width}x{sheet.height}  {kb:.0f} KB")


def og(name, lo, hi, images):
    """Sosyal medya paylaşım kartı (1200x630): mozaik + üstünde pencere."""
    from PIL import ImageDraw, ImageFont
    W, H = 1200, 630
    cols = -(-W // TILE) + 1
    rows = -(-H // TILE) + 1
    card = Image.new("RGB", (cols * TILE, rows * TILE))
    cells = (images * ((cols * rows) // len(images) + 1))[: cols * rows]
    random.Random(SEED).shuffle(cells)
    for i, p in enumerate(cells):
        im = ImageOps.fit(Image.open(p).convert("RGB"), (TILE, TILE), Image.LANCZOS)
        card.paste(duotone(im, lo, hi), ((i % cols) * TILE, (i // cols) * TILE))
    card = card.crop((0, 0, W, H))

    def f(sz, mono=False):
        for p in ("/usr/share/fonts/jetbrains-mono-fonts/JetBrainsMono-ExtraBold.ttf",
                  "/usr/share/fonts/dejavu-sans-mono-fonts/DejaVuSansMono-Bold.ttf",
                  "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
                  "/usr/share/fonts/dejavu/DejaVuSansMono-Bold.ttf"):
            if pathlib.Path(p).exists():
                return ImageFont.truetype(p, sz)
        return ImageFont.load_default(sz)

    d = ImageDraw.Draw(card)
    px, py, pw, ph = 90, 150, W - 180, 330
    d.rectangle([px + 8, py + 8, px + pw + 8, py + ph + 8], fill=(8, 8, 24))
    d.rectangle([px, py, px + pw, py + ph], fill=(0xec, 0xea, 0xe2), outline=(0x16, 0x15, 0x1c), width=5)
    d.rectangle([px + 2, py + 2, px + pw - 2, py + 46], fill=(0x00, 0x00, 0xAA))
    d.text((px + 18, py + 12), "reverx99@github:~$", font=f(22), fill=(255, 255, 255))
    d.text((px + 34, py + 92), "reverx99", font=f(84), fill=(0x16, 0x15, 0x1c))
    d.text((px + 34, py + 205), "Linux · sistem araçları · terminalin dibi", font=f(26), fill=(0x00, 0x00, 0xAA))
    d.text((px + 34, py + 258), "reverx99.github.io", font=f(22), fill=(0x5b, 0x59, 0x67))

    OUT.mkdir(parents=True, exist_ok=True)
    dst = OUT / "og.jpg"
    card.save(dst, quality=82, optimize=True, progressive=True)
    print(f"  {dst.relative_to(ROOT)}  {W}x{H}  {dst.stat().st_size/1024:.0f} KB")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--palette", default="bsod", choices=sorted(PALETTES))
    ap.add_argument("--all", action="store_true")
    a = ap.parse_args()

    images = sorted(p for p in SRC.glob("*") if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
    if not images:
        sys.exit(f"{SRC.relative_to(ROOT)} boş — arkaplan görsellerini oraya koy.")

    print(f"{len(images)} görsel  →  {COLS} sütunluk mozaik")
    for name in (sorted(PALETTES) if a.all else [a.palette]):
        build(name, *PALETTES[name], images)
    og(a.palette, *PALETTES[a.palette], images)


if __name__ == "__main__":
    main()
