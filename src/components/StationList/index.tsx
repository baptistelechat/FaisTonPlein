"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFilteredStations } from "@/hooks/useFilteredStations";
import { useFilteredStats } from "@/hooks/useFilteredStats";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useReferenceLocation } from "@/hooks/useReferenceLocation";
import { DRAWER_SNAP_POINTS, RADIUS_OPTIONS } from "@/lib/constants";
import { getStationNamesDb } from "@/lib/stationName";
import {
  calculateEffectiveCost,
  capitalize,
  cn,
  formatPrice,
  getStationDistance,
} from "@/lib/utils";
import { Station, useAppStore } from "@/store/useAppStore";
import { formatRelative } from "date-fns";
import { fr } from "date-fns/locale";
import { Calculator, Clock, Euro, Route } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { StationCard } from "./components/StationCard";
import { StationCardSkeleton } from "./components/StationCardSkeleton";
import StationListSettings from "./components/StationListSettings";
import StationListStats from "./components/StationListStats";

const PAGE_SIZE = 15;

interface StationListProps {
  mobileDrawerSnap?: number | string | null;
}

export function StationList({ mobileDrawerSnap }: StationListProps = {}) {
  // Vrai en mode desktop (pas de snap) ou quand le drawer est fully expanded
  const isExpanded =
    !mobileDrawerSnap || mobileDrawerSnap === DRAWER_SNAP_POINTS.EXPANDED;
  const {
    selectedFuel,
    setSelectedStation,
    setFlyToStation,
    listSortBy,
    setListSortBy,
    bestPriceStationIds,
    bestDistanceStationIds,
    bestRealCostStationIds,
    resolvedNames,
    setResolvedName,
    searchRadius,
    setSearchRadius,
    lastUpdate,
    isLoading,
    consumption,
    tankCapacity,
    fillHabit,
    roadDistances,
    isLoadingRoadDistances,
    distanceMode,
  } = useAppStore();

  const majLabel = lastUpdate
    ? capitalize(
        formatRelative(new Date(lastUpdate), new Date(), { locale: fr }),
      )
    : null;

  const filteredStations = useFilteredStations();
  const allFilteredStats = useFilteredStats();

  const isDesktop = useIsDesktop();

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const referenceLocation = useReferenceLocation();

  const canUseRealCost =
    consumption > 0 && tankCapacity > 0 && referenceLocation !== null;

  const sortedStations = useMemo(() => {
    if (!referenceLocation) return filteredStations;

    const fillAmount = tankCapacity * fillHabit;

    return [...filteredStations].sort((a, b) => {
      const priceA = a.prices.find((p) => p.fuel_type === selectedFuel)?.price;
      const priceB = b.prices.find((p) => p.fuel_type === selectedFuel)?.price;

      const distA = getStationDistance(a, referenceLocation, roadDistances)
      const distB = getStationDistance(b, referenceLocation, roadDistances)

      if (listSortBy === "real-cost") {
        if (!priceA) return 1;
        if (!priceB) return -1;
        const costA = calculateEffectiveCost({
          pricePerLiter: priceA,
          distanceKm: distA,
          fillAmount,
          consumption,
        }).total;
        const costB = calculateEffectiveCost({
          pricePerLiter: priceB,
          distanceKm: distB,
          fillAmount,
          consumption,
        }).total;
        const diff = costA - costB;
        if (diff !== 0) return diff;
        return distA - distB;
      }

      if (listSortBy === "price") {
        if (!priceA) return 1;
        if (!priceB) return -1;
        const priceDiff = priceA - priceB;
        if (priceDiff !== 0) return priceDiff;
        return distA - distB;
      }

      // distance (default)
      const distDiff = distA - distB;
      if (distDiff !== 0) return distDiff;
      if (!priceA) return 1;
      if (!priceB) return -1;
      return priceA - priceB;
    });
  }, [
    filteredStations,
    referenceLocation,
    selectedFuel,
    listSortBy,
    consumption,
    tankCapacity,
    fillHabit,
    roadDistances,
  ]);

  // Derived state pattern (React-recommended): reset pagination on filter change without extra effect
  const [prevSortedStations, setPrevSortedStations] = useState(sortedStations);
  if (prevSortedStations !== sortedStations) {
    setPrevSortedStations(sortedStations);
    setVisibleCount(PAGE_SIZE);
  }

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]',
    );
    if (viewport) viewport.scrollTop = 0;
  }, [sortedStations]);

  const visibleStations = useMemo(
    () => sortedStations.slice(0, visibleCount),
    [sortedStations, visibleCount],
  );

  // Résolution bulk des noms pour les stations visibles uniquement
  useEffect(() => {
    const unresolved = visibleStations.filter(
      (s) => !resolvedNames[String(s.id)],
    );
    if (unresolved.length === 0) return;

    getStationNamesDb().then((db) => {
      for (const station of unresolved) {
        setResolvedName(
          String(station.id),
          db[String(station.id)] ?? station.name,
        );
      }
    });
  }, [visibleStations, resolvedNames, setResolvedName]);

  // IntersectionObserver pour le chargement des stations suivantes
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + PAGE_SIZE, sortedStations.length),
          );
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sortedStations.length, isLoading, isLoadingRoadDistances]);

  const handleStationClick = (station: Station) => {
    setSelectedStation(station);
    setFlyToStation(station);
  };

  // Full View (Vertical List)
  const currentStats = allFilteredStats[selectedFuel] ?? null;

  return (
    <div className="flex h-full flex-col">
      {/* Header : toujours visible */}
      <div className="flex flex-col gap-2 p-4 pb-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold">
            {listSortBy === "price"
              ? "Les plus économiques"
              : listSortBy === "real-cost"
                ? "Meilleur rapport coût/trajet"
                : "Autour de moi"}
          </h2>
          {majLabel && (
            <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
              <Clock className="size-3" />
              {`Mise à jour : ${majLabel}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2  pr-3">
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={listSortBy === "distance" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setListSortBy("distance")}
              >
                <Route className="size-4" />
                Distance
              </Badge>
              <Badge
                variant={listSortBy === "price" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setListSortBy("price")}
              >
                <Euro className="size-4" />
                Prix
              </Badge>
              {canUseRealCost && (
                <Badge
                  variant={listSortBy === "real-cost" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setListSortBy("real-cost")}
                >
                  <Calculator className="size-4" />
                  Coût/trajet
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {RADIUS_OPTIONS.map((option) => (
                <Badge
                  key={option.value}
                  variant={
                    searchRadius === option.value ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => setSearchRadius(option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>
          <StationListSettings />
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-3">
        {currentStats && (
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
        )}
      </div>

      {isExpanded && (isLoading || (distanceMode === 'road' && isLoadingRoadDistances)) ? (
        <div className="flex-1 overflow-hidden">
          <div className="flex flex-col gap-3 px-4 pt-1 pb-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <StationCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : !isLoading && sortedStations.length === 0 ? (
        <div
          className={cn(
            "text-muted-foreground flex flex-1 flex-col items-center gap-4 p-4 text-center",
            isDesktop ? "justify-center" : "justify-start",
          )}
        >
          Aucune station trouvée proposant ce carburant dans cette zone.
        </div>
      ) : isExpanded ? (
        <div
          ref={scrollAreaRef}
          className="mr-1 flex h-px flex-1 flex-col overflow-hidden"
        >
          <ScrollArea className="h-full pb-4">
            <div className="flex flex-col gap-3 px-4 pb-32 md:pb-4">
              {visibleStations.map((station) => (
                <StationCard
                  key={station.id}
                  station={station}
                  selectedFuel={selectedFuel}
                  referenceLocation={referenceLocation}
                  filteredStats={currentStats}
                  bestPriceStationIds={bestPriceStationIds}
                  bestDistanceStationIds={bestDistanceStationIds}
                  bestRealCostStationIds={bestRealCostStationIds}
                  onClick={() => handleStationClick(station)}
                />
              ))}
              <div ref={sentinelRef} className="h-1" />
            </div>
          </ScrollArea>
        </div>
      ) : null}
    </div>
  );
}
