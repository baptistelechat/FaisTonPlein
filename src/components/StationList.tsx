"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/use-media-query";
import { calculateDistance, cn } from "@/lib/utils";
import { Station, useAppStore } from "@/store/useAppStore";
import { Euro, Loader, Navigation, Route } from "lucide-react";
import { useMemo } from "react";

export function StationList() {
  const {
    stations,
    userLocation,
    selectedFuel,
    setSelectedStation,
    setFlyToStation,
    listSortBy,
    setListSortBy,
  } = useAppStore();

  const isDesktop = useMediaQuery("(min-width: 768px)");

  const sortedStations = useMemo(() => {
    // Filter stations that have the selected fuel
    const stationsWithFuel = stations.filter((s) =>
      s.prices.some((p) => p.fuel_type === selectedFuel),
    );

    if (!userLocation) return stationsWithFuel;

    return [...stationsWithFuel].sort((a, b) => {
      const priceA = a.prices.find((p) => p.fuel_type === selectedFuel)?.price;
      const priceB = b.prices.find((p) => p.fuel_type === selectedFuel)?.price;

      if (listSortBy === "price") {
        if (!priceA) return 1;
        if (!priceB) return -1;
        return priceA - priceB;
      } else {
        const distA = calculateDistance(
          userLocation[1], // lat
          userLocation[0], // lon
          a.lat,
          a.lon,
        );
        const distB = calculateDistance(
          userLocation[1], // lat
          userLocation[0], // lon
          b.lat,
          b.lon,
        );
        return distA - distB;
      }
    });
  }, [stations, userLocation, selectedFuel, listSortBy]);

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
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {listSortBy === "price" ? "Les plus économique" : "Autour de moi"}
          </h2>
          <div className="flex gap-2">
            <Badge
              variant={listSortBy === "price" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setListSortBy("price")}
            >
              <Euro className="size-4" />
              Prix
            </Badge>
            <Badge
              variant={listSortBy === "distance" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setListSortBy("distance")}
            >
              <Route className="size-4" />
              Distance
            </Badge>
          </div>
        </div>
      </div>

      <ScrollArea className="mr-1 h-px flex-1 pb-4">
        <div className="flex flex-col gap-3 px-4 pb-4">
          {sortedStations.map((station, index) => (
            <StationCard
              key={station.id}
              station={station}
              rank={index + 1}
              selectedFuel={selectedFuel}
              userLocation={userLocation}
              onClick={() => handleStationClick(station)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface StationCardProps {
  station: Station;
  rank: number;
  selectedFuel: string;
  userLocation: [number, number] | null;
  onClick: () => void;
}

function StationCard({
  station,
  rank,
  selectedFuel,
  userLocation,
  onClick,
}: StationCardProps) {
  const price = station.prices.find((p) => p.fuel_type === selectedFuel);
  const distance = userLocation
    ? calculateDistance(
        userLocation[1], // lat
        userLocation[0], // lon
        station.lat,
        station.lon,
      )
    : null;

  return (
    <Card
      className={cn("hover:bg-muted/50 cursor-pointer p-4 transition-all")}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 overflow-hidden">
          <div className="flex items-center gap-2">
            {rank <= 3 && (
              <Badge
                variant="secondary"
                className="h-5 w-5 shrink-0 justify-center rounded-full p-0 text-[10px]"
              >
                {rank}
              </Badge>
            )}
            <h3 className="truncate text-sm font-semibold">{station.name}</h3>
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

        <div className="flex flex-col items-end">
          {price ? (
            <>
              <span className="font-mono text-lg font-bold">
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
