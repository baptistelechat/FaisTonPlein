"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/use-media-query";
import { getStationNamesDb } from "@/lib/stationName";
import { calculateDistance, cn } from "@/lib/utils";
import { Station, useAppStore } from "@/store/useAppStore";
import { StationLogo } from "@/components/StationLogo";
import { Euro, Loader, Navigation, Route } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import StationListStats from "./components/StationListStats";

const PAGE_SIZE = 15;

export function StationList() {
  const {
    stations,
    stats,
    userLocation,
    searchLocation,
    selectedFuel,
    setSelectedStation,
    setFlyToStation,
    listSortBy,
    setListSortBy,
    bestPriceStationId,
    bestDistanceStationId,
    resolvedNames,
    setResolvedName,
  } = useAppStore();

  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Use search location if available, otherwise fallback to user location
  const referenceLocation = searchLocation || userLocation;

  const sortedStations = useMemo(() => {
    // Filter stations that have the selected fuel
    const stationsWithFuel = stations.filter((s) =>
      s.prices.some((p) => p.fuel_type === selectedFuel),
    );

    if (!referenceLocation) return stationsWithFuel;

    return [...stationsWithFuel].sort((a, b) => {
      const priceA = a.prices.find((p) => p.fuel_type === selectedFuel)?.price;
      const priceB = b.prices.find((p) => p.fuel_type === selectedFuel)?.price;

      if (listSortBy === "price") {
        if (!priceA) return 1;
        if (!priceB) return -1;
        return priceA - priceB;
      } else {
        const distA = calculateDistance(
          referenceLocation[1], // lat
          referenceLocation[0], // lon
          a.lat,
          a.lon,
        );
        const distB = calculateDistance(
          referenceLocation[1], // lat
          referenceLocation[0], // lon
          b.lat,
          b.lon,
        );
        return distA - distB;
      }
    });
  }, [stations, referenceLocation, selectedFuel, listSortBy]);

  // Derived state: reset visibleCount quand sortedStations change (pattern React getDerivedStateFromProps)
  const [prevSortedStations, setPrevSortedStations] = useState(sortedStations);
  if (prevSortedStations !== sortedStations) {
    setPrevSortedStations(sortedStations);
    setVisibleCount(PAGE_SIZE);
  }

  const visibleStations = useMemo(
    () => sortedStations.slice(0, visibleCount),
    [sortedStations, visibleCount],
  );

  // Résolution bulk des noms pour les stations visibles uniquement
  useEffect(() => {
    const unresolved = visibleStations.filter(
      (s) => s.name === "Station service" && !resolvedNames[String(s.id)],
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

  if (sortedStations.length === 0) {
    return (
      <div
        className={cn(
          "text-muted-foreground flex h-full flex-col items-center gap-4 p-4 text-center",
          isDesktop ? "justify-center" : "justify-start",
        )}
      >
        <Loader className="size-8 animate-spin" />
        Aucune station trouvée proposant ce carburant dans cette zone.
      </div>
    );
  }

  // Full View (Vertical List)
  const currentStats = stats[selectedFuel];
  const q1 = currentStats?.p25;
  const q3 = currentStats?.p75;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
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

      <ScrollArea className="mr-1 h-px flex-1 pb-4">
        <div className="flex flex-col gap-3 px-4 pb-40 md:pb-4">
          {visibleStations.map((station) => (
            <StationCard
              key={station.id}
              station={station}
              selectedFuel={selectedFuel}
              referenceLocation={referenceLocation}
              q1={q1}
              q3={q3}
              bestPriceStationId={bestPriceStationId}
              bestDistanceStationId={bestDistanceStationId}
              onClick={() => handleStationClick(station)}
            />
          ))}
          <div ref={sentinelRef} className="h-1" />
        </div>
      </ScrollArea>
    </div>
  );
}

interface StationCardProps {
  station: Station;
  selectedFuel: string;
  referenceLocation: [number, number] | null;
  q1?: number;
  q3?: number;
  bestPriceStationId: string | null;
  bestDistanceStationId: string | null;
  onClick: () => void;
}

function StationCard({
  station,
  selectedFuel,
  referenceLocation,
  q1,
  q3,
  bestPriceStationId,
  bestDistanceStationId,
  onClick,
}: StationCardProps) {
  const resolvedName = useAppStore((s) => s.resolvedNames[String(station.id)]);
  const displayName = resolvedName ?? station.name;
  const isNameLoading =
    station.name === "Station service" && resolvedName === undefined;
  const price = station.prices.find((p) => p.fuel_type === selectedFuel);
  const distance = referenceLocation
    ? calculateDistance(
        referenceLocation[1], // lat
        referenceLocation[0], // lon
        station.lat,
        station.lon,
      )
    : null;

  let priceColor = "text-foreground";
  if (price && typeof q1 === "number" && typeof q3 === "number") {
    if (price.price < q1) priceColor = "text-emerald-600";
    else if (price.price > q3) priceColor = "text-rose-600";
    else priceColor = "text-amber-600";
  }

  return (
    <Card
      className={cn("hover:bg-muted/50 cursor-pointer p-4 transition-all")}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {isNameLoading ? (
            <Skeleton className="size-6 shrink-0 rounded-md" />
          ) : (
            <StationLogo name={displayName} size="sm" />
          )}
          <div className="flex flex-col gap-1 overflow-hidden">
          <div className="flex items-center gap-2">
            <h3 className="flex items-center gap-2 truncate text-sm font-semibold">
              {isNameLoading ? <Skeleton className="h-4 w-28" /> : displayName}
              {station.id === bestPriceStationId && (
                <Euro className="size-4 text-yellow-500" />
              )}
              {station.id === bestDistanceStationId && (
                <Route className="size-4 text-yellow-500" />
              )}
            </h3>
          </div>
          <div className="text-muted-foreground flex min-w-0 items-center gap-2 text-xs">
            {distance !== null && (
              <span className="text-primary/80 flex shrink-0 items-center gap-0.5 whitespace-nowrap">
                <Navigation className="size-3" />
                {distance.toFixed(1)} km
              </span>
            )}
            <span className="truncate">{station.address}</span>
          </div>
        </div>
        </div>

        <div className="flex flex-col items-end">
          {price ? (
            <>
              <span className={cn("font-mono text-lg font-bold", priceColor)}>
                {price.price.toFixed(3)}
                <span className="text-muted-foreground ml-0.5 text-xs font-normal">
                  €
                </span>
              </span>
            </>
          ) : (
            <span className="text-muted-foreground text-xs">-</span>
          )}
        </div>
      </div>
    </Card>
  );
}
