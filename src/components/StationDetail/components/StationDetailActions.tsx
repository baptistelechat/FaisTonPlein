"use client";

import { Button } from "@/components/ui/button";
import analytics from "@/lib/analytics";
import type { FuelType } from "@/lib/constants";
import type { PriceHistoryPoint } from "@/lib/priceHistory";
import { useAppStore } from "@/store/useAppStore";
import { Navigation } from "lucide-react";
import { toast } from "sonner";
import { PriceHistoryChart } from "./PriceHistoryChart";

interface StationDetailActionsProps {
  lat: number;
  lon: number;
  priceHistory: PriceHistoryPoint[];
  isPriceHistoryLoading: boolean;
  selectedFuel: FuelType;
  isSelectedFuelRupture: boolean;
}

export function StationDetailActions({
  lat,
  lon,
  priceHistory,
  isPriceHistoryLoading,
  selectedFuel,
  isSelectedFuelRupture,
}: StationDetailActionsProps) {
  const listSortBy = useAppStore((s) => s.listSortBy);

  const handleNavigate = (url: string, destination: "google_maps" | "waze") => {
    window.open(url, "_blank");
    toast.info("Ouverture de l'itinéraire...");
    analytics.navigationLaunched({
      destination,
      fuelType: selectedFuel,
      sortMode: listSortBy,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 pt-2">
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() =>
            handleNavigate(
              `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
              "google_maps",
            )
          }
          size="lg"
          className="flex w-full gap-2"
        >
          <Navigation className="size-4" />
          Google Maps
        </Button>
        <Button
          onClick={() =>
            handleNavigate(
              `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`,
              "waze",
            )
          }
          size="lg"
          variant="outline"
          className="flex w-full gap-2"
        >
          <Navigation className="size-4" />
          Waze
        </Button>
      </div>
      <PriceHistoryChart
        data={priceHistory}
        isLoading={isPriceHistoryLoading}
        selectedFuel={selectedFuel}
        isRupture={isSelectedFuelRupture}
      />
    </div>
  );
}
