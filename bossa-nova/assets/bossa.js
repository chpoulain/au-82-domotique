/* =========================================================
   Bossa Nova — moteur de progression & rendu
   - Registre des 10 modules
   - Étoiles / déblocage / validation (localStorage)
   - Rendu des diagrammes d'accords (SVG)
   - Rendu des grilles rythmiques main droite
   - Correction des quiz + auto-évaluation
   ========================================================= */
(function () {
  "use strict";

  /* ---------- Registre des modules ---------- */
  const MODULES = [
    { n: 1,  color: "#2f8f6b", title: "Entrer dans la bossa nova",
      sub: "Histoire, oreille, posture, accordage : poser le décor et le corps." },
    { n: 2,  color: "#1ea7a0", title: "La main droite : le geste fondateur",
      sub: "Pouce et doigts, la basse alternée et le premier pincé bossa." },
    { n: 3,  color: "#3d7ea6", title: "Les premiers accords colorés",
      sub: "maj7, m7, 7 : les accords à quatre sons qui font le son bossa." },
    { n: 4,  color: "#6b5ca8", title: "Comprendre l'harmonie : le ii–V–I",
      sub: "La cellule qui gouverne 90 % du répertoire bossa et jazz." },
    { n: 5,  color: "#e8933a", title: "Voicings & accords barrés mobiles",
      sub: "Déplacer une forme sur tout le manche : la boîte à outils." },
    { n: 6,  color: "#ee5a2a", title: "Le rythme bossa : la batida de João",
      sub: "Clave, syncope et indépendance pouce / doigts." },
    { n: 7,  color: "#c1425f", title: "Progressions typiques & cycle des quintes",
      sub: "Enchaîner les ii–V–I, tourner autour de la tonalité." },
    { n: 8,  color: "#8a8f2c", title: "Enrichissements & substitutions",
      sub: "9, 11, 13, altérations et substitution tritonique." },
    { n: 9,  color: "#1f7a8c", title: "Morceaux d'application",
      sub: "Trois grilles-types de standards pour tout réunir." },
    { n: 10, color: "#b5651d", title: "Bossanoviser n'importe quelle chanson",
      sub: "La méthode de réharmonisation, étape par étape." },
  ];

  const MAX_STARS = 5;      // étoiles max par module
  const PASS = 0.8;         // 80 % pour valider
  const KEY = "bossaProgressV1";

  /* ---------- Persistance ----------
     Repli en mémoire si localStorage est indisponible (ex. iframe
     « bac à sable » de certaines intégrations). La progression n'est
     alors pas conservée entre deux visites, mais rien ne plante. */
  let memStore = null; // cache mémoire de secours
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) || {}) : (memStore || {});
    } catch (e) {
      return memStore || {};
    }
  }
  function save(p) {
    memStore = p;
    try { localStorage.setItem(KEY, JSON.stringify(p)); }
    catch (e) { /* stockage bloqué : on garde memStore */ }
  }

  function moduleState(n) {
    const p = load();
    return p[n] || { best: 0, stars: 0, passed: false };
  }
  function isUnlocked(n) {
    if (n <= 1) return true;
    return !!moduleState(n - 1).passed;
  }
  function totalStars() {
    const p = load();
    return MODULES.reduce((s, m) => s + (p[m.n] ? p[m.n].stars : 0), 0);
  }
  function maxStars() { return MODULES.length * MAX_STARS; }
  function passedCount() {
    const p = load();
    return MODULES.filter(m => p[m.n] && p[m.n].passed).length;
  }

  function recordResult(n, pct) {
    const p = load();
    const stars = Math.max(0, Math.min(MAX_STARS, Math.round(pct * MAX_STARS)));
    const prev = p[n] || { best: 0, stars: 0, passed: false };
    p[n] = {
      best: Math.max(prev.best, pct),
      stars: Math.max(prev.stars, stars),
      passed: prev.passed || pct >= PASS,
    };
    save(p);
    return p[n];
  }

  /* ---------- Icônes ---------- */
  function starSVG(filled) {
    const c = filled ? "#f5b820" : "#d9d2c4";
    return `<svg viewBox="0 0 24 24" fill="${c}" aria-hidden="true"><path d="M12 2.5l2.9 6.05 6.6.86-4.85 4.55 1.24 6.54L12 17.9 6.1 20.9l1.24-6.54L2.5 9.41l6.6-.86z"/></svg>`;
  }
  function starRow(count, max) {
    let out = "";
    for (let i = 0; i < max; i++) out += starSVG(i < count);
    return out;
  }

  /* ---------- Rendu diagramme d'accord (SVG) ----------
     data-chord = {
       name, sub,
       frets:  [E A D G B e]  (-1 muet, 0 corde à vide, n case),
       fingers:[…]            (0 = rien, 1..4 doigts, éventuel),
       base:   1              (case de départ, pour affichage),
       barres: [{fret, from, to}]  (from/to = index de corde 0..5)
     } */
  function renderChord(el) {
    let d;
    try { d = JSON.parse(el.getAttribute("data-chord")); } catch (e) { return; }
    const frets = d.frets || [];
    const fingers = d.fingers || [];
    const nStrings = 6;
    const nFrets = 4;
    const W = 96, H = 128;
    const padX = 12, padTop = 26, padBottom = 14;
    const gridW = W - padX * 2;
    const gridH = H - padTop - padBottom;
    const dx = gridW / (nStrings - 1);
    const dy = gridH / nFrets;
    const base = d.base || 1;

    let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Diagramme accord ${d.name || ""}">`;
    // nut
    if (base === 1) {
      svg += `<rect x="${padX}" y="${padTop - 4}" width="${gridW}" height="4" rx="1.5" fill="#142546"/>`;
    } else {
      svg += `<text x="${padX - 6}" y="${padTop + dy * 0.7}" font-size="11" font-family="Space Grotesk,sans-serif" fill="#7a849c" text-anchor="end" font-weight="600">${base}</text>`;
    }
    // frettes horizontales
    for (let f = 0; f <= nFrets; f++) {
      svg += `<line x1="${padX}" y1="${padTop + f * dy}" x2="${padX + gridW}" y2="${padTop + f * dy}" stroke="#c9cfda" stroke-width="1.4"/>`;
    }
    // cordes verticales
    for (let s = 0; s < nStrings; s++) {
      svg += `<line x1="${padX + s * dx}" y1="${padTop}" x2="${padX + s * dx}" y2="${padTop + gridH}" stroke="#c9cfda" stroke-width="1.4"/>`;
    }
    // barrés
    (d.barres || []).forEach(b => {
      const rel = b.fret - base + 1;
      if (rel < 1 || rel > nFrets) return;
      const y = padTop + (rel - 0.5) * dy;
      const x1 = padX + b.from * dx, x2 = padX + b.to * dx;
      svg += `<rect x="${x1 - 7}" y="${y - 7}" width="${x2 - x1 + 14}" height="14" rx="7" fill="#142546"/>`;
    });
    // symboles au-dessus (X / O) + points
    for (let s = 0; s < nStrings; s++) {
      const fr = frets[s];
      const x = padX + s * dx;
      if (fr === -1) {
        svg += `<text x="${x}" y="${padTop - 8}" font-size="12" font-family="Space Grotesk,sans-serif" fill="#7a849c" text-anchor="middle" font-weight="700">×</text>`;
      } else if (fr === 0) {
        svg += `<circle cx="${x}" cy="${padTop - 11}" r="4.4" fill="none" stroke="#404a66" stroke-width="1.6"/>`;
      } else {
        const rel = fr - base + 1;
        if (rel < 1 || rel > nFrets) continue;
        // si couvert par un barré à cette case, ne pas doubler le point (sauf doigté)
        const y = padTop + (rel - 0.5) * dy;
        const covered = (d.barres || []).some(b => b.fret === fr && s >= b.from && s <= b.to);
        if (!covered) {
          svg += `<circle cx="${x}" cy="${y}" r="7.4" fill="${d.color || "#1ea7a0"}"/>`;
        }
        const fg = fingers[s];
        if (fg && fg > 0 && !covered) {
          svg += `<text x="${x}" y="${y + 3.6}" font-size="10" font-family="Space Grotesk,sans-serif" fill="#fff" text-anchor="middle" font-weight="700">${fg}</text>`;
        }
      }
    }
    svg += `</svg>`;

    const name = d.name ? `<div class="cname">${d.name}</div>` : "";
    const sub = `<div class="csub">${d.sub || ""}</div>`;
    el.innerHTML = name + sub + svg;
  }

  /* ---------- Rendu grille rythmique ----------
     data-rhythm = {
       title, beats: 8|16,
       lanes: [{lbl, pattern}]  pattern = chaîne de N caractères :
          '.' silence, 'x' pincé doigt, 'o' basse pouce, 'A' accent
       legend: bool
     }  */
  function renderRhythm(el) {
    let d;
    try { d = JSON.parse(el.getAttribute("data-rhythm")); } catch (e) { return; }
    const beats = d.beats || 16;
    let html = `<div class="rtitle">🎵 ${d.title || "Motif main droite"}</div><div class="rgrid">`;
    d.lanes.forEach(lane => {
      html += `<div class="rlane"><div class="rlbl">${lane.lbl}</div><div class="rcells" style="grid-template-columns:repeat(${beats},1fr)">`;
      const pat = (lane.pattern || "").padEnd(beats, ".");
      for (let i = 0; i < beats; i++) {
        const c = pat[i];
        const isBeat = (i % (beats / 4) === 0);
        let cls = "rcell";
        if (isBeat) cls += " beat";
        let lab = "";
        if (c === "x") { cls += " hit"; }
        else if (c === "o") { cls += " hit thumb"; }
        else if (c === "A") { cls += " hit acc"; lab = `<span class="lab">›</span>`; }
        html += `<div class="${cls}">${lab}</div>`;
      }
      html += `</div></div>`;
    });
    html += `</div>`;
    // ligne des temps
    html += `<div class="rbeats"><div class="sp"></div><div class="nums" style="grid-template-columns:repeat(4,1fr)"><span>1</span><span>2</span><span>3</span><span>4</span></div></div>`;
    if (d.legend !== false) {
      html += `<div class="rlegend">
        <span><i style="background:#f5b820"></i>Pouce (basse)</span>
        <span><i style="background:#1ea7a0"></i>Doigts (accord)</span>
        <span><i style="background:#ee5a2a"></i>Accent syncopé</span></div>`;
    }
    el.innerHTML = html;
  }

  /* ---------- Barre de nav : total d'étoiles ---------- */
  function paintNavStars() {
    document.querySelectorAll("[data-nav-stars]").forEach(el => {
      el.innerHTML = starSVG(true) +
        `<span>${totalStars()} / ${maxStars()}</span>`;
    });
  }

  /* ---------- Rendu du HUB ---------- */
  function renderHub() {
    const grid = document.querySelector("[data-hub-grid]");
    if (!grid) return;
    const p = load();
    let html = "";
    MODULES.forEach(m => {
      const st = p[m.n] || { stars: 0, passed: false };
      const unlocked = isUnlocked(m.n);
      const slug = "module-" + String(m.n).padStart(2, "0") + ".html";
      let badge, foot;
      if (!unlocked) {
        badge = `<span class="mbadge locked">🔒 Verrouillé</span>`;
      } else if (st.passed) {
        badge = `<span class="mbadge done">✔ Validé</span>`;
      } else {
        badge = `<span class="mbadge open">● À travailler</span>`;
      }
      const stars = `<span class="mstars">${starRow(st.stars, MAX_STARS)}</span>`;
      if (unlocked) {
        foot = `${stars}<a class="mcard-cta" href="${slug}">${st.passed ? "Revoir" : "Commencer"} →</a>`;
      } else {
        foot = `${stars}<span class="lockmsg">Validez le module ${m.n - 1}</span>`;
      }
      const openCls = unlocked ? "is-open" : "is-locked";
      const inner = `
        <div class="mcard-top">
          <span class="mnum" style="--c:${m.color}">${String(m.n).padStart(2, "0")}</span>
          ${badge}
        </div>
        <h3>${m.title}</h3>
        <p>${m.sub}</p>
        <span class="mtime">⏱ ≈ 1 h 30 · pratique + théorie</span>
        <div class="mcard-foot">${foot}</div>`;
      if (unlocked) {
        html += `<a class="mcard ${openCls}" style="--c:${m.color}" href="${slug}">${inner}</a>`;
      } else {
        html += `<div class="mcard ${openCls}" style="--c:${m.color}">${inner}</div>`;
      }
    });
    grid.innerHTML = html;

    // strip de progression
    const ps = document.querySelector("[data-progress-fill]");
    if (ps) ps.style.width = (totalStars() / maxStars() * 100) + "%";
    document.querySelectorAll("[data-total-stars]").forEach(e => e.textContent = totalStars());
    document.querySelectorAll("[data-max-stars]").forEach(e => e.textContent = maxStars());
    document.querySelectorAll("[data-passed-count]").forEach(e => e.textContent = passedCount());
  }

  /* ---------- Toast ---------- */
  function toast(msg) {
    let t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.innerHTML = starSVG(true) + `<span>${msg}</span>`;
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => t.classList.remove("show"), 3200);
  }

  /* ---------- Quiz d'un module ---------- */
  function initQuiz() {
    const form = document.querySelector("[data-quiz]");
    if (!form) return;
    const n = parseInt(form.getAttribute("data-quiz"), 10);
    const checkBtn = form.querySelector("[data-check]");
    const scoreEl = form.querySelector("[data-live-score]");
    const result = form.querySelector("[data-result]");
    const questions = Array.from(form.querySelectorAll(".q"));
    const selfItems = Array.from(form.querySelectorAll(".selfcheck input"));
    const totalItems = questions.length + selfItems.length;

    function liveCount() {
      let done = 0;
      questions.forEach(q => { if (q.querySelector("input:checked")) done++; });
      selfItems.forEach(i => { if (i.checked) done++; });
      return done;
    }
    function refresh() {
      if (scoreEl) scoreEl.textContent = `${liveCount()} / ${totalItems} répondus`;
    }
    form.addEventListener("change", refresh);
    refresh();

    checkBtn.addEventListener("click", function () {
      let correct = 0;
      questions.forEach(q => {
        const right = q.getAttribute("data-answer");
        const opts = Array.from(q.querySelectorAll(".opt"));
        const chosen = q.querySelector("input:checked");
        opts.forEach(o => {
          o.classList.remove("correct", "wrong");
          const v = o.querySelector("input").value;
          const mk = o.querySelector(".mark"); if (mk) mk.remove();
          if (v === right) {
            o.classList.add("correct");
            o.insertAdjacentHTML("beforeend", `<span class="mark">✔</span>`);
          } else if (chosen && chosen.value === v) {
            o.classList.add("wrong");
            o.insertAdjacentHTML("beforeend", `<span class="mark">✕</span>`);
          }
        });
        if (chosen && chosen.value === right) correct++;
        const ex = q.querySelector(".explain"); if (ex) ex.classList.add("show");
      });
      // auto-évaluation : chaque case cochée compte comme acquis
      let selfDone = 0;
      selfItems.forEach(i => { if (i.checked) selfDone++; });
      correct += selfDone;

      const pct = totalItems ? correct / totalItems : 0;
      const saved = recordResult(n, pct);
      const passed = pct >= PASS;

      // rendu résultat
      result.className = "result show " + (passed ? "pass" : "fail");
      const pctTxt = Math.round(pct * 100);
      let nextHtml = "";
      if (passed && n < MODULES.length) {
        const nx = "module-" + String(n + 1).padStart(2, "0") + ".html";
        nextHtml = `<a class="next-btn" href="${nx}">Débloquer le module ${n + 1} →</a>`;
      } else if (passed && n === MODULES.length) {
        nextHtml = `<a class="next-btn" href="index.html">Retour au parcours · 🎉 parcours complété</a>`;
      } else {
        nextHtml = `<a class="next-btn" href="#quiz" onclick="location.reload()">Réessayer</a>`;
      }
      result.innerHTML = `
        <h3>${passed ? "🌴 Module validé !" : "🎧 Presque !"}</h3>
        <p>Score : <b>${pctTxt} %</b> (${correct}/${totalItems}). ${passed
          ? "Tu as dépassé le seuil de 80 %. Les étoiles sont créditées et le module suivant est débloqué."
          : "Il faut atteindre 80 % pour valider. Revois les explications ci-dessus, rejoue les exemples, puis relance la vérification."}</p>
        <div class="earned">${starRow(saved.stars, MAX_STARS)}</div>
        <div>${nextHtml}</div>`;
      paintNavStars();
      if (passed) toast(`+${saved.stars} étoile${saved.stars > 1 ? "s" : ""} · module ${n} validé`);
      result.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  /* ---------- Garde-fou de déblocage sur page module ---------- */
  function guardModule() {
    const body = document.body;
    const n = parseInt(body.getAttribute("data-module") || "0", 10);
    if (!n) return;
    if (!isUnlocked(n)) {
      const main = document.querySelector("main") || body;
      main.innerHTML = `<div class="wrap-narrow" style="padding:80px 28px;text-align:center">
        <div style="font-size:52px">🔒</div>
        <h1 style="font-size:32px;color:var(--navy-deep);margin:16px 0 10px">Module verrouillé</h1>
        <p style="font-size:17px;color:var(--ink-2);max-width:520px;margin:0 auto 26px">
          Pour garder une progression solide, ce module s'ouvre une fois le module ${n - 1} validé (80 %).</p>
        <a class="bnav-back" style="display:inline-flex" href="index.html">← Retour au parcours</a>
      </div>`;
    }
  }

  /* ---------- Init ---------- */
  function boot() {
    document.querySelectorAll("[data-chord]").forEach(renderChord);
    document.querySelectorAll("[data-rhythm]").forEach(renderRhythm);
    paintNavStars();
    renderHub();
    guardModule();
    initQuiz();

    document.querySelectorAll("[data-reset]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (confirm("Réinitialiser toute la progression et les étoiles ?")) {
          memStore = {};
          try { localStorage.removeItem(KEY); } catch (e) {}
          location.reload();
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }

  window.BOSSA = { MODULES, MAX_STARS, PASS, load, isUnlocked, totalStars };
})();
