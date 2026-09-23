import colors from "tailwindcss/colors";

const FALLBACK_HEX = "#64748b";

// Source unique pour passer d'un nom de couleur Tailwind (FUEL_TYPES[].color) à sa valeur.
export const resolveHex = (colorName: string, shade: number): string => {
  const entry = (colors as unknown as Record<string, unknown>)[colorName];
  if (typeof entry === "string") return entry;
  if (typeof entry === "object" && entry !== null) {
    return (entry as Record<number, string>)[shade] ?? FALLBACK_HEX;
  }
  return FALLBACK_HEX;
};
