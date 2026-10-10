// Thème FaisTonPlein pour le kit brag-series — relevé dans src/app/globals.css, layout.tsx et lib/constants.ts
window.THEME = {
  name: "FaisTonPlein",
  url: "faistonplein.vercel.app",
  logo: "../../public/icon.svg",
  fonts: {
    href: "https://fonts.googleapis.com/css2?family=Manrope:wght@500;700&family=Space+Grotesk:wght@500;700&display=block",
    heading: "Space Grotesk",
    body: "Manrope",
  },
  // slate-950, indigo-600 (primary), niveaux de prix emerald / amber / rose
  colors: {
    bg: "#020617",
    fg: "#f8fafc",
    primary: "#4f39f6",
    "primary-soft": "#a3b3ff",
    good: "#00d492",
    bad: "#ff637e",
    amber: "#ffba00",
    muted: "#90a1b9",
    surface: "#0f172b",
    "surface-border": "#1d293d",
    ring: "#00bc7d",
  },
  // Pastilles de l'outro = FUEL_TYPES de l'app (teinte 600)
  pills: [
    ["Gazole", "#d08700"],
    ["E10", "#00a63e"],
    ["SP95", "#009966"],
    ["SP98", "#009966"],
    ["E85", "#0084d1"],
    ["GPLc", "#45556c"],
  ],
  outroFoot: "Prix officiels data.gouv.fr · mis à jour toutes les 2 h",
  // Ambiance sonore de la série : la mineur naturel, accords doux, rythme régulier ou légèrement syncopé
  music: {
    mood: "posé, confiant, un peu nocturne",
    scale: [0, 2, 3, 5, 7, 8, 10],
    keys: [-5, 6],
    degrees: [0, 2, 3, 4, 5, 6],
    kicks: [
      [0, 2, 4, 6],
      [0, 3, 6],
      [0, 4, 5],
      [0, 3, 4, 6],
    ],
    // Morceaux des vidéos 01 à 06, figés : la 01 est publiée. Ne pas les modifier.
    // prettier-ignore
    tracks: {
      1: { key: 0, chords: [[57, 60, 64, 67], [53, 57, 60, 64], [52, 55, 60, 64], [50, 55, 59, 62]], roots: [33, 29, 36, 31], arp: [0, 2, 1, 3, 2, 1, 3, 2], kick: [0, 2, 4, 6] },
      2: { key: 3, chords: [[53, 57, 60, 64], [50, 55, 59, 62], [57, 60, 64, 67], [57, 60, 64, 67]], roots: [29, 31, 33, 33], arp: [0, 1, 2, 3, 0, 1, 2, 3], kick: [0, 3, 6] },
      3: { key: -2, chords: [[57, 60, 64, 67], [52, 55, 59, 62], [53, 57, 60, 64], [50, 55, 59, 62]], roots: [33, 28, 29, 31], arp: [3, 2, 1, 0, 3, 2, 1, 0], kick: [0, 2, 4, 6] },
      4: { key: 5, chords: [[50, 53, 57, 60], [50, 55, 59, 62], [48, 52, 55, 59], [57, 60, 64, 67]], roots: [38, 31, 36, 33], arp: [0, 2, 3, 2, 1, 2, 3, 1], kick: [0, 4, 5] },
      5: { key: -4, chords: [[57, 60, 64, 67], [53, 57, 60, 64], [50, 53, 57, 60], [52, 55, 59, 62]], roots: [33, 29, 38, 28], arp: [0, 3, 1, 3, 2, 3, 1, 3], kick: [0, 3, 6] },
      6: { key: 2, chords: [[52, 55, 60, 64], [50, 55, 59, 62], [57, 60, 64, 67], [53, 57, 60, 64]], roots: [36, 31, 33, 29], arp: [0, 1, 2, 1, 3, 2, 1, 2], kick: [0, 2, 4, 6] },
    },
  },
};
