"use client";

import { formatPrice } from "@/lib/utils";
import type { FuelStats } from "@/store/useAppStore";
import StationListStats from "./StationListStats";

interface StationListStatBarProps {
  currentStats: FuelStats | null;
}

export function StationListStatBar({ currentStats }: StationListStatBarProps) {
  if (!currentStats) return null;

  return (
    <div className="flex flex-col gap-3 px-4 pb-3">
      <div className="bg-muted/50 grid w-full grid-cols-[1fr_1fr_1fr_auto] items-center gap-3 rounded-lg p-3 text-sm">
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold">Min.</span>
          <span className="font-mono font-semibold text-emerald-600">
            {formatPrice(currentStats.min)}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold">Médiane</span>
          <span className="font-mono font-semibold text-amber-600">
            {formatPrice(currentStats.median)}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold">Max.</span>
          <span className="font-mono font-semibold text-rose-600">
            {formatPrice(currentStats.max)}
          </span>
        </div>
        <StationListStats statistics={currentStats} />
      </div>
    </div>
  );
}
