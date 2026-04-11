"use client";

import { FillEstimate } from "@/components/FillEstimate";
import { TrendIndicator } from "@/components/TrendIndicator";
import { FuelType } from "@/lib/constants";
import { getPriceLevel, getPriceTextColor } from "@/lib/priceColor";
import {
  formatPriceAge,
  FRESHNESS_DOT_COLORS,
  FRESHNESS_TEXT_COLORS,
  getPriceFreshness,
} from "@/lib/priceFreshness";
import { buildTrendKey } from "@/lib/priceTrends";
import { cn, formatPrice } from "@/lib/utils";
import { FuelPrice, FuelStats, useAppStore } from "@/store/useAppStore";

interface PriceCardProps {
  price?: FuelPrice;
  fuelType?: FuelType;
  selectedFuel: string;
  filteredStats: FuelStats | null;
  inlineEstimate?: boolean;
  distanceKm?: number | null;
  stationId: string;
  isRupture?: boolean;
}

export const PriceCard = ({
  price,
  fuelType,
  selectedFuel,
  filteredStats,
  inlineEstimate = false,
  distanceKm,
  stationId,
  isRupture = false,
}: PriceCardProps) => {
  const priceTrends = useAppStore((s) => s.priceTrends);
  const arePriceTrendsLoading = useAppStore((s) => s.arePriceTrendsLoading);

  const resolvedFuelType = price?.fuel_type ?? fuelType;
  const isSelected = resolvedFuelType === selectedFuel;

  const trendDirection =
    priceTrends[buildTrendKey(stationId, resolvedFuelType as FuelType)] ?? null;
  const priceColor = price ? getPriceTextColor(price.price, filteredStats) : "";
  const priceLevel = price ? getPriceLevel(price.price, filteredStats) : null;

  let diffBadge = null;
  if (filteredStats && priceLevel && price) {
    const diff = price.price - filteredStats.median;
    const colorClass =
      priceLevel === "good"
        ? "bg-emerald-500/10 text-emerald-500"
        : priceLevel === "bad"
          ? "bg-rose-500/10 text-rose-500"
          : "bg-amber-500/10 text-amber-500";
    diffBadge = (
      <span
        className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${colorClass}`}
      >
        {`${diff > 0 ? "+ " : "- "}${formatPrice(Math.abs(diff))}`}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border p-3 transition-all",
        isRupture
          ? isSelected
            ? "border-red-200 bg-red-50/50 shadow-sm"
            : "border-red-100/50 bg-red-50/20"
          : isSelected
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-border/50 bg-muted/30",
      )}
    >
      {/* Ligne 1 : carburant + badge diff */}
      <div className="mb-1 flex items-center justify-between">
        <span className="text-muted-foreground flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase">
          {resolvedFuelType}
          <TrendIndicator
            direction={trendDirection}
            isLoading={arePriceTrendsLoading}
          />
        </span>
        {diffBadge}
      </div>

      {/* Ligne 2 : prix (ou placeholder rupture) + unité + estimation inline */}
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            "font-mono text-xl font-extrabold tracking-tighter",
            isRupture ? "text-red-400" : priceColor,
          )}
        >
          {isRupture ? "-.--" : price?.price.toFixed(3)}
        </span>
        <span className="text-xs font-semibold opacity-70">€/L</span>
        {!isRupture && inlineEstimate && price && (
          <FillEstimate pricePerLiter={price.price} inline />
        )}
      </div>

      {/* Estimation plein (vue étendue) — spacer invisible si rupture pour aligner la ligne suivante */}
      {!inlineEstimate &&
        (isRupture ? (
          <span
            className="text-[10px] opacity-0 select-none"
            aria-hidden="true"
          >
            —
          </span>
        ) : (
          price && (
            <FillEstimate pricePerLiter={price.price} distanceKm={distanceKm} />
          )
        ))}

      {/* Fraîcheur ou indicateur rupture */}
      {isRupture ? (
        <div className="mt-1 flex items-center gap-1">
          <span className="size-1.5 shrink-0 rounded-full bg-red-500" />
          <span className="text-[10px] font-bold text-red-500">Rupture</span>
        </div>
      ) : (
        price?.updated_at &&
        (() => {
          const freshness = getPriceFreshness(price.updated_at);
          const label = formatPriceAge(price.updated_at);
          if (!label) return null;
          return (
            <div className="mt-1 flex items-center gap-1">
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  FRESHNESS_DOT_COLORS[freshness],
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-bold",
                  FRESHNESS_TEXT_COLORS[freshness],
                )}
              >
                {label}
              </span>
            </div>
          );
        })()
      )}
    </div>
  );
};
