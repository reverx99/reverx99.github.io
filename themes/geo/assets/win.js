// Kartları masaüstü penceresi gibi sürükle.
// Başlık çubuğundan tutulur; taşıma transform ile yapılır, yerleşim bozulmaz.
// Sayfa yenilenince kartlar eski yerine döner (konum saklanmaz).
(() => {
  let ust = 10;

  const konum = (el) => {
    const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(el.style.transform);
    return m ? [parseFloat(m[1]), parseFloat(m[2])] : [0, 0];
  };

  document.querySelectorAll(".win").forEach((kart) => {
    const bar = kart.querySelector(".bar");
    if (!bar) return;

    let aktif = false, bx = 0, by = 0, kx = 0, ky = 0;

    bar.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      aktif = true;
      [kx, ky] = konum(kart);
      bx = e.clientX; by = e.clientY;
      kart.style.zIndex = ++ust;      // tıklanan pencere öne gelsin
      kart.classList.add("tasiniyor");
      bar.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    bar.addEventListener("pointermove", (e) => {
      if (!aktif) return;
      kart.style.transform = `translate(${kx + e.clientX - bx}px, ${ky + e.clientY - by}px)`;
    });

    const birak = (e) => {
      if (!aktif) return;
      aktif = false;
      kart.classList.remove("tasiniyor");
      try { bar.releasePointerCapture(e.pointerId); } catch {}
    };
    bar.addEventListener("pointerup", birak);
    bar.addEventListener("pointercancel", birak);

    // çift tıkla yerine dön
    bar.addEventListener("dblclick", () => { kart.style.transform = ""; });
  });
})();

// ── fortune: rastgele söz ────────────────────────────────────────
// Sözler sayfaya JSON olarak gömülü; JS kapalıysa build'in seçtiği söz durur.
(() => {
  const kutu = document.getElementById("soz");
  const dugme = document.getElementById("soz-yeni");
  const veri = document.getElementById("soz-verisi");
  if (!kutu || !dugme || !veri) return;

  let sozler;
  try { sozler = JSON.parse(veri.textContent); } catch { return; }
  if (!Array.isArray(sozler) || sozler.length < 2) { dugme.hidden = true; return; }

  const kac = (s) => String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  let son = -1;
  const goster = () => {
    let i;
    do { i = Math.floor(Math.random() * sozler.length); } while (i === son);
    son = i;
    const q = sozler[i];
    kutu.innerHTML =
      `<blockquote class="soz">` +
      `<p class="soz-en" lang="en">${kac(q.en)}</p>` +
      (q.tr ? `<p class="soz-tr">${kac(q.tr)}</p>` : "") +
      `<footer class="soz-kim">— ${kac(q.kim)}</footer></blockquote>`;
  };

  goster();                       // açılışta rastgele
  dugme.addEventListener("click", goster);
})();

// ── böcekler ─────────────────────────────────────────────────────
// Kartın içindeki overflow:hidden bir katmanda gezerler; kart kenarı
// onları kırptığı için kenardan çıkıp kenardan giriyormuş gibi olur.
// Tıklarsan ezilir. İlk bilgisayar "bug"ı Mark II'den çıkan gerçek bir güveydi.
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const SVG = `<svg viewBox="0 0 16 20" aria-hidden="true">
    <g class="bacak" stroke="#16151c" stroke-width="1.3" stroke-linecap="round" fill="none">
      <path d="M5.4 7.5 1 4.5M5.4 11 1 11M5.4 14.5 1 17.5M10.6 7.5 15 4.5M10.6 11 15 11M10.6 14.5 15 17.5"/>
    </g>
    <g stroke="#16151c" stroke-width="1.2" stroke-linecap="round" fill="none">
      <path d="M6.6 4 4.3 1M9.4 4 11.7 1"/>
    </g>
    <ellipse cx="8" cy="4.8" rx="2.5" ry="2.2" fill="#16151c"/>
    <ellipse cx="8" cy="12" rx="4" ry="6.2" fill="#1d1c26"/>
    <path d="M8 6.6V17.6" stroke="#4a4857" stroke-width=".9"/>
  </svg>`;

  const DIS = 24;                     // kartın dışında başlangıç payı
  const bocekler = new Set();
  let dongu = 0, onceki = 0;

  const sar = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

  function dogur() {
    const kartlar = [...document.querySelectorAll(".win")];
    if (!kartlar.length || bocekler.size >= 2) return;
    const kart = kartlar[Math.floor(Math.random() * kartlar.length)];

    let alan = kart.querySelector(":scope > .bocek-alan");
    if (!alan) {
      alan = document.createElement("div");
      alan.className = "bocek-alan";
      kart.appendChild(alan);
    }
    const w = kart.clientWidth, h = kart.clientHeight;
    if (w < 120 || h < 90) return;

    // rastgele bir kenardan, içeri doğru
    const kenar = Math.floor(Math.random() * 4);
    let x, y, aci;
    if (kenar === 0)      { x = 20 + Math.random() * (w - 40); y = -DIS;     aci =  Math.PI / 2; }
    else if (kenar === 1) { x = w + DIS; y = 20 + Math.random() * (h - 40);  aci =  Math.PI; }
    else if (kenar === 2) { x = 20 + Math.random() * (w - 40); y = h + DIS;  aci = -Math.PI / 2; }
    else                  { x = -DIS;    y = 20 + Math.random() * (h - 40);  aci =  0; }

    const el = document.createElement("button");
    el.className = "bocek";
    el.type = "button";
    el.setAttribute("aria-label", "böceği ez");
    el.innerHTML = SVG;
    alan.appendChild(el);

    const b = {
      el, kart, x, y, aci,
      hedef: aci,
      hiz: 17 + Math.random() * 9,
      omur: 7000 + Math.random() * 8000,
      dogdu: performance.now(),
      sonDonus: 0,
      cikiyor: false,
      olu: false,
    };
    el.addEventListener("click", () => {
      if (b.olu) return;
      b.olu = true;
      el.classList.add("ezik");
      setTimeout(() => { el.remove(); bocekler.delete(b); }, 900);
    });
    bocekler.add(b);
    if (!dongu) { onceki = 0; dongu = requestAnimationFrame(adim); }
  }

  function adim(t) {
    const dt = onceki ? Math.min((t - onceki) / 1000, 0.05) : 0.016;
    onceki = t;

    for (const b of [...bocekler]) {
      if (b.olu) continue;
      const w = b.kart.clientWidth, h = b.kart.clientHeight;
      const yas = t - b.dogdu;

      if (!b.cikiyor && yas > b.omur) {         // süre doldu: en yakın kenara yönel
        b.cikiyor = true;
        const d = [b.y, w - b.x, h - b.y, b.x];  // üst, sağ, alt, sol
        const k = d.indexOf(Math.min(...d));
        b.hedef = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][k];
      } else if (!b.cikiyor && t - b.sonDonus > 1200 + Math.random() * 1800) {
        b.sonDonus = t;                          // ara sıra yeni yön seç, ani değil
        b.hedef = sar(b.aci + (Math.random() - 0.5) * 1.9);
      }

      // kenara yaklaşınca içeri kıvır (çıkış modunda değilse)
      if (!b.cikiyor) {
        const p = 26;
        if (b.x < p)       b.hedef = 0;
        else if (b.x > w - p) b.hedef = Math.PI;
        else if (b.y < p)  b.hedef = Math.PI / 2;
        else if (b.y > h - p) b.hedef = -Math.PI / 2;
      }

      b.aci += sar(b.hedef - b.aci) * Math.min(1, dt * 3.2);   // yumuşak dönüş
      b.x += Math.cos(b.aci) * b.hiz * dt;
      b.y += Math.sin(b.aci) * b.hiz * dt;

      if (b.cikiyor && (b.x < -DIS || b.x > w + DIS || b.y < -DIS || b.y > h + DIS)) {
        b.olu = true; b.el.remove(); bocekler.delete(b); continue;
      }
      b.el.style.transform =
        `translate3d(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px, 0) rotate(${(b.aci * 180 / Math.PI + 90).toFixed(1)}deg)`;
    }

    dongu = bocekler.size ? requestAnimationFrame(adim) : (onceki = 0, 0);
  }

  const zamanla = () => setTimeout(() => { dogur(); zamanla(); }, 9000 + Math.random() * 14000);
  setTimeout(dogur, 3000);
  zamanla();
})();
