"use client";

import { StationLogo } from "@/components/StationLogo";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Station } from "@/store/useAppStore";
import {
  Bird,
  Calculator,
  Euro,
  MapPin,
  Navigation,
  Road,
  Route,
} from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface StationDetailHeaderProps {
  station: Station;
  stationName: string;
  nameIsLoading: boolean;
  distanceKm: number | null;
  isExactDistance: boolean;
  durationSeconds: number | null;
  isBestPrice: boolean;
  isBestDistance: boolean;
  isBestRealCost: boolean;
}

export function StationDetailHeader({
  station,
  stationName,
  nameIsLoading,
  distanceKm,
  isExactDistance,
  durationSeconds,
  isBestPrice,
  isBestDistance,
  isBestRealCost,
}: StationDetailHeaderProps) {
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {nameIsLoading ? (
            <Skeleton className="size-10 shrink-0 rounded-md" />
          ) : (
            <StationLogo name={stationName} size="md" />
          )}
          <h2 className="font-heading text-primary flex items-center gap-2 text-2xl font-bold tracking-tight">
            {nameIsLoading ? <Skeleton className="h-7 w-48" /> : stationName}
          </h2>
        </div>
        {station.is24h && (
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
        {station.address}
      </p>

      {(isBestPrice ||
        isBestDistance ||
        isBestRealCost ||
        station.isHighway) && (
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
          {station.isHighway && (
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
  );
}
