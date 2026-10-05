// Bande-son de la série, synthétisée : musique + bruitages écrits ensemble, en la mineur, 120 BPM (1 temps = 0,5 s).
// Même morceau pour toutes les vidéos ; seuls les repères (cues) changent :
//   duration, drop (entrée du beat = reveal), arp (entrée de l'arpège), clap (entrée du clap),
//   taps [t], whooshes [[t, durée, gain]], bells [[t, note MIDI, gain, déclin]]
// Les repères rythmiques doivent tomber sur un temps (multiples de 0,5 s).
const fs = require("node:fs");
const SR = 44100;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const sin = (f, t) => Math.sin(2 * Math.PI * f * t);
const CHORDS = [
  [57, 60, 64, 67],
  [53, 57, 60, 64],
  [52, 55, 60, 64],
  [50, 55, 59, 62],
]; // Am7, Fmaj7, C/E, G
const ROOTS = [33, 29, 36, 31];

module.exports = (
  { duration, drop, arp, clap, taps, whooshes, bells },
  outPath,
) => {
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
            (sin(f, t) + 0.3 * sin(2 * f, t) + 0.08 * sin(3 * f, t)) *
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
      if (t1 < arp || t1 >= end) continue;
      const f = hz(chord[[0, 2, 1, 3, 2, 1, 3, 2][k]] + 12);
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
            0.055 * g * Math.exp(-t / 0.09) * (sin(f, t) + 0.3 * sin(3 * f, t)),
        ),
      );
    }
  }

  // Rythmique
  const kicks = [];
  for (let t0 = drop; t0 <= end; t0 += 0.5) {
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
        Math.sin(2 * Math.PI * (45 * t + (65 / 30) * (1 - Math.exp(-30 * t)))),
    );
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
    const f = hz(m);
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
