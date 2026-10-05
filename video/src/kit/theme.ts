import { loadFont as loadSans } from "@remotion/google-fonts/Manrope";
import { loadFont as loadMono } from "@remotion/google-fonts/ShareTechMono";
import { loadFont as loadHeading } from "@remotion/google-fonts/SpaceGrotesk";

// Thème clair de l'app (src/app/globals.css), en hex sRGB : mêmes typos, mêmes teintes.
export const FONT = {
  heading: loadHeading("normal", { weights: ["700"], subsets: ["latin"] })
    .fontFamily,
  sans: loadSans("normal", { weights: ["500", "700"], subsets: ["latin"] })
    .fontFamily,
  mono: loadMono("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily,
};

export const C = {
  background: "#f8fafc", // slate-50
  foreground: "#0f172b", // slate-900
  card: "#ffffff",
  border: "#e2e8f0", // slate-200
  muted: "#737373", // --muted-foreground
  primary: "#4f39f6", // indigo-600
  primarySoft: "#e0e7ff", // indigo-100
  best: "#f0b100", // yellow-500 — pastille « meilleure station »
};

// Niveaux de prix de src/lib/priceColor.ts : texte 600, bordure 500, fond 50.
export const LEVEL = {
  good: { text: "#009966", border: "#00bc7d", bg: "#ecfdf5" },
  neutral: { text: "#e17100", border: "#fe9a00", bg: "#fffbeb" },
  bad: { text: "#ec003f", border: "#ff2056", bg: "#fff1f2" },
};

export type PriceLevel = keyof typeof LEVEL;

export const priceLevel = (
  price: number,
  p25: number,
  p75: number,
): PriceLevel => (price <= p25 ? "good" : price >= p75 ? "bad" : "neutral");

// Virgule décimale : la vidéo s'adresse à un public français.
export const fr = (n: number, digits = 2) =>
  n.toFixed(digits).replace(".", ",");
