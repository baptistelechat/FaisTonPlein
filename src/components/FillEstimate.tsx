"use client";

import { FILL_HABIT_OPTIONS } from "@/lib/constants";
import { calculateEffectiveCost } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

interface FillEstimateProps {
  pricePerLiter: number;
  inline?: boolean;
  distanceKm?: number | null;
}

const getFillLabel = (fillHabit: number, cost: string): string => {
  const option = FILL_HABIT_OPTIONS.find((o) => o.value === fillHabit)
  return option ? `${option.label} : ~${cost}€` : `~${cost}€ le plein`
};

export const FillEstimate = ({
  pricePerLiter,
  inline = false,
  distanceKm,
}: FillEstimateProps) => {
  const tankCapacity = useAppStore((s) => s.tankCapacity);
  const fillHabit = useAppStore((s) => s.fillHabit);
  const listSortBy = useAppStore((s) => s.listSortBy);
  const consumption = useAppStore((s) => s.consumption);

  if (tankCapacity <= 0) return null;

  const cost = (tankCapacity * fillHabit * pricePerLiter).toFixed(2);
  const displayText = getFillLabel(fillHabit, cost);

  const effectiveCostResult =
    listSortBy === "real-cost" && distanceKm != null && consumption > 0
      ? calculateEffectiveCost({
          pricePerLiter,
          distanceKm,
          fillAmount: tankCapacity * fillHabit,
          consumption,
        })
      : null;

  if (inline) {
    return (
      <span className="text-muted-foreground text-[10px] font-medium">
        {`(${displayText})`}
      </span>
    );
  }

  return (
    <>
      <span className="text-muted-foreground text-[10px] font-medium">
        {displayText}
      </span>
      {effectiveCostResult && (
        <span className="text-muted-foreground text-[10px] font-medium">
          + Trajet : {effectiveCostResult.travelCost.toFixed(2)}€
        </span>
      )}
      {effectiveCostResult && (
        <span className="border-border/60 text-foreground border-t pt-0.5 text-[10px] font-bold">
          = {effectiveCostResult.total.toFixed(2)}€ total
        </span>
      )}
    </>
  );
};
