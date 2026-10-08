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
};
