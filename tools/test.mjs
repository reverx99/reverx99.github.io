// Site denetimi.  node tools/test.mjs
// docs/ altındaki üretilmiş siteyi baştan aşağı kontrol eder.
import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DOCS = path.join(ROOT, "docs");

let gecti = 0, kaldi = 0;
const T = (ad, kosul, detay = "") => {
  if (kosul) { gecti++; console.log(`  ✓ ${ad}`); }
  else { kaldi++; console.log(`  ✗ ${ad}${detay ? `  → ${detay}` : ""}`); }
};
const baslik = (s) => console.log(`\n\x1b[1m${s}\x1b[0m`);

// ── dosyaları topla ─────────────────────────────────────────────
async function yuru(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    e.isDirectory() ? await yuru(p, out) : out.push(p);
  }
  return out;
}
const dosyalar = await yuru(DOCS);
const rel = (p) => "/" + path.relative(DOCS, p).split(path.sep).join("/");
const varOlan = new Set(dosyalar.map(rel));
for (const p of dosyalar) if (path.basename(p) === "index.html") {
  const r = rel(p).replace(/index\.html$/, "");
  varOlan.add(r); varOlan.add(r.replace(/\/$/, "") || "/");
}
const sayfalar = dosyalar.filter((p) => p.endsWith(".html"));
const icerik = new Map();
for (const p of sayfalar) icerik.set(p, await readFile(p, "utf8"));

// ── 1. yapı ─────────────────────────────────────────────────────
baslik("1. Yapı");
for (const beklenen of ["/index.html", "/projeler/index.html", "/gunluk/index.html",
                        "/gunluk/varolus/index.html", "/fortune/index.html", "/404.html",
                        "/rss.xml", "/sitemap.xml", "/robots.txt", "/.nojekyll"]) {
  T(`${beklenen} üretildi`, varOlan.has(beklenen));
}

// ── 2. her sayfanın head'i ──────────────────────────────────────
baslik("2. Sayfa başlıkları ve meta");
for (const [p, h] of icerik) {
  const ad = rel(p);
  const t = h.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
  T(`${ad} — <title> dolu`, t.trim().length > 3, t);
  T(`${ad} — lang="tr"`, /<html lang="tr">/.test(h));
  T(`${ad} — tek <h1>`, (h.match(/<h1/g) || []).length === 1,
    `${(h.match(/<h1/g) || []).length} adet`);
  T(`${ad} — meta description`, /<meta name="description" content="[^"]{10,}"/.test(h));
  T(`${ad} — canonical`, /<link rel="canonical"/.test(h));
  T(`${ad} — og:title + og:image`, /og:title/.test(h) && /og:image/.test(h));
  T(`${ad} — charset ilk 1024 baytta`, h.slice(0, 1024).includes('charset="utf-8"'));
}

// ── 3. bağlantılar, çapalar, kaynaklar ──────────────────────────
baslik("3. Bağlantılar / çapalar / kaynaklar");
let kirik = [];
for (const [p, h] of icerik) {
  for (const m of h.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    const [yol, capa] = m[1].split("#");
    const hedef = yol || "/";
    if (!varOlan.has(hedef)) { kirik.push(`${rel(p)} → ${m[1]}`); continue; }
    if (capa) {
      const dosya = hedef.endsWith("/") ? path.join(DOCS, hedef, "index.html")
                                        : path.join(DOCS, hedef);
      if (existsSync(dosya) && !(await readFile(dosya, "utf8")).includes(`id="${capa}"`))
        kirik.push(`${rel(p)} → ${m[1]} (çapa yok)`);
    }
  }
}
T("kırık iç bağlantı/çapa/kaynak yok", kirik.length === 0, kirik.join("; "));

// ── 4. dış bağımlılık ───────────────────────────────────────────
baslik("4. Dış bağımlılık (gizlilik)");
const izinli = /^https:\/\/(github\.com|instagram\.com|reverx99\.github\.io)/;
const disKaynak = new Set();
for (const [, h] of icerik)
  for (const m of h.matchAll(/(?:href|src)="(https?:\/\/[^"]+)"/g))
    if (!izinli.test(m[1])) disKaynak.add(m[1]);
const css = await readFile(path.join(DOCS, "assets/theme.css"), "utf8");
for (const m of css.matchAll(/url\((https?:\/\/[^)]+)\)/g)) disKaynak.add(m[1]);
T("HTML/CSS'te üçüncü taraf kaynak yok", disKaynak.size === 0, [...disKaynak].join(", "));
T("Google Fonts bağlantısı yok", !/fonts\.(googleapis|gstatic)/.test(css + [...icerik.values()].join("")));

// ── 5. JavaScript kapalıyken ────────────────────────────────────
baslik("5. JavaScript kapalıyken");
const ana = icerik.get(path.join(DOCS, "index.html"));
T("ana sayfada söz HTML'de basılı", /class="soz-en"/.test(ana));
T("günlük listesi HTML'de basılı", /Varolmak ve zorlamak/.test(ana));
const proj = icerik.get(path.join(DOCS, "projeler/index.html"));
T("repo listesi HTML'de basılı (API çağrısı yok)", (proj.match(/class="item-name"/g) || []).length >= 9);
T("hiçbir sayfada runtime fetch yok", ![...icerik.values()].some((h) => /fetch\(/.test(h)));

// ── 6. besleme ve site haritası ─────────────────────────────────
baslik("6. RSS / sitemap / robots");
const rss = await readFile(path.join(DOCS, "rss.xml"), "utf8");
T("rss.xml XML bildirimiyle başlıyor", rss.startsWith('<?xml version="1.0"'));
T("rss.xml dengeli etiketler", (rss.match(/<item>/g) || []).length === (rss.match(/<\/item>/g) || []).length);
T("rss.xml yazı içeriyor", /<item>/.test(rss));
T("rss.xml kaçırılmamış & yok", !/&(?!amp;|lt;|gt;|quot;|apos;|#)/.test(rss));
const sm = await readFile(path.join(DOCS, "sitemap.xml"), "utf8");
const smUrl = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
T("sitemap 5 URL içeriyor", smUrl.length === 5, `${smUrl.length}`);
T("sitemap'teki her URL üretilmiş", smUrl.every((u) => varOlan.has(new URL(u).pathname)));
T("sitemap 404'ü listelemiyor", !smUrl.some((u) => u.includes("404")));
const rob = await readFile(path.join(DOCS, "robots.txt"), "utf8");
T("robots.txt sitemap'e işaret ediyor", rob.includes("sitemap.xml"));

// ── 7. varlıklar ────────────────────────────────────────────────
baslik("7. Varlıklar");
for (const a of ["/assets/theme.css", "/assets/win.js", "/assets/bg-bsod.jpg",
                 "/assets/peek.png", "/assets/og.jpg", "/assets/favicon.svg", "/assets/favicon-32.png"]) {
  T(`${a} var`, varOlan.has(a));
}
const fontlar = dosyalar.filter((p) => p.endsWith(".woff2"));
T("6 woff2 (latin + latin-ext × 3 ağırlık)", fontlar.length === 6, `${fontlar.length}`);
T("@font-face sayısı font dosyası sayısıyla eşleşiyor",
  (css.match(/@font-face/g) || []).length === fontlar.length);
for (const f of fontlar) T(`${rel(f)} CSS'te referanslı`, css.includes(rel(f)));

let toplam = 0;
for (const p of dosyalar) toplam += (await stat(p)).size;
T(`toplam boyut < 1 MB (${Math.round(toplam / 1024)} KB)`, toplam < 1024 * 1024);
const peek = (await stat(path.join(DOCS, "assets/peek.png"))).size;
T(`peek.png < 100 KB (${Math.round(peek / 1024)} KB)`, peek < 100 * 1024);

// ── 8. erişilebilirlik ──────────────────────────────────────────
baslik("8. Erişilebilirlik");
for (const [p, h] of icerik) {
  const ad = rel(p);
  const imgsiz = (h.match(/<img(?![^>]*\balt=)[^>]*>/g) || []).length;
  T(`${ad} — her <img> alt taşıyor`, imgsiz === 0, `${imgsiz} eksik`);
  T(`${ad} — içeriğe geç bağlantısı`, /class="skip"/.test(h));
  T(`${ad} — <main id="ana">`, /<main id="ana">/.test(h));
}
T("odak halkası tanımlı", /:focus-visible/.test(css));
T("prefers-reduced-motion desteği", /prefers-reduced-motion/.test(css));
T("böcekler hareket kısıtına saygılı",
  (await readFile(path.join(DOCS, "assets/win.js"), "utf8")).includes("prefers-reduced-motion"));

// ── 9. içerik bütünlüğü ─────────────────────────────────────────
baslik("9. İçerik");
const sozler = JSON.parse(await readFile(path.join(ROOT, "content/quotes.json"), "utf8")).sozler;
T("her sözün 'en' ve 'kim' alanı dolu", sozler.every((q) => q.en?.trim() && q.kim?.trim()));
T("söz sayısı ≥ 10", sozler.length >= 10, `${sozler.length}`);
const yazi = icerik.get(path.join(DOCS, "gunluk/varolus/index.html"));
T("yazıda kırık görsel yok (olmayan foto basılmıyor)", !/<img[^>]*\/media\//.test(yazi));
// Cihaz parmak izi sızmasın: dağıtım/çekirdek/masaüstü/terminal adları.
// Liste bilinçli olarak genel — kişiye bağlanabilecek hiçbir şey içermez.
// Pencere yöneticisi adları KASITLI olarak dışarıda: repo adlarında geçiyorlar
// (my-i3wm-config, dotfiles) — onlar proje, cihaz bilgisi değil.
const PARMAK_IZI = /\.fc\d+|x86_64|linux-gnu|\bWayland\b|\bXorg\b|neofetch|fastfetch|screenfetch|uname\s|\bkernel\b/i;
T("cihaz parmak izi yok", ![...icerik.values()].some((h) => PARMAK_IZI.test(h)));

// ── sonuç ───────────────────────────────────────────────────────
console.log(`\n${"─".repeat(52)}`);
console.log(kaldi === 0
  ? `\x1b[32mTÜMÜ GEÇTİ\x1b[0m — ${gecti} test`
  : `\x1b[31m${kaldi} TEST KALDI\x1b[0m — ${gecti} geçti`);
process.exit(kaldi === 0 ? 0 : 1);
