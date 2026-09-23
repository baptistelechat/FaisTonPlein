import { FUEL_TYPES, type FuelType } from "@/lib/constants";

// Logique partagée entre l'og:image (serveur) et le totem des prix nationaux (client).

const DAY_MS = 86_400_000;
const TARGET_DAYS = 21; // fenêtre visée pour l'évolution
const MIN_DAYS = 7; // en dessous, le delta ne veut rien dire : on n'affiche rien

// En dessous, l'arrondi à 3 décimales donne "0,000" : c'est un équilibre, pas une hausse.
const FLAT_THRESHOLD = 0.0005;

export interface NationalMetadata {
  total_stations?: number;
  fuel_stats?: Partial<
    Record<FuelType, { avg: number | null; stations: number }>
  >;
  fuel_history?: { date: string; [fuel: string]: string | number }[];
}

export interface NationalFuelPrice {
  fuel: FuelType;
  avg: number;
  // null = pas de point de référence (pastille absente).
  delta: number | null;
}

export interface NationalPrices {
  prices: NationalFuelPrice[];
  // null tant que l'historique est trop jeune pour afficher une évolution.
  spanDays: number | null;
}

const daysAgo = (date: string) =>
  Math.round((Date.now() - new Date(`${date}T00:00:00Z`).getTime()) / DAY_MS);

export const isFlat = (d: number) => Math.abs(d) < FLAT_THRESHOLD;

export const formatPrice = (n: number) => n.toFixed(3);

// 3 décimales, comme les prix : un écart de 0,003 € reste une information.
export const formatDelta = (d: number) =>
  `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(3).replace(".", ",")}`;

export const computeNationalPrices = (
  meta: NationalMetadata,
): NationalPrices => {
  const history = Array.isArray(meta.fuel_history) ? meta.fuel_history : [];

  // Point de référence : le plus proche de 21 jours parmi ceux d'au moins 7 jours.
  const reference =
    history
      .filter((p) => daysAgo(p.date) >= MIN_DAYS)
      .sort(
        (a, b) =>
          Math.abs(daysAgo(a.date) - TARGET_DAYS) -
          Math.abs(daysAgo(b.date) - TARGET_DAYS),
      )[0] ?? null;

  const prices = FUEL_TYPES.flatMap(({ type: fuel }) => {
    const avg = meta.fuel_stats?.[fuel]?.avg;
    if (avg == null) return [];
    const past = reference?.[fuel];
    return [{ fuel, avg, delta: typeof past === "number" ? avg - past : null }];
  });

  return { prices, spanDays: reference ? daysAgo(reference.date) : null };
};
