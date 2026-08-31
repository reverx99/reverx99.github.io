// Repo listesini BUILD ANINDA çeker ve HTML'e gömer.
// Böylece ziyaretçinin tarayıcısı GitHub'a istek atmaz: API limiti yok,
// iskelet bekleme yok, arama motorları listeyi görebiliyor.
//
// Sonuç .cache/repos.json'a yazılır; ağ yoksa build son bilinen listeyle sürer.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

function since(iso) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d < 1) return "bugün";
  if (d < 30) return `${d} gün önce`;
  if (d < 365) return `${Math.floor(d / 30)} ay önce`;
  const y = Math.floor(d / 365);
  return `${y} yıl önce`;
}

export function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso || "";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export async function loadRepos(root, site, cfg) {
  const cacheDir = path.join(root, ".cache");
  const cacheFile = path.join(cacheDir, "repos.json");
  let raw = null;

  try {
    const res = await fetch(
      `https://api.github.com/users/${site.github}/repos?per_page=100&sort=updated`,
      { headers: { Accept: "application/vnd.github+json", "User-Agent": `${site.github}-site-build` } },
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    raw = await res.json();
    await mkdir(cacheDir, { recursive: true });
    await writeFile(cacheFile, JSON.stringify(raw, null, 2));
    console.log(`  GitHub'dan ${raw.length} repo çekildi`);
  } catch (e) {
    if (existsSync(cacheFile)) {
      raw = JSON.parse(await readFile(cacheFile, "utf8"));
      console.log(`  ! ${e.message} — önbellekteki liste kullanılıyor (${raw.length} repo)`);
    } else {
      console.log(`  ! ${e.message} — önbellek de yok, proje listesi boş kalacak`);
      return { featured: [], rest: [] };
    }
  }

  const gizli = new Set(cfg.gizli || []);
  const notlar = cfg.aciklama || {};

  const all = raw
    .filter((r) => !r.fork && !r.archived && !gizli.has(r.name))
    .map((r) => ({
      name: r.name,
      desc: (notlar[r.name] || "").trim() || r.description || "",
      language: r.language || "",
      stars: r.stargazers_count || 0,
      url: r.html_url,
      pushed: r.pushed_at,
      updated: since(r.pushed_at),
    }))
    .sort((a, b) => new Date(b.pushed) - new Date(a.pushed));

  const order = cfg.one_cikan || [];
  const featured = order.map((n) => all.find((r) => r.name === n)).filter(Boolean);
  const rest = all.filter((r) => !order.includes(r.name));

  const eksik = all.filter((r) => !r.desc).map((r) => r.name);
  if (eksik.length) console.log(`  ! açıklaması olmayan repo: ${eksik.join(", ")}`);

  return { featured, rest, all };
}
