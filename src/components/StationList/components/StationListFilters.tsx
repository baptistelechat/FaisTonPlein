"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { capitalize } from "@/lib/priceFreshness";
import { calculateDistance, cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { formatRelative } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock, Road } from "lucide-react";
import { useMemo } from "react";

const RADIUS_OPTIONS: { label: string; value: number }[] = [
  { label: "5 km", value: 5 },
  { label: "10 km", value: 10 },
  { label: "20 km", value: 20 },
  { label: "50 km", value: 50 },
  { label: "100 km", value: 100 },
];

const StationListFilters = () => {
  const {
    stations,
    searchRadius,
    setSearchRadius,
    showHighwayStations,
    setShowHighwayStations,
    userLocation,
    searchLocation,
    selectedFuel,
    lastUpdate,
  } = useAppStore();

  const referenceLocation = searchLocation || userLocation;

  const hasHighwayInRadius = useMemo(() => {
    return stations.some((station) => {
      if (!station.isHighway) return false;
      if (!station.prices.some((p) => p.fuel_type === selectedFuel))
        return false;
      if (searchRadius > 0 && referenceLocation) {
        const dist = calculateDistance(
          referenceLocation[1],
          referenceLocation[0],
          station.lat,
          station.lon,
        );
        return dist <= searchRadius;
      }
      return true;
    });
  }, [stations, searchRadius, referenceLocation, selectedFuel]);

  const majLabel = lastUpdate
    ? capitalize(
        formatRelative(new Date(lastUpdate), new Date(), { locale: fr }),
      )
    : null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-4">
      <div className="flex flex-wrap gap-1">
        {RADIUS_OPTIONS.map((option) => (
          <Badge
            key={option.value}
            variant={searchRadius === option.value ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSearchRadius(option.value)}
          >
            {option.label}
          </Badge>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Label
          htmlFor="highway-switch"
          className={cn(
            "flex items-center gap-1.5",
            hasHighwayInRadius
              ? "cursor-pointer"
              : "cursor-not-allowed opacity-40",
          )}
        >
          <Road className="size-3.5" />
          Autoroutes
        </Label>
        <Switch
          id="highway-switch"
          checked={showHighwayStations}
          onCheckedChange={setShowHighwayStations}
          disabled={!hasHighwayInRadius}
        />
        {majLabel && (
          <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
            <Clock className="size-3 shrink-0" />
            {majLabel}
          </span>
        )}
      </div>
    </div>
  );
};

export default StationListFilters;
