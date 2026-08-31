# reverx99.github.io

Bağımlılıksız statik site üreteci + tema. `node build.mjs` çalışır, `docs/` üretir,
GitHub Pages onu yayınlar. Derleme için Node dışında hiçbir şey gerekmez;
`npm install` yok, `node_modules` yok.

## Kullanım

    npm run build      # docs/ üret
    npm run serve      # üret + http://127.0.0.1:8099
    npm run dev        # content/ ve themes/ değiştikçe yeniden üret
    npm test           # 109 denetim (yapı, bağlantı, gizlilik, erişilebilirlik)

## Düzen

    content/            yazdığın her şey
      site.json         başlık, menü, sosyal hesaplar, palet
      pages/home.md     ana sayfa metni
      posts/*.md        günlük yazıları  (YYYY-AA-GG-slug.md)
      media/<slug>/     yazının fotoğrafları
      projects.json     öne çıkan repolar + kendi açıklamaların
      quotes.json       fortune sözleri
      bg/               arkaplan mozaiğinin ham görselleri
    themes/geo/         şablonlar (templates.mjs) + varlıklar
    lib/                markdown, frontmatter, GitHub repo çekici
    tools/              bg.py · peek.py · font.sh · test.mjs
    docs/               ÜRETİLMİŞ ÇIKTI — elle düzenleme, her build'de silinir

## Yazı eklemek

`content/posts/2026-06-01-baslik.md` oluştur:

    ---
    title: Başlık
    date: 2026-06-01
    tags: [düşünce]
    photos: [01.jpg]
    en: İngilizce karşılığı (isteğe bağlı)
    ---
    Metin.

Fotoğrafları `content/media/baslik/` içine koy. Diskte olmayan fotoğraf
basılmaz, build uyarı verir.

## Araçlar

    python3 tools/bg.py --all    # content/bg/ → duotone mozaik karosu + og kartı
    python3 tools/peek.py        # kimlik kartındaki figürü kes (alfa kanallı)
    bash tools/font.sh           # JetBrains Mono'yu yeniden indir

Arkaplan paletini değiştirmek: `site.json` içindeki `"palette"` → `bsod` / `yesil` / `mor`.

## Notlar

- Ziyaretçiye giden **dış istek yoktur**: font, ikon, görsel hepsi kendi sunucumuzda.
- Repo listesi **build anında** çekilir, HTML'e gömülür. Ağ yoksa `.cache/` devreye girer.
- JavaScript kapalıyken site tam çalışır; sürükleme, böcekler ve rastgele söz ek süstür.
