"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFilteredStats } from "@/hooks/useFilteredStats";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useStationName } from "@/hooks/useStationName";
import { DRAWER_SNAP_POINTS } from "@/lib/constants";
import { cn, getStationDistance } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { CreditCard } from "lucide-react";
import { PriceCard } from "./components/PriceCard";
import { StationDetailActions } from "./components/StationDetailActions";
import { StationDetailHeader } from "./components/StationDetailHeader";

interface StationDetailProps {
  mobileDrawerSnap?: number | string | null;
}

export function StationDetail({ mobileDrawerSnap }: StationDetailProps) {
  const {
    selectedStation,
    selectedFuel,
    bestPriceStationIds,
    bestDistanceStationIds,
    bestRealCostStationIds,
    userLocation,
    searchLocation,
    roadDistances,
    roadDurations,
    distanceMode,
  } = useAppStore();

  const filteredStats = useFilteredStats();
  const selectedStationId = selectedStation?.id ?? null;
  const isBestPrice =
    selectedStationId !== null &&
    bestPriceStationIds.includes(selectedStationId);
  const isBestDistance =
    selectedStationId !== null &&
    bestDistanceStationIds.includes(selectedStationId);
  const isBestRealCost =
    selectedStationId !== null &&
    bestRealCostStationIds.includes(selectedStationId);

  const { name: stationName, isLoading: nameIsLoading } =
    useStationName(selectedStation);
  const { data: priceHistory, isLoading: isPriceHistoryLoading } =
    usePriceHistory();

  if (!selectedStation) return null;

  const referenceLocation = searchLocation || userLocation;
  const haversineDistance = referenceLocation
    ? getStationDistance(selectedStation, referenceLocation)
    : null;
  const roadDistance = roadDistances[selectedStation.id] ?? null;
  const distanceKm =
    distanceMode === "road" && roadDistance !== null
      ? roadDistance
      : haversineDistance;
  const isExactDistance = distanceMode === "road" && roadDistance !== null;
  const durationSeconds =
    distanceMode === "road"
      ? (roadDurations[selectedStation.id] ?? null)
      : null;

  const isSelectedFuelRupture = selectedStation.ruptureFuels.includes(
    selectedFuel as (typeof selectedStation.ruptureFuels)[number],
  );

  const selectedPrice = selectedStation.prices.find(
    (p) => p.fuel_type === selectedFuel,
  );
  const sortedPrices = [...selectedStation.prices].sort(
    (a, b) =>
      Number(b.fuel_type === selectedFuel) -
      Number(a.fuel_type === selectedFuel),
  );

  return (
    <ScrollArea className="bg-background animate-in slide-in-from-bottom h-full duration-300">
      <div
        className={cn(
          "flex flex-col space-y-6 p-6 py-0 md:pb-6",
          mobileDrawerSnap === DRAWER_SNAP_POINTS.EXPANDED && "pb-44",
        )}
      >
        <StationDetailHeader
          station={selectedStation}
          stationName={stationName}
          nameIsLoading={nameIsLoading}
          distanceKm={distanceKm}
          isExactDistance={isExactDistance}
          durationSeconds={durationSeconds}
          isBestPrice={isBestPrice}
          isBestDistance={isBestDistance}
          isBestRealCost={isBestRealCost}
        />

        {mobileDrawerSnap === DRAWER_SNAP_POINTS.DEFAULT &&
          (selectedPrice ? (
            <PriceCard
              price={selectedPrice}
              selectedFuel={selectedFuel}
              filteredStats={filteredStats[selectedPrice.fuel_type] ?? null}
              inlineEstimate
              distanceKm={distanceKm}
              stationId={selectedStation.id}
            />
          ) : isSelectedFuelRupture ? (
            <PriceCard
              fuelType={selectedFuel}
              selectedFuel={selectedFuel}
              filteredStats={null}
              inlineEstimate
              distanceKm={distanceKm}
              stationId={selectedStation.id}
              isRupture
            />
          ) : null)}

        {(mobileDrawerSnap === DRAWER_SNAP_POINTS.EXPANDED ||
          !mobileDrawerSnap) && (
          <>
            <div className="grid grid-cols-2 gap-4">
              {isSelectedFuelRupture && (
                <PriceCard
                  fuelType={selectedFuel}
                  selectedFuel={selectedFuel}
                  filteredStats={null}
                  distanceKm={distanceKm}
                  stationId={selectedStation.id}
                  isRupture
                />
              )}
              {sortedPrices.map((price) => (
                <PriceCard
                  price={price}
                  selectedFuel={selectedFuel}
                  key={price.fuel_type}
                  filteredStats={filteredStats[price.fuel_type] ?? null}
                  distanceKm={distanceKm}
                  stationId={selectedStation.id}
                />
              ))}
            </div>

            <StationDetailActions
              lat={selectedStation.lat}
              lon={selectedStation.lon}
              priceHistory={priceHistory}
              isPriceHistoryLoading={isPriceHistoryLoading}
              selectedFuel={selectedFuel}
              isSelectedFuelRupture={isSelectedFuelRupture}
            />

            {selectedStation.services &&
              selectedStation.services.length > 0 && (
                <div className="border-border/50 space-y-3 border-t pt-4">
                  <h4 className="text-muted-foreground flex items-center gap-2 text-sm font-bold tracking-wider uppercase">
                    <CreditCard className="size-4" />
                    Services disponibles
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedStation.services.map((service) => (
                      <Badge
                        key={service}
                        variant="outline"
                        className="bg-background/80 hover:bg-background border-border/60 rounded-full px-3 py-1 font-medium shadow-sm transition-colors"
                      >
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
          </>
        )}
      </div>
    </ScrollArea>
  );
}
