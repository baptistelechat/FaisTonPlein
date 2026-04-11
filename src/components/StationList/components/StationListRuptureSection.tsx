"use client";

import { ChevronDown, ChevronRight, Fuel } from "lucide-react";
import type { Station } from "@/store/useAppStore";
import type { FuelType } from "@/lib/constants";
import type { FuelStats } from "@/store/useAppStore";
import { StationCard } from "./StationCard";

interface StationListRuptureSectionProps {
  ruptureStations: Station[];
  ruptureOpen: boolean;
  setRuptureOpen: (open: (prev: boolean) => boolean) => void;
  selectedFuel: FuelType;
  referenceLocation: [number, number] | null;
  currentStats: FuelStats | null;
  handleStationClick: (station: Station) => void;
}

export function StationListRuptureSection({
  ruptureStations,
  ruptureOpen,
  setRuptureOpen,
  selectedFuel,
  referenceLocation,
  currentStats,
  handleStationClick,
}: StationListRuptureSectionProps) {
  return (
    <div className="border-border/50 mt-2 border-t pt-2">
      <button
        className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 py-2 text-xs font-semibold transition-colors"
        onClick={() => setRuptureOpen((o) => !o)}
      >
        {ruptureOpen ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ChevronRight className="size-3.5" />
        )}
        <Fuel className="size-3.5 text-red-400" />
        <span className="text-red-500">
          Stations en rupture ({ruptureStations.length})
        </span>
      </button>
      {ruptureOpen && (
        <div className="flex flex-col gap-3 pt-1">
          {ruptureStations.map((station) => (
            <StationCard
              key={station.id}
              station={station}
              selectedFuel={selectedFuel}
              referenceLocation={referenceLocation}
              filteredStats={currentStats}
              bestPriceStationIds={[]}
              bestDistanceStationIds={[]}
              bestRealCostStationIds={[]}
              isRupture
              onClick={() => handleStationClick(station)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
