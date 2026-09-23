"use client";

import { FuelBadge } from "@/components/FuelBadge";
import type { NationalFuelPrice } from "@/lib/nationalPrices";
import { isFlat } from "@/lib/nationalPrices";
import { cn, formatPrice } from "@/lib/utils";

interface NationalPriceCardProps extends NationalFuelPrice {
  isSelected?: boolean;
  className?: string;
}

// Même structure que le PriceCard du détail station : carburant + badge d'écart
// en haut, prix en mono + unité grise dessous. Ici l'écart est celui de la moyenne
// nationale sur la période, pas celui de la station par rapport à la médiane locale.
export const NationalPriceCard = ({
  fuel,
  avg,
  delta,
  isSelected = false,
  className,
}: NationalPriceCardProps) => {
  const flat = delta != null && isFlat(delta);

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border p-2 transition-all",
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border/50 bg-muted/30",
        className,
      )}
    >
      {/* Comme un totem de station : carburant à gauche, prix à droite, écart dessous */}
      <div className="flex items-center justify-between gap-2">
        <FuelBadge fuel={fuel} className="px-3 py-1.5 text-sm" />
        <div className="flex flex-col items-end gap-1">
          {/* Prix + unité : même rendu que dans StationCard (liste des stations) */}
          <span className="font-mono text-lg leading-none font-bold">
            {avg.toFixed(3)}
            <span className="text-muted-foreground ml-0.5 text-xs font-normal">
              €/L
            </span>
          </span>
          {delta != null && (
            <span
              className={cn(
                "shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap",
                flat
                  ? "bg-amber-500/10 text-amber-500"
                  : delta > 0
                    ? "bg-rose-500/10 text-rose-500"
                    : "bg-emerald-500/10 text-emerald-500",
              )}
            >
              {flat
                ? "="
                : `${delta > 0 ? "+ " : "- "}${formatPrice(Math.abs(delta))}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
