"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useFilteredStations } from "@/hooks/useFilteredStations";
import { useFilteredStats } from "@/hooks/useFilteredStats";
import { DRAWER_SNAP_POINTS, RADIUS_OPTIONS } from "@/lib/constants";
import { getStationNamesDb } from "@/lib/stationName";
import { calculateDistance, capitalize, cn } from "@/lib/utils";
import { Station, useAppStore } from "@/store/useAppStore";
import { formatRelative } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock, Euro, Route } from "lucide-react";
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
  const isMinimized = mobileDrawerSnap === DRAWER_SNAP_POINTS.MINIMIZED;
  const isListVisible =
    !mobileDrawerSnap || mobileDrawerSnap === DRAWER_SNAP_POINTS.EXPANDED;
  const {
    userLocation,
    searchLocation,
    selectedFuel,
    setSelectedStation,
    setFlyToStation,
    listSortBy,
    setListSortBy,
    bestPriceStationIds,
    bestDistanceStationIds,
    resolvedNames,
    setResolvedName,
    searchRadius,
    setSearchRadius,
    lastUpdate,
    isLoading,
  } = useAppStore();

  const majLabel = lastUpdate
    ? capitalize(
        formatRelative(new Date(lastUpdate), new Date(), { locale: fr }),
      )
    : null;

  const filteredStations = useFilteredStations();
  const allFilteredStats = useFilteredStats();

  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Use search location if available, otherwise fallback to user location
  const referenceLocation = searchLocation || userLocation;

  const sortedStations = useMemo(() => {
    if (!referenceLocation) return filteredStations;

    return [...filteredStations].sort((a, b) => {
      const priceA = a.prices.find((p) => p.fuel_type === selectedFuel)?.price;
      const priceB = b.prices.find((p) => p.fuel_type === selectedFuel)?.price;

      const distA =
        Math.round(
          calculateDistance(
            referenceLocation[1],
            referenceLocation[0],
            a.lat,
            a.lon,
          ) * 10,
        ) / 10;
      const distB =
        Math.round(
          calculateDistance(
            referenceLocation[1],
            referenceLocation[0],
            b.lat,
            b.lon,
          ) * 10,
        ) / 10;

      if (listSortBy === "price") {
        if (!priceA) return 1;
        if (!priceB) return -1;
        const priceDiff = priceA - priceB;
        if (priceDiff !== 0) return priceDiff;
        return distA - distB;
      } else {
        const distDiff = distA - distB;
        if (distDiff !== 0) return distDiff;
        if (!priceA) return 1;
        if (!priceB) return -1;
        return priceA - priceB;
      }
    });
  }, [filteredStations, referenceLocation, selectedFuel, listSortBy]);

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
  }, [sortedStations.length]);

  const handleStationClick = (station: Station) => {
    setSelectedStation(station);
    setFlyToStation(station);
  };

  // Full View (Vertical List)
  const currentStats = allFilteredStats[selectedFuel] ?? null;

  return (
    <div className="flex h-full flex-col">
      {/* Header : toujours visible */}
      <div className="flex items-center justify-between p-4 pb-2">
        <h2 className="text-lg font-bold">
          {listSortBy === "price" ? "Les plus économique" : "Autour de moi"}
        </h2>
        <div className="flex gap-2">
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
        </div>
      </div>

      {/* Tout le reste : masqué en mode minimized */}
      {!isMinimized && (
        <>
          <div className="flex flex-col gap-3 px-4 pb-3">
            {majLabel && (
              <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                <Clock className="size-3" />
                {`Mise à jour : ${majLabel}`}
              </span>
            )}

            <div className="flex flex-wrap items-center gap-1">
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
              <div className="ml-auto">
                <StationListSettings />
              </div>
            </div>

            {currentStats && (
              <div className="bg-muted/50 grid w-full grid-cols-[1fr_1fr_1fr_auto] items-center gap-3 rounded-lg p-3 text-sm">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold">Min.</span>
                  <span className="font-mono font-semibold text-emerald-600">
                    {currentStats.min.toFixed(3)}€
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold">Médiane</span>
                  <span className="font-mono font-semibold text-amber-600">
                    {currentStats.median.toFixed(3)}€
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold">Max.</span>
                  <span className="font-mono font-semibold text-rose-600">
                    {currentStats.max.toFixed(3)}€
                  </span>
                </div>
                <StationListStats statistics={currentStats} />
              </div>
            )}
          </div>

          {isListVisible && isLoading ? (
            <div className="flex-1 overflow-hidden">
              <div className="flex flex-col gap-3 px-4 pt-1 pb-4">
                {Array.from({ length: 20 }).map((_, i) => (
                  <StationCardSkeleton key={i} />
                ))}
              </div>
            </div>
          ) : isListVisible && sortedStations.length === 0 ? (
            <div
              className={cn(
                "text-muted-foreground flex flex-1 flex-col items-center gap-4 p-4 text-center",
                isDesktop ? "justify-center" : "justify-start",
              )}
            >
              Aucune station trouvée proposant ce carburant dans cette zone.
            </div>
          ) : isListVisible ? (
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
                      onClick={() => handleStationClick(station)}
                    />
                  ))}
                  <div ref={sentinelRef} className="h-1" />
                </div>
              </ScrollArea>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

