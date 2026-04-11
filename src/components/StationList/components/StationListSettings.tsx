"use client";

import { FuelTypeSelector } from "@/components/FuelTypeSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useReferenceLocation } from "@/hooks/useReferenceLocation";
import {
  DRAWER_SNAP_POINTS,
  FILL_HABIT_OPTIONS,
  FillHabit,
  RADIUS_OPTIONS,
  VEHICLE_PRESETS,
  VehicleType,
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
  Gauge,
  Navigation,
  Plug,
  Road,
  RotateCcw,
  Route,
  SlidersHorizontal,
  Truck,
  Van,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
const VEHICLE_ICONS: Record<string, LucideIcon> = {
  Car,
  CarFront,
  Van,
  Bus,
  Truck,
  Zap,
  Plug,
};

// Sous-composant isolé — se remonte quand vehicleType change grâce au key prop
// ce qui réinitialise les inputs locaux aux valeurs du nouveau preset
function VehicleInputs({ vehicleType }: { vehicleType: VehicleType }) {
  const { tankCapacity, setTankCapacity, consumption, setConsumption } =
    useAppStore();

  const [tankInput, setTankInput] = useState(String(tankCapacity));
  const [consInput, setConsInput] = useState(Number(consumption).toFixed(2));

  const currentPreset = VEHICLE_PRESETS.find((p) => p.type === vehicleType);
  const isAtPresetDefaults =
    !currentPreset ||
    (tankCapacity === currentPreset.tankCapacity &&
      consumption === currentPreset.consumption);

  const handleReset = () => {
    if (!currentPreset) return;
    setTankCapacity(currentPreset.tankCapacity);
    setConsumption(currentPreset.consumption);
    setTankInput(String(currentPreset.tankCapacity));
    setConsInput(Number(currentPreset.consumption).toFixed(2));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
          Mon véhicule
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={isAtPresetDefaults}
          onClick={handleReset}
          title="Réinitialiser aux valeurs du preset"
        >
          <RotateCcw className="size-3.5" />
        </Button>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="tank-capacity" className="flex items-center gap-1.5">
            <Fuel className="size-3.5" />
            Réservoir
          </Label>
          <Input
            id="tank-capacity"
            type="number"
            inputMode="decimal"
            min={10}
            max={150}
            step={1}
            value={tankInput}
            onChange={(e) => {
              setTankInput(e.target.value);
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val > 0) setTankCapacity(val);
            }}
            onBlur={() => {
              const val = parseFloat(tankInput);
              if (isNaN(val) || val <= 0) setTankInput(String(tankCapacity));
            }}
            className="h-7 w-16 text-right text-xs"
          />
          <span className="text-muted-foreground text-xs">L</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Label htmlFor="consumption" className="flex items-center gap-1.5">
            <Gauge className="size-3.5" />
            Consommation
          </Label>
          <Input
            id="consumption"
            type="number"
            inputMode="decimal"
            min={1}
            max={25}
            step={0.1}
            value={consInput}
            onChange={(e) => {
              setConsInput(e.target.value);
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val > 0) setConsumption(val);
            }}
            onBlur={() => {
              const val = parseFloat(consInput);
              if (isNaN(val) || val <= 0)
                setConsInput(Number(consumption).toFixed(2));
            }}
            className="h-7 w-20 text-right text-xs"
          />
          <span className="text-muted-foreground text-xs">L/100</span>
        </div>
      </div>
    </div>
  );
}

function SettingsBody() {
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
        <VehicleInputs key={vehicleType} vehicleType={vehicleType} />
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
                <Icon className="size-3.5 shrink-0" />
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
    </div>
  );
}

const StationListSettings = () => {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Dialog>
        <DialogTrigger render={<Button variant="outline" size="icon" />}>
          <SlidersHorizontal />
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="size-4" />
              Réglages
            </DialogTitle>
            <DialogDescription>
              Personnalisez votre recherche de stations.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[72vh]">
            <SettingsBody />
          </ScrollArea>
          <div className="flex justify-end pt-2">
            <DialogClose render={<Button variant="outline" />}>
              Fermer
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="icon">
          <SlidersHorizontal />
        </Button>
      </DrawerTrigger>
      <DrawerContent
        className="rounded-t-[20px] shadow-2xl"
        style={{ height: `${DRAWER_SNAP_POINTS.EXPANDED * 100}svh` }}
      >
        <DrawerHeader className="text-left!">
          <DrawerTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-4" />
            Réglages
          </DrawerTitle>
          <DrawerDescription>
            Personnalisez votre recherche de stations.
          </DrawerDescription>
        </DrawerHeader>
        <ScrollArea
          style={{
            height: `calc(${DRAWER_SNAP_POINTS.EXPANDED * 100}svh - 8rem)`,
          }}
        >
          <div className="px-4">
            <SettingsBody />
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};

export default StationListSettings;
