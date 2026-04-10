"use client";

import { StationLogo } from "@/components/StationLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useFilteredStats } from "@/hooks/useFilteredStats";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useStationName } from "@/hooks/useStationName";
import { DRAWER_SNAP_POINTS } from "@/lib/constants";
import { cn, formatDuration, getStationDistance } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import {
  Bird,
  Calculator,
  CreditCard,
  Euro,
  MapPin,
  Navigation,
  Road,
  Route,
} from "lucide-react";
import { toast } from "sonner";
import { PriceCard } from "./components/PriceCard";
import { PriceHistoryChart } from "./components/PriceHistoryChart";

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

  const selectedPrice = selectedStation.prices.find(
    (p) => p.fuel_type === selectedFuel,
  );
  const sortedPrices = [...selectedStation.prices].sort(
    (a, b) =>
      Number(b.fuel_type === selectedFuel) -
      Number(a.fuel_type === selectedFuel),
  );

  const handleNavigate = (url: string) => {
    window.open(url, "_blank");
    toast.info("Ouverture de l'itinéraire...");
  };

  return (
    <ScrollArea className="bg-background animate-in slide-in-from-bottom h-full duration-300">
      <div
        className={cn(
          "flex flex-col space-y-6 p-6 py-0 md:pb-6",
          mobileDrawerSnap === DRAWER_SNAP_POINTS.EXPANDED && "pb-44",
        )}
      >
        {/* Header */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {nameIsLoading ? (
                <Skeleton className="size-10 shrink-0 rounded-md" />
              ) : (
                <StationLogo name={stationName} size="md" />
              )}
              <h2 className="font-heading text-primary flex items-center gap-2 text-2xl font-bold tracking-tight">
                {nameIsLoading ? (
                  <Skeleton className="h-7 w-48" />
                ) : (
                  stationName
                )}
              </h2>
            </div>
            {selectedStation.is24h && (
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/5 text-emerald-500"
              >
                Ouvert 24/7
              </Badge>
            )}
          </div>
          {distanceKm !== null && (
            <p className="text-primary/80 flex items-center gap-1.5 text-sm">
              {isExactDistance ? (
                <Navigation className="size-3.5" />
              ) : (
                <Bird className="size-3.5" />
              )}
              {!isExactDistance && "~"}
              {distanceKm.toFixed(1)} km
              {durationSeconds !== null && (
                <span className="text-muted-foreground">
                  · ~{formatDuration(durationSeconds)}
                </span>
              )}
            </p>
          )}
          <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <MapPin className="size-3.5" />
            {selectedStation.address}
          </p>
          {(isBestPrice ||
            isBestDistance ||
            isBestRealCost ||
            selectedStation.isHighway) && (
            <div className="flex flex-wrap gap-2">
              {isBestPrice && (
                <Badge
                  variant="outline"
                  className="border-yellow-500/30 bg-yellow-500/10 text-yellow-600"
                >
                  <Euro className="size-3.5" />
                  Meilleur prix
                </Badge>
              )}
              {isBestDistance && (
                <Badge
                  variant="outline"
                  className="border-yellow-500/30 bg-yellow-500/10 text-yellow-600"
                >
                  <Route className="size-3.5" />
                  Plus proche
                </Badge>
              )}
              {isBestRealCost && (
                <Badge
                  variant="outline"
                  className="border-yellow-500/30 bg-yellow-500/10 text-yellow-600"
                >
                  <Calculator className="size-3.5" />
                  Meilleur coût/trajet
                </Badge>
              )}
              {selectedStation.isHighway && (
                <Badge
                  variant="outline"
                  className="border-blue-500/30 bg-blue-500/10 text-blue-600"
                >
                  <Road className="size-3.5" />
                  Autoroute
                </Badge>
              )}
            </div>
          )}
        </div>

        {mobileDrawerSnap === DRAWER_SNAP_POINTS.DEFAULT && selectedPrice && (
          <PriceCard
            price={selectedPrice}
            selectedFuel={selectedFuel}
            filteredStats={filteredStats[selectedPrice.fuel_type] ?? null}
            inlineEstimate
            distanceKm={distanceKm}
            stationId={selectedStation.id}
          />
        )}

        {(mobileDrawerSnap === DRAWER_SNAP_POINTS.EXPANDED ||
          !mobileDrawerSnap) && (
          <>
            {/* Pricing Grid */}
            <div className="grid grid-cols-2 gap-4">
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

            {/* Action Buttons */}
            <div className="grid grid-cols-1 gap-6 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() =>
                    handleNavigate(
                      `https://www.google.com/maps/dir/?api=1&destination=${selectedStation.lat},${selectedStation.lon}`,
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
                      `https://waze.com/ul?ll=${selectedStation.lat},${selectedStation.lon}&navigate=yes`,
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
              />
            </div>

            {/* Services */}
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
