// Bağımlılıksız statik site üreteci — TÜM siteyi üretir.
//   node build.mjs        →  ./docs  (GitHub Pages buradan yayınlar)
//
// Kaynaklar content/ + themes/ altında; docs/ tamamen üretilmiş çıktıdır,
// elle düzenlenmez. Her build'de sıfırdan yazılır.
import { readFile, readdir, mkdir, rm, cp, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { markdown } from "./lib/markdown.mjs";
import { parseFrontmatter } from "./lib/frontmatter.mjs";
import { loadRepos, formatDate } from "./lib/repos.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.join(root, "content");
const OUT = path.join(root, "docs");

const readJSON = async (p) => JSON.parse(await readFile(p, "utf8"));
const xml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function write(rel, body) {
  const file = path.join(OUT, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
  return rel;
}

console.log("→ build");

const site = await readJSON(path.join(CONTENT, "site.json"));
const projectCfg = await readJSON(path.join(CONTENT, "projects.json"));
const quotes = (await readJSON(path.join(CONTENT, "quotes.json"))).sozler || [];
const T = await import(pathToFileURL(path.join(root, "themes", site.theme, "templates.mjs")).href);

// ── içerik ──────────────────────────────────────────────────────
async function loadPage(name) {
  const raw = await readFile(path.join(CONTENT, "pages", `${name}.md`), "utf8");
  const { data, body } = parseFrontmatter(raw);
  return { ...data, slug: name, html: markdown(body) };
}

const postsDir = path.join(CONTENT, "posts");
const files = existsSync(postsDir) ? (await readdir(postsDir)).filter((f) => f.endsWith(".md")) : [];
const posts = [];
for (const f of files) {
  const { data, body } = parseFrontmatter(await readFile(path.join(postsDir, f), "utf8"));
  const m = f.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
  const slug = data.slug || (m ? m[2] : f.replace(/\.md$/, ""));
  const dateISO = data.date || (m ? m[1] : "");
  // Frontmatter'da yazan ama diskte olmayan fotoğrafı basma —
  // aksi halde sayfada kırık <img> ve açıklanamayan boşluk kalıyor.
  const istenen = data.photos || [];
  const foto = istenen.filter((f) => existsSync(path.join(CONTENT, "media", slug, f)));
  if (foto.length < istenen.length) {
    const eksik = istenen.filter((f) => !foto.includes(f));
    console.log(`  ! ${slug}: bulunamayan foto atlandı → ${eksik.join(", ")}`);
  }
  posts.push({
    slug, dateISO,
    dateText: formatDate(dateISO),
    title: data.title || slug,
    place: data.place || "",
    tags: data.tags || [],
    photos: foto,
    en: data.en || "",
    html: markdown(body),
    excerpt: body.trim().replace(/\s+/g, " ").slice(0, 155),
    url: `/gunluk/${slug}/`,
  });
}
posts.sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));

const { featured, rest } = await loadRepos(root, site, projectCfg);
const home = await loadPage("home");
// JS kapalıysa da bir söz görünsün: build anında biri seçilip basılır
const soz = quotes.length ? T.fortune(quotes, quotes[Math.floor(Math.random() * quotes.length)]) : "";

// ── çıktı ───────────────────────────────────────────────────────
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await cp(path.join(root, "themes", site.theme, "assets"), path.join(OUT, "assets"), { recursive: true });

const media = path.join(CONTENT, "media");
if (existsSync(media)) await cp(media, path.join(OUT, "media"), { recursive: true });

// seçilen palet dışındaki mozaikleri çıktıya taşıma
for (const p of ["bsod", "yesil", "mor"]) {
  if (p !== site.palette) await rm(path.join(OUT, "assets", `bg-${p}.jpg`), { force: true });
}
if (site.palette !== "bsod") {
  const css = path.join(OUT, "assets", "theme.css");
  await writeFile(css, (await readFile(css, "utf8")).replace("bg-bsod.jpg", `bg-${site.palette}.jpg`));
}

const pages = [
  ["index.html", "/", site.title, site.description,
    T.homeBody({ site, page: home, posts, soz })],
  ["projeler/index.html", "/projeler/", `Projeler · ${site.title}`,
    "Yazdığım araçlar ve projeler — Linux, kabuk betikleri, Python.",
    T.projectsBody({ site, featured, rest })],
  ["fortune/index.html", "/fortune/", `fortune · ${site.title}`,
    "Bilgisayar kültüründen kült sözler — Ritchie, Torvalds, Dijkstra, Terry Davis.",
    T.fortuneBody({ site, sozler: quotes, kart: T.fortune(quotes, quotes[Math.floor(Math.random() * quotes.length)]) })],
  ["gunluk/index.html", "/gunluk/", `Günlük · ${site.title}`,
    "Günlük — aklımdan geçenler.",
    T.journalBody({ site, posts })],
  ["404.html", "/404.html", `Sayfa bulunamadı · ${site.title}`, "", T.notFoundBody({ site })],
];

for (const [file, p, title, description, main] of pages) {
  await write(file, T.layout({ site, title, description, main, path: p }));
}

for (const post of posts) {
  await write(`gunluk/${post.slug}/index.html`, T.layout({
    site, title: `${post.title} · Günlük`, description: post.excerpt,
    path: post.url, main: T.postBody({ site, post }),
  }));
}

// ── besleme, site haritası, robots ──────────────────────────────
const items = posts.map((p) =>
  `\n    <item><title>${xml(p.title)}</title><link>${site.url}${p.url}</link>` +
  `<guid isPermaLink="true">${site.url}${p.url}</guid>` +
  `<pubDate>${p.dateISO ? new Date(p.dateISO).toUTCString() : ""}</pubDate>` +
  `<description>${xml(p.excerpt)}</description></item>`).join("");
await write("rss.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>` +
  `<title>${xml(site.title)} — günlük</title><link>${site.url}/gunluk/</link>` +
  `<description>${xml(site.description)}</description><language>tr</language>${items}\n  </channel></rss>\n`);

const urls = [...pages.filter(([f]) => f !== "404.html").map(([, p]) => p), ...posts.map((p) => p.url)];
await write("sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
  urls.map((u) => `\n  <url><loc>${site.url}${u}</loc></url>`).join("") + `\n</urlset>\n`);

await write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);
await write(".nojekyll", "");


console.log(`✓ ${pages.length} sayfa · ${posts.length} yazı · ${quotes.length} söz · ${featured.length + rest.length} repo  →  docs/`);
