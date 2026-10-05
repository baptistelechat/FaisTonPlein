// brag-series — moteur. Chaque image est une fonction pure du temps : seek(t) recalcule tout, rien ne « joue ».
// Une vidéo = un fichier HTML (hook + scènes propres) qui appelle defineVideo({...}).
// Tout ce qui est propre au projet (couleurs, typos, logo, nom, URL, pastilles) vient de window.THEME (theme.js).
const clamp = (x) => Math.min(1, Math.max(0, x));
const p = (t, a, b) => clamp((t - a) / (b - a));
const out3 = (x) => 1 - Math.pow(1 - x, 3);
const inOut = (x) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const back = (x) => 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2);
const lerp = (a, b, k) => a + (b - a) * k;
const $ = (id) => document.getElementById(id);
const THEME = window.THEME;

// Thème → variables CSS + typos
for (const [k, v] of Object.entries(THEME.colors || {}))
  document.documentElement.style.setProperty(`--${k}`, v);
const fonts = THEME.fonts || {};
if (fonts.heading)
  document.documentElement.style.setProperty(
    "--font-heading",
    `'${fonts.heading}'`,
  );
if (fonts.body)
  document.documentElement.style.setProperty("--font-body", `'${fonts.body}'`);
const fontsLoaded = new Promise((resolve) => {
  if (!fonts.href) return resolve();
  const link = Object.assign(document.createElement("link"), {
    rel: "stylesheet",
    href: fonts.href,
    onload: resolve,
    onerror: resolve,
  });
  document.head.appendChild(link);
}).then(() =>
  Promise.all(
    [fonts.heading, fonts.body]
      .filter(Boolean)
      .flatMap((f) =>
        [500, 700].map((w) => document.fonts.load(`${w} 20px '${f}'`)),
      ),
  ),
);

const K = {
  p,
  out3,
  inOut,
  back,
  lerp,
  $,
  // Onde de tap (clic simulé)
  tap(el, t, t0) {
    const k = p(t, t0, t0 + 0.5);
    el.style.opacity = k > 0 && k < 1 ? 1 - k : 0;
    el.style.transform = `scale(${0.4 + 1.2 * out3(k)})`;
  },
  // Cadre de surbrillance qui se pose (et repart si tOut)
  ring(el, t, tIn, tOut = Infinity) {
    const k = out3(p(t, tIn, tIn + 0.35));
    el.style.opacity = k * (tOut === Infinity ? 1 : 1 - p(t, tOut, tOut + 0.2));
    el.style.transform = `scale(${1.08 - 0.08 * k})`;
  },
  // Téléphone : entrée par le bas, zooms successifs {from, to, back?, s, origin}, sortie
  phone(t, { enter, exit, zooms = [] }) {
    let scale = 1;
    for (const z of zooms) {
      scale +=
        (z.s - 1) *
        (inOut(p(t, z.from, z.to)) -
          (z.back ? inOut(p(t, z.back, z.back + 0.6)) : 0));
    }
    const active = zooms.find((z) => !z.back || t < z.back + 0.6);
    const cam = $("cam");
    cam.style.transformOrigin = active ? active.origin : "50% 50%";
    cam.style.transform = `translateY(${1800 * (1 - out3(p(t, enter, enter + 0.8))) + 1900 * inOut(p(t, exit, exit + 0.6))}px) scale(${scale})`;
    cam.style.opacity = t < enter || t > exit + 0.6 ? 0 : 1;
    $("band").style.opacity =
      p(t, enter - 0.1, enter + 0.1) * (1 - p(t, exit, exit + 0.3));
  },
  // Navigateur : caméra par images-clés {t (arrivée), d (durée du mouvement), cx, cy, s, top, h} en coordonnées bureau
  browser(t, { enter, exit, keys }) {
    const c = { ...keys[0] };
    for (const k of keys.slice(1)) {
      const e = inOut(p(t, k.t - k.d, k.t));
      for (const f of ["cx", "cy", "s", "top", "h"]) c[f] = lerp(c[f], k[f], e);
    }
    const win = $("win");
    win.style.top = `${c.top}px`;
    win.style.opacity = t < enter || t > exit + 0.6 ? 0 : 1;
    win.style.transform = `translateY(${1800 * (1 - out3(p(t, enter, enter + 0.8))) + 1900 * inOut(p(t, exit, exit + 0.6))}px)`;
    $("view").style.height = `${c.h}px`;
    $("world").style.transform =
      `translate(${490 - c.cx * c.s}px, ${c.h / 2 - c.cy * c.s}px) scale(${c.s})`;
  },
};

window.defineVideo = ({
  duration,
  poster,
  stills,
  cues,
  reveal,
  outro,
  tick,
}) => {
  const stage = $("stage");
  stage.insertAdjacentHTML(
    "afterbegin",
    `
    <div class="glow" id="g1" style="background: radial-gradient(color-mix(in srgb, var(--primary) 33%, transparent), transparent 65%)"></div>
    <div class="glow" id="g2" style="background: radial-gradient(color-mix(in srgb, var(--good) 13%, transparent), transparent 65%)"></div>`,
  );
  // Reveal et outro identiques sur toute la série : seuls l'accroche et la punchline changent
  const pills = (THEME.pills || [])
    .map(
      ([label, color], i) =>
        `<span class="pill a" data-in="${outro.in + 0.9 + i * 0.08}" style="background: ${color}">${label}</span>`,
    )
    .join("");
  stage.insertAdjacentHTML(
    "beforeend",
    `
    <div class="scene">
      <div class="logo a" data-in="${reveal.in}" data-out="${reveal.out}" data-pop="1"><img src="${THEME.logo}" alt=""></div>
      <h1 class="name a" data-in="${reveal.in + 0.15}" data-out="${reveal.out}">${THEME.name}</h1>
      <div class="tag a" data-in="${reveal.in + 0.4}" data-out="${reveal.out}">${reveal.tag}</div>
    </div>
    <div class="scene">
      <div class="logo sm a" data-in="${outro.in + 0.1}" data-pop="1"><img src="${THEME.logo}" alt=""></div>
      <h1 class="name sm a" data-in="${outro.in + 0.2}">${THEME.name}</h1>
      <div class="punch h a" data-in="${outro.in + 0.4}">${outro.punch}</div>
      ${pills ? `<div class="pills">${pills}</div>` : ""}
      <div class="url a" data-in="${outro.in + 1.6}">${THEME.url}</div>
      ${THEME.outroFoot ? `<div class="foot a" data-in="${outro.in + 1.9}" data-dy="0">${THEME.outroFoot}</div>` : ""}
    </div>`,
  );
  const anims = [...document.querySelectorAll(".a")].map((el) => ({
    el,
    ...el.dataset,
  }));

  window.VIDEO = {
    duration,
    poster,
    stills,
    cues: { ...cues, drop: reveal.in, duration },
  };
  window.seek = (t) => {
    // Entrées / sorties génériques : data-in, data-out, data-dx, data-dy, data-pop
    for (const a of anims) {
      const k = p(t, +a.in, +a.in + 0.45);
      const e = out3(k);
      const o = a.out ? 1 - p(t, +a.out, +a.out + 0.22) : 1;
      const dy = a.dy !== undefined ? +a.dy : 50;
      a.el.style.opacity = e * o;
      a.el.style.transform = `translate(${+(a.dx || 0) * (1 - e)}px, ${dy * (1 - e) - (a.out ? 30 * (1 - o) : 0)}px) scale(${a.pop ? 0.5 + 0.5 * back(k) : 1})`;
    }
    // Halos de fond, dérive lente
    $("g1").style.transform =
      `translate(${-300 + 120 * Math.sin(t * 0.3)}px, ${-200 + 90 * Math.cos(t * 0.25)}px)`;
    $("g2").style.transform =
      `translate(${250 + 100 * Math.cos(t * 0.28)}px, ${900 + 120 * Math.sin(t * 0.22)}px)`;
    tick(t, K);
  };
  window.ready = fontsLoaded.then(() =>
    Promise.all([
      document.fonts.ready,
      ...[...document.images].map((i) => i.decode()),
    ]),
  );
};
