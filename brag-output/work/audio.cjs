// Bande-son d'une série, synthétisée : musique + bruitages écrits ensemble, 120 BPM (1 temps = 0,5 s).
// Ce fichier ne contient aucun morceau : seulement les instruments et un compositeur.
// L'ambiance vient du thème du projet (THEME.music, écrit à la création de la série) :
//   mood   : les mots validés avec l'auteur, pour mémoire
//   seed   : graine de la série (par défaut son nom) — deux séries ne tirent pas les mêmes morceaux
//   scale  : gamme, en demi-tons depuis la tonique (7 notes)
//   keys   : [min, max] transposition en demi-tons autour de la
//   degrees: degrés de la gamme autorisés comme accords (0 = tonique)
//   kicks  : motifs de grosse caisse autorisés (croches frappées dans la mesure, 0-7)
//   tone   : brillance des timbres (1 = neutre, moins = plus feutré, plus = plus brillant)
//   arpEvery : 1 = arpège en croches, 2 = en noires (plus calme)
//   tracks : { n: morceau } morceaux figés, pour ne jamais changer la musique d'une vidéo publiée
// Chaque vidéo a son morceau, composé d'après la graine et son numéro : re-rendre redonne le même,
// une nouvelle vidéo en reçoit un nouveau dans la même ambiance, jamais identique à un précédent de la série.
// Repères (cues) par vidéo :
//   duration, drop (entrée du beat = reveal), arp (entrée de l'arpège), clap (entrée du clap),
//   taps [t], whooshes [[t, durée, gain]], bells [[t, note MIDI, gain, déclin]],
//   track (numéro de la vidéo, fourni par render.cjs), take (optionnel : autre tirage si le morceau déplaît)
// Les notes des bells s'écrivent en la mineur : elles sont ramenées dans la gamme puis transposées.
// Les repères rythmiques doivent tomber sur un temps (multiples de 0,5 s).
const fs = require("node:fs");
const SR = 44100;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const sin = (f, t) => Math.sin(2 * Math.PI * f * t);

// Tirage reproductible à partir d'un texte
const rng = (text) => {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  let seed = (h % 2147483646) + 1;
  return (k) => (seed = (seed * 16807) % 2147483647) % k;
};
// Un morceau = { key, chords: 4 accords de 4 notes MIDI écrits en la, roots: 4 basses, arp: ordre des voix sur 8 croches, kick }
const compose = (m, n, take) => {
  const pick = rng(`${m.seed}:${n}:${take}`);
  const note = (i) => m.scale[i % 7] + 12 * Math.floor(i / 7);
  const degs = [];
  while (degs.length < 4) {
    const d = m.degrees[pick(m.degrees.length)];
    // pas deux fois le même accord de suite, ni en bouclant
    if (d !== degs[degs.length - 1] && !(degs.length === 3 && d === degs[0]))
      degs.push(d);
  }
  const arp = [0];
  while (arp.length < 8) {
    const v = pick(4);
    if (v !== arp[arp.length - 1]) arp.push(v);
  }
  return {
    key: m.keys[0] + pick(m.keys[1] - m.keys[0] + 1),
    // accord de septième empilé dans la gamme, voix resserrées sur une octave
    chords: degs.map((d) =>
      [0, 2, 4, 6]
        .map((i) => 50 + ((note(d + i) + 7) % 12))
        .sort((x, y) => x - y),
    ),
    roots: degs.map((d) => 33 + m.scale[d]),
    arp,
    kick: m.kicks[pick(m.kicks.length)],
  };
};
const trackOf = (m, n, take = 0) => {
  // On rejoue la série depuis la vidéo 1 pour écarter tout morceau déjà pris : jamais deux fois le même dans une série
  const taken = [];
  let t;
  for (let i = 1; i <= n; i++) {
    t = m.tracks?.[i];
    for (let k = i === n ? take : 0; !t; k++) {
      const c = compose(m, i, k);
      if (!taken.includes(JSON.stringify(c))) t = c;
    }
    taken.push(JSON.stringify(t));
  }
  return t;
};

module.exports = (
  { duration, drop, arp, clap, taps, whooshes, bells, track = 1, take },
  music,
  outPath,
) => {
  if (!music?.scale)
    throw new Error(
      "THEME.music manquant : définir l'ambiance de la série dans theme.js (voir SKILL.md, étape 1)",
    );
  const M = { seed: "serie", tone: 1, arpEvery: 1, ...music };
  const V = trackOf(M, track, take);
  const CHORDS = V.chords.map((c) => c.map((m) => m + V.key));
  // Ramène une note écrite en la mineur sur la gamme de la série (au plus près, vers le haut d'abord)
  const snap = (m) => {
    const pc = (((m - 57) % 12) + 12) % 12;
    return (
      m + ([0, 1, -1, 2].find((d) => M.scale.includes((pc + d + 12) % 12)) ?? 0)
    );
  };
  // La basse reste dans la même octave quelle que soit la tonalité (trop grave, un téléphone ne la rend pas)
  const ROOTS = V.roots.map((r) => 28 + ((((r + V.key - 28) % 12) + 12) % 12));
  const N = Math.round(SR * duration),
    end = duration - 1; // dernier temps = accord final
  const L = new Float32Array(N),
    R = new Float32Array(N); // bus musique (nappe, basse, arpège) — pompé par le kick
  const DL = new Float32Array(N),
    DR = new Float32Array(N); // bus direct (kick, percus, bruitages)
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

  // Ajoute une voix : fn(t local) → échantillon, avec panoramique
  const add = (bl, br, start, len, pan, fn) => {
    const s0 = Math.round(start * SR),
      n = Math.round(len * SR);
    const gl = Math.cos(((pan + 1) * Math.PI) / 4),
      gr = Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = Math.max(0, -s0); i < n && s0 + i < N; i++) {
      const v = fn(i / SR);
      bl[s0 + i] += v * gl;
      br[s0 + i] += v * gr;
    }
  };

  for (let bar = 0; bar * 2 < duration; bar++) {
    const t0 = bar * 2,
      chord = CHORDS[bar % 4];
    // Nappe douce, deux voix légèrement désaccordées gauche/droite (seule pendant le hook)
    chord.forEach((m, i) =>
      [-1, 1].forEach((side) => {
        const f = hz(m) * (1 + side * 0.003);
        add(L, R, t0 - 0.3, 2.6, side * 0.6, (t) => {
          const env = Math.min(1, t / 0.5) * Math.min(1, (2.6 - t) / 0.6);
          return (
            0.028 *
            env *
            (sin(f, t) +
              0.3 * M.tone * sin(2 * f, t) +
              0.08 * M.tone * sin(3 * f, t)) *
            (i === 0 ? 1.2 : 1)
          );
        });
      }),
    );
    // Basse : fondamentale tenue, à partir du drop
    const b0 = Math.max(t0, drop),
      bl = t0 + 2 - b0,
      fb = hz(ROOTS[bar % 4]);
    if (bl > 0)
      add(
        L,
        R,
        b0,
        bl,
        0,
        (t) =>
          0.2 *
          Math.min(1, t / 0.02) *
          Math.min(1, (bl - t) / 0.1) *
          (sin(fb, t) + 0.25 * sin(2 * fb, t)),
      );
    // Arpège en croches avec écho pointé
    for (let k = 0; k < 8; k++) {
      const t1 = t0 + k * 0.25;
      if (t1 < arp || t1 >= end || k % M.arpEvery) continue;
      const f = hz(chord[V.arp[k]] + 12);
      [
        [0, 1],
        [0.375, 0.35],
        [0.75, 0.12],
      ].forEach(([d, g], e) =>
        add(
          L,
          R,
          t1 + d,
          0.4,
          (k % 2 ? 0.5 : -0.5) * (e % 2 ? -1 : 1),
          (t) =>
            0.055 *
            g *
            Math.exp(-t / 0.09) *
            (sin(f, t) + 0.3 * M.tone * sin(3 * f, t)),
        ),
      );
    }
  }

  // Rythmique
  const kicks = [];
  for (let t0 = drop; t0 <= end; t0 += 0.25) {
    const onBeat = Math.round((t0 - drop) * 4) % 2 === 0;
    if (t0 === drop || V.kick.includes(Math.round(t0 * 4) % 8)) {
      kicks.push(t0);
      add(
        DL,
        DR,
        t0,
        0.3,
        0,
        (t) =>
          0.5 *
          Math.exp(-t / 0.09) *
          Math.sin(
            2 * Math.PI * (45 * t + (65 / 30) * (1 - Math.exp(-30 * t))),
          ),
      );
    }
    if (!onBeat) continue;
    if (t0 >= arp && t0 < end) {
      let prev = 0;
      add(DL, DR, t0 + 0.25, 0.06, 0.3, (t) => {
        const n = rnd(),
          v = n - prev;
        prev = n;
        return 0.03 * Math.exp(-t / 0.015) * v;
      });
    } // charley
    if (t0 >= clap && t0 < end && Math.round((t0 - clap) * 2) % 2 === 1) {
      let lp = 0;
      add(DL, DR, t0, 0.15, -0.1, (t) => {
        lp += 0.35 * (rnd() - lp);
        return 0.09 * Math.exp(-t / 0.04) * lp;
      });
    } // clap un temps sur deux
  }

  // Bruitages, dans la tonalité
  const bell = (t0, m, g, dec = 0.5, pan = 0) => {
    const f = hz(snap(m) + V.key);
    add(
      DL,
      DR,
      t0,
      dec * 5,
      pan,
      (t) =>
        g *
        Math.exp(-t / dec) *
        (sin(f, t) + 0.35 * sin(2.01 * f, t) + 0.1 * sin(3.02 * f, t)),
    );
  };
  bells.forEach(([t0, m, g, dec], i) =>
    bell(t0, m, g, dec, i % 2 ? 0.3 : -0.3),
  );
  taps.forEach((t0) =>
    add(
      DL,
      DR,
      t0,
      0.06,
      0,
      (t) => 0.1 * Math.exp(-t / 0.012) * (sin(hz(88), t) + 0.3 * rnd()),
    ),
  );
  whooshes.forEach(([t0, len, g]) => {
    let lp = 0;
    add(DL, DR, t0, len, 0, (t) => {
      const k = t / len;
      lp += (0.02 + 0.25 * k) * (rnd() - lp);
      return g * Math.sin(Math.PI * k) ** 2 * lp;
    });
  });
  bell(drop, 81, 0.05, 0.9);
  [72, 76, 79, 84].forEach((m, i) =>
    bell(end + i * 0.03, m, 0.04, 0.7, i % 2 ? 0.4 : -0.4),
  ); // accord final

  // Mixage : la musique respire sous le kick, limiteur doux, fondus
  const out = Buffer.alloc(44 + N * 4);
  let ki = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    while (ki + 1 < kicks.length && kicks[ki + 1] <= t) ki++;
    const duck =
      t >= kicks[0] ? 1 - 0.4 * Math.exp(-(t - kicks[ki]) / 0.12) : 1;
    const fade = Math.min(1, t / 0.05) * Math.min(1, (duration - t) / 0.9);
    [L[i] * duck + DL[i], R[i] * duck + DR[i]].forEach((v, c) =>
      out.writeInt16LE(
        Math.round(Math.tanh(v * 1.5) * 0.9 * fade * 32767),
        44 + i * 4 + c * 2,
      ),
    );
  }
  out.write("RIFF", 0);
  out.writeUInt32LE(36 + N * 4, 4);
  out.write("WAVEfmt ", 8);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(2, 22);
  out.writeUInt32LE(SR, 24);
  out.writeUInt32LE(SR * 4, 28);
  out.writeUInt16LE(4, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(N * 4, 40);
  fs.writeFileSync(outPath, out);
};
