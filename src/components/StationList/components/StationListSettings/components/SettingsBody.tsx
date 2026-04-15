"use client";

import { FuelTypeSelector } from "@/components/FuelTypeSelector";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useDeptCache } from "@/hooks/useDeptCache";
import { useReferenceLocation } from "@/hooks/useReferenceLocation";
import type { FillHabit, VehicleType } from "@/lib/constants";
import {
  FILL_HABIT_OPTIONS,
  RADIUS_OPTIONS,
  VEHICLE_PRESETS,
} from "@/lib/constants";
import { calculateDistance, cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { LucideIcon } from "lucide-react";
import {
  Bird,
  Bus,
  Car,
  CarFront,
  Fuel,
  Navigation,
  Plug,
  Road,
  Route,
  Van,
  Zap,
} from "lucide-react";
import { useMemo } from "react";
import { VehicleInputs } from "./VehicleInputs";

const VEHICLE_ICONS: Record<string, LucideIcon> = {
  Car,
  CarFront,
  Van,
  Bus,
  Zap,
  Plug,
};

export function SettingsBody() {
  const {
    selectedFuel,
    searchRadius,
    setSearchRadius,
    showHighwayStations,
    setShowHighwayStations,
    showRoute,
    setShowRoute,
    showRuptureStations,
    setShowRuptureStations,
    stations,
    vehicleType,
    setVehicleType,
    fillHabit,
    setFillHabit,
    tankCapacity,
    distanceMode,
    setDistanceMode,
  } = useAppStore();

  const loadedDepts = useAppStore((s) => s.loadedDepts);
  const cachedDepts = useAppStore((s) => s.cachedDepts);
  const { downloadingDepts, progressByDept, resetApp } = useDeptCache();

  const referenceLocation = useReferenceLocation();

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
    <div className="flex flex-col gap-4 pr-4 pb-4">
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
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-6">
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
        <div className="flex items-center gap-2">
          <Label
            htmlFor="route-switch-settings"
            className="flex cursor-pointer items-center gap-1.5"
          >
            <Route className="size-3.5" />
            Tracé de l&apos;itinéraire
          </Label>
          <Switch
            id="route-switch-settings"
            checked={showRoute}
            onCheckedChange={setShowRoute}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label
            htmlFor="rupture-switch-settings"
            className="flex cursor-pointer items-center gap-1.5"
          >
            <Fuel className="size-3.5 text-red-400" />
            Stations en rupture
          </Label>
          <Switch
            id="rupture-switch-settings"
            checked={showRuptureStations}
            onCheckedChange={setShowRuptureStations}
          />
        </div>
      </div>
      <Separator />
      <div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
        Distances
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {(
          [
            { value: "road", label: "Route réelle", icon: Navigation },
            { value: "crow-fly", label: "Vol d'oiseau", icon: Bird },
          ] as const
        ).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setDistanceMode(value)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border p-2 text-left text-xs transition-all",
              distanceMode === value
                ? "border-primary bg-primary/5 text-primary font-semibold"
                : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            {label}
          </button>
        ))}
      </div>
      <Separator />

      {vehicleType ? (
        <VehicleInputs
          key={vehicleType}
          vehicleType={vehicleType as VehicleType}
        />
      ) : (
        <div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
          Mon véhicule
        </div>
      )}

      {/* Grille de types de véhicules */}
      <div className="grid grid-cols-2 gap-1.5">
        {VEHICLE_PRESETS.map((preset) => {
          const Icon = VEHICLE_ICONS[preset.icon];
          const isSelected = vehicleType === preset.type;
          return (
            <button
              key={preset.type}
              onClick={() => setVehicleType(isSelected ? null : preset.type)}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-lg border p-2 text-left text-xs transition-all",
                isSelected
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                {Icon && <Icon className="size-3.5 shrink-0" />}
                {preset.label}
              </div>
              <span className="text-[10px] leading-tight opacity-70">
                {preset.examples}
              </span>
            </button>
          );
        })}
      </div>

      {tankCapacity > 0 && (
        <>
          <Separator />
          <div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
            Mes habitudes
          </div>
          <p className="text-muted-foreground -mt-2 text-xs">
            Je fais le plein quand...
          </p>
          <div className="flex flex-wrap gap-1">
            {FILL_HABIT_OPTIONS.map((option) => (
              <Badge
                key={option.value}
                variant={fillHabit === option.value ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setFillHabit(option.value as FillHabit)}
              >
                {option.label}
              </Badge>
            ))}
          </div>
        </>
      )}

      <Separator />
      <div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
        Données hors ligne
      </div>

      {loadedDepts.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {loadedDepts.map((dept) => {
            const meta = cachedDepts[dept];
            const isLoading = downloadingDepts.includes(dept);
            const progress = progressByDept[dept] ?? 0;
            return (
              <div
                key={dept}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-muted-foreground font-mono text-xs">
                  Dept {dept}
                </span>
                {isLoading ? (
                  <div className="flex flex-1 items-center gap-1.5">
                    <div className="bg-muted h-1 flex-1 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-200"
                        style={{ width: `${Math.round(progress * 100)}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground w-7 text-right text-xs">
                      {Math.round(progress * 100)}%
                    </span>
                  </div>
                ) : meta ? (
                  <span className="text-muted-foreground text-xs">
                    {formatCacheAge(meta.cachedAt)} •{" "}
                    {Math.round(meta.size / 1024)} Ko
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs opacity-50">
                    Non mis en cache
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          Aucun département chargé
        </p>
      )}

      <Separator />
      <div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
        Réinitialisation
      </div>
      <p className="text-muted-foreground -mt-2 text-xs">
        Effacer les données conservées hors ligne et les préférences
        sauvegardées
      </p>
      <AlertDialog>
        <AlertDialogTrigger className="h-auto self-start p-0 text-xs text-red-400 underline-offset-2 hover:underline">
          Réinitialiser l&apos;application
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Réinitialiser l&apos;application ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprime les données hors ligne conservées et toutes
              les préférences sauvegardées. L&apos;application sera rechargée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={resetApp}
            >
              Réinitialiser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const formatCacheAge = (cachedAt: number): string => {
  const diffMin = Math.round((Date.now() - cachedAt) / 60000);
  if (diffMin < 60) return `il y a ${diffMin} min`;
  return `il y a ${Math.round(diffMin / 60)}h`;
};
