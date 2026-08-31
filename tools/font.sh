#!/usr/bin/env bash
# JetBrains Mono'yu yeniden indirir (kendi sunucumuzda barındırıyoruz).
# Google Fonts sadece KAYNAK olarak kullanılır; ziyaretçi oraya hiç istek atmaz.
#   bash tools/font.sh
set -euo pipefail
cd "$(dirname "$0")/.."
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'
curl -sS -A "$UA" \
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap' \
  -o /tmp/jbm.css
python3 - <<'PY'
import re, pathlib, urllib.request
css = pathlib.Path("/tmp/jbm.css").read_text()
out = pathlib.Path("themes/geo/assets/fonts"); out.mkdir(parents=True, exist_ok=True)
for alt, govde in re.findall(r"/\* ([a-z-]+) \*/\s*@font-face \{(.*?)\}", css, re.S):
    if alt not in {"latin", "latin-ext"}: continue
    w = re.search(r"font-weight:\s*(\d+)", govde).group(1)
    u = re.search(r"url\((https://[^)]+\.woff2)\)", govde).group(1)
    p = out / f"jetbrains-mono-{w}-{alt}.woff2"
    p.write_bytes(urllib.request.urlopen(u).read())
    print(f"  {p.name}  {p.stat().st_size/1024:.1f} KB")
print("\nNOT: unicode-range değiştiyse theme.css'teki @font-face bloklarını güncelle.")
PY
