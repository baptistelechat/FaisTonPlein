"use client";

import { FuelTypeSelector } from "@/components/FuelTypeSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { RADIUS_OPTIONS } from "@/lib/constants";
import { calculateDistance, cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { Road, SlidersHorizontal } from "lucide-react";
import { useMemo } from "react";


const StationListSettings = () => {
  const {
    selectedFuel,
    searchRadius,
    setSearchRadius,
    showHighwayStations,
    setShowHighwayStations,
    stations,
    userLocation,
    searchLocation,
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

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="icon" />}>
        <SlidersHorizontal />
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-start gap-2">
            <SlidersHorizontal className="size-4" />
            Réglages
          </DialogTitle>
          <DialogDescription>
            Personnalisez votre recherche de stations.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 pb-2">
          <div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
            Carburant
          </div>
          <FuelTypeSelector className="justify-start px-0" />
          <Separator />
          <div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
            Rayon de recherche
          </div>
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
          <Separator />
          <div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
            Affichage
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="highway-switch-settings"
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
                id="highway-switch-settings"
                checked={showHighwayStations}
                onCheckedChange={setShowHighwayStations}
                disabled={!hasHighwayInRadius}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StationListSettings;
