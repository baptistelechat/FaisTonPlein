import { FUEL_TYPES, HF_LATEST_BASE_URL, type FuelType } from "@/lib/constants";
import {
  computeNationalPrices,
  type NationalMetadata,
} from "@/lib/nationalPrices";
import type { CalculateMetadataFunction } from "remotion";
import { z } from "zod";
import { MUSIC_CHOICES } from "../../kit/music";
import { SFX_PACKS } from "../../kit/sfx";

const FUELS = FUEL_TYPES.map((f) => f.type) as [FuelType, ...FuelType[]];

const detourStation = z.object({
  address: z.string(),
  city: z.string(),
  price: z.number(),
  km: z.number(),
});

// Schéma Zod : le Studio en tire un formulaire (dont le sélecteur de pack de bruitages).
export const shortSchema = z.object({
  sfxPack: z.enum(SFX_PACKS),
  // Musique de fond : pistes créditées + aperçus du shortlist, à comparer dans le Studio.
  music: z.enum(MUSIC_CHOICES),
  musicVolume: z.number().min(0).max(1).step(0.01),
  // Relevé réel tiré des Parquet « latest » (stations hors autoroute).
  local: z.object({
    city: z.string(),
    date: z.string(),
    fuel: z.enum(FUELS),
    radiusKm: z.number(),
    center: z.tuple([z.number(), z.number()]),
    count: z.number(),
    min: z.number(),
    max: z.number(),
    p25: z.number(),
    p75: z.number(),
    stations: z.array(
      z.object({ lat: z.number(), lon: z.number(), price: z.number() }),
    ),
  }),
  detour: z.object({
    tankLiters: z.number(),
    consumption: z.number(),
    far: detourStation,
    near: detourStation,
  }),
  // Rempli au rendu par calculateMetadata : la tendance affichée est toujours à jour.
  national: z
    .object({
      fuel: z.enum(FUELS),
      avg: z.number(),
      delta: z.number().nullable(),
      spanDays: z.number().nullable(),
      series: z.array(z.object({ date: z.string(), value: z.number() })),
    })
    .nullable(),
});

export type ShortProps = z.infer<typeof shortSchema>;
export type DetourStation = z.infer<typeof detourStation>;

const TREND_FUEL: FuelType = "Gazole";
const DAY_MS = 86_400_000;

export const calculateMetadata: CalculateMetadataFunction<ShortProps> = async ({
  props,
  abortSignal,
}) => {
  const res = await fetch(`${HF_LATEST_BASE_URL}/metadata.json`, {
    signal: abortSignal,
  });
  if (!res.ok) throw new Error(`metadata.json : HTTP ${res.status}`);
  const meta = (await res.json()) as NationalMetadata;

  const { prices, spanDays } = computeNationalPrices(meta);
  const current = prices.find((p) => p.fuel === TREND_FUEL);
  if (!current) throw new Error(`Pas de prix national pour ${TREND_FUEL}`);

  const cutoff = new Date(Date.now() - (spanDays ?? 21) * DAY_MS)
    .toISOString()
    .slice(0, 10);
  const series = (meta.fuel_history ?? []).flatMap((point) => {
    const value = point[TREND_FUEL];
    return point.date >= cutoff && typeof value === "number"
      ? [{ date: point.date, value }]
      : [];
  });

  return {
    props: {
      ...props,
      national: {
        fuel: TREND_FUEL,
        avg: current.avg,
        delta: current.delta,
        spanDays,
        series,
      },
    },
  };
};
