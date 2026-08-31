// Tema: geo — 90'lar ruhu, modern iskelet.
// Her sayfa "pencere" panellerinden kurulur; arkada döşeli duotone mozaik durur.

export function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}


/* Satır içi SVG — dış istek yok, currentColor'ı izler. */
const IKON = {
  github: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="5.4"/><circle cx="12" cy="12" r="4.3"/><circle cx="17.6" cy="6.4" r="1.3" fill="currentColor" stroke="none"/></svg>`,
  rss: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M4.5 11.5a8 8 0 0 1 8 8M4.5 4.5a15 15 0 0 1 15 15"/><circle cx="5.2" cy="18.8" r="1.8" fill="currentColor" stroke="none"/></svg>`,
};

function sosyal(site) {
  return (site.social || []).map((h) => {
    const dis = !h.url.startsWith("/");
    return `<a href="${esc(h.url)}"${dis ? ' target="_blank" rel="me noopener"' : ""}>` +
      `${IKON[h.ag] || ""}<span>${esc(h.etiket)}</span></a>`;
  }).join("");
}

/** Pencere paneli: başlık çubuğu + gövde. */
export function win(title, body, { cls = "", status = "", onceki = "", id = "" } = {}) {
  return `<section class="win ${cls}"${id ? ` id="${id}"` : ""}>${onceki}
        <div class="bar">
          <span class="dots" aria-hidden="true">▪▪</span>
          <span class="t">${esc(title)}</span>
          <span class="btn" aria-hidden="true"></span>
        </div>
        <div class="body">${body}</div>${status ? `\n        <div class="status">${status}</div>` : ""}
      </section>`;
}

function nav(site, path) {
  const items = (site.nav || []).map((n) => {
    const cur = n.href === path ? ' aria-current="page"' : "";
    return `<li><a href="${esc(n.href)}"${cur}>${esc(n.label)}</a></li>`;
  }).join("");
  return `<nav aria-label="Site"><ul class="nav">${items}</ul></nav>`;
}

export function layout({ site, title, description, main, path = "/", extraHead = "" }) {
  const url = site.url + path;
  const desc = description || site.description || "";
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="${esc(site.lang || "tr")}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}" />
    <meta name="theme-color" content="#0000aa" />
    <link rel="canonical" href="${esc(url)}" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${esc(site.title)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:image" content="${esc(site.url)}/assets/og.jpg" />
    <meta property="og:locale" content="tr_TR" />
    <meta name="twitter:card" content="summary_large_image" />

    <link rel="alternate" type="application/rss+xml" href="/rss.xml" title="${esc(site.title)} — günlük" />
    <link rel="icon" href="/assets/favicon-32.png" sizes="32x32" type="image/png" />
    <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
    <link rel="preload" href="/assets/fonts/jetbrains-mono-400-latin.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="stylesheet" href="/assets/theme.css" />
    ${extraHead}
  </head>
  <body>
    <a class="skip" href="#ana">İçeriğe geç</a>
    <div class="wrap">
${main}
      <footer class="foot">
        <p class="social">${sosyal(site)}</p>
        <p>© ${year} ${esc(site.handle)} <span class="sep">·</span> pencereleri başlığından sürükleyebilirsin</p>
      </footer>
    </div>
    <script src="/assets/win.js" defer></script>
  </body>
</html>
`;
}

/** Kimlik paneli — her sayfanın tepesinde. Ana sayfada giriş metnini de taşır. */
function header(site, path, page, { intro = "", h1 = true } = {}) {
  const kicker = page?.kicker || "";
  const inner = `${kicker ? `<p class="kicker">${esc(kicker)}</p>\n          ` : ""}<${h1 ? "h1" : "p"} class="name">${esc(page?.baslik || site.handle)}<span class="cur" aria-hidden="true"></span></${h1 ? "h1" : "p"}>
          ${intro ? `<div class="intro">${intro}</div>` : ""}
          ${nav(site, path)}`;
  const figur = `<img class="peek" src="/assets/peek.png" alt="" aria-hidden="true" width="380" height="250" />`;
  return win(`${site.handle}@github:~$`, inner, { cls: "id", onceki: figur });
}

function repoItem(r, { one = false } = {}) {
  const meta = [r.language, r.stars ? `★ ${r.stars}` : "", r.updated].filter(Boolean).join(" · ");
  return `<li><a class="item${one ? " one" : ""}" href="${esc(r.url)}" target="_blank" rel="noopener">
            <span class="item-head">
              <span class="item-name">${esc(r.name)}</span>
              ${one ? `<span class="badge-one">öne çıkan</span>` : ""}
              <span class="item-meta">${esc(meta)}</span>
            </span>
            ${r.desc ? `<span class="item-desc">${esc(r.desc)}</span>` : ""}
          </a></li>`;
}

function postItem(p) {
  return `<li><a class="item" href="${esc(p.url)}">
            <span class="item-head">
              <span class="item-name">${esc(p.title)}</span>
              <span class="item-meta">${esc(p.dateText)}</span>
            </span>
            ${p.excerpt ? `<span class="item-desc">${esc(p.excerpt)}</span></span>` : ""}
          </a></li>`;
}

function sozBlok(q) {
  return `<blockquote class="soz">
              <p class="soz-en" lang="en">${esc(q.en)}</p>
              ${q.tr ? `<p class="soz-tr">${esc(q.tr)}</p>` : ""}
              <footer class="soz-kim">— ${esc(q.kim)}</footer>
            </blockquote>`;
}

/** Unix'in fortune'ı gibi: sayfa açılışında rastgele bir söz. */
export function fortune(sozler, ilk) {
  const veri = JSON.stringify(sozler).replace(/</g, "\\u003c");
  return win("~$ fortune", `<div id="soz">${sozBlok(ilk)}</div>`, {
    status: `<span>${sozler.length} söz</span><span class="grow"><button type="button" id="soz-yeni">başka söz</button></span>`,
    onceki: `<script type="application/json" id="soz-verisi">${veri}</script>`,
  });
}

// ── sayfalar ────────────────────────────────────────────────────

export function homeBody({ site, page, posts, soz }) {
  const journal = posts.length
    ? win("gunluk/", `<ul class="items">${posts.slice(0, 4).map(postItem).join("")}</ul>`,
        { status: `<span><a href="/gunluk/">bütün yazılar →</a></span>` })
    : "";

  return [header(site, "/", page, { intro: page.html }), `<main id="ana">`,
    journal, soz, `</main>`].filter(Boolean).join("\n      ");
}

export function projectsBody({ site, featured, rest }) {
  const page = { baslik: "Projeler", kicker: "ne yaptım" };
  const hepsi = [...featured.map((r) => repoItem(r, { one: true })), ...rest.map((r) => repoItem(r))].join("");
  return [header(site, "/projeler/", page), `<main id="ana">`,
    win(`projeler/ (${featured.length + rest.length})`, `<ul class="items">${hepsi}</ul>`,
      { status: `<span>özel repolar listelenmez</span><span class="grow"><a href="https://github.com/${esc(site.github)}?tab=repositories" target="_blank" rel="noopener">github’da aç →</a></span>` }),
    `</main>`].join("\n      ");
}

export function fortuneBody({ site, sozler, kart }) {
  const page = { baslik: "fortune", kicker: "kült sözler" };
  const liste = sozler.map((q) => `<li>${sozBlok(q)}</li>`).join("");
  return [header(site, "/fortune/", page), `<main id="ana">`,
    kart,
    win(`sozler/ (${sozler.length})`, `<ul class="soz-liste">${liste}</ul>`,
      { status: `<span>hepsi burada · ana sayfada rastgele biri çıkar</span>` }),
    `</main>`].join("\n      ");
}

export function journalBody({ site, posts }) {
  const page = { baslik: "Günlük", kicker: "aklımdan geçenler" };
  const body = posts.length
    ? `<ul class="items">${posts.map(postItem).join("")}</ul>`
    : `<p>Henüz yazı yok.</p>`;
  return [header(site, "/gunluk/", page), `<main id="ana">`,
    win(`gunluk/ (${posts.length})`, body, { status: `<span><a href="/rss.xml">rss ile takip et</a></span>` }),
    `</main>`].join("\n      ");
}

export function postBody({ site, post }) {
  const place = post.place ? `${esc(post.place)} · ` : "";
  const photos = (post.photos || [])
    .map((f, i) => `<img src="/media/${esc(post.slug)}/${esc(f)}" alt="" loading="${i ? "lazy" : "eager"}" />`).join("");
  const inner = `<p class="post-meta">${place}${esc(post.dateText)}</p>
          <h1 class="post-title">${esc(post.title)}</h1>
          <div class="post-body">${post.html}</div>
          ${post.en ? `<div class="alt" lang="en">${esc(post.en)}</div>` : ""}
          ${photos ? `<div class="gallery">${photos}</div>` : ""}`;
  const tags = (post.tags || []).map((t) => `<span class="tag">#${esc(t)}</span>`).join(" ");
  return [header(site, "/gunluk/", { baslik: "Günlük", kicker: "aklımdan geçenler" }, { h1: false }), `<main id="ana">`,
    win(`gunluk/${esc(post.slug)}`, inner, {
      status: `<span>${tags}</span><span class="grow"><a href="/gunluk/">← bütün yazılar</a></span>`,
    }), `</main>`].join("\n      ");
}

export function notFoundBody({ site }) {
  const page = { baslik: "404", kicker: "kayıp" };
  const inner = `<p>Aradığın sayfa yok. Yanlış yazılmış olabilir, ya da taşımış olabilirim.</p>
          <p><a href="/">← ana sayfaya dön</a></p>`;
  return [header(site, "/", page), `<main id="ana">`,
    win("hata: sayfa bulunamadi", inner), `</main>`].join("\n      ");
}
