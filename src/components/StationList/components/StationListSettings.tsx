"use client";

import { FuelTypeSelector } from "@/components/FuelTypeSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { DRAWER_SNAP_POINTS, RADIUS_OPTIONS, VEHICLE_PRESETS, VehicleType } from "@/lib/constants";
import { calculateDistance, cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { LucideIcon } from "lucide-react";
import {
  Bus,
  Car,
  CarFront,
  Package,
  Road,
  RotateCcw,
  SlidersHorizontal,
  Truck,
  Zap,
  ZapOff,
} from "lucide-react";
import { useMemo, useState } from "react";

const VEHICLE_ICONS: Record<string, LucideIcon> = {
  Car,
  CarFront,
  Truck,
  Bus,
  Package,
  Zap,
  ZapOff,
};

// Sous-composant isolé — se remonte quand vehicleType change grâce au key prop
// ce qui réinitialise les inputs locaux aux valeurs du nouveau preset
function VehicleInputs({ vehicleType }: { vehicleType: VehicleType }) {
  const { tankCapacity, setTankCapacity, consumption, setConsumption } =
    useAppStore();

  const [tankInput, setTankInput] = useState(String(tankCapacity));
  const [consInput, setConsInput] = useState(String(consumption));

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
    setConsInput(String(currentPreset.consumption));
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
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
          className="h-7 w-16 pr-5 text-right text-xs"
        />
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[10px]">
          L
        </span>
      </div>
      <div className="relative">
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
            if (isNaN(val) || val <= 0) setConsInput(String(consumption));
          }}
          className="h-7 w-20 pr-9 text-right text-xs"
        />
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[10px]">
          L/100
        </span>
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
  );
}

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
    vehicleType,
    setVehicleType,
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
        <ScrollArea style={{ height: `calc(${DRAWER_SNAP_POINTS.EXPANDED * 100}svh - 8rem)` }}>
          <div className="flex flex-col gap-4 px-4 pb-8">
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
            <Separator />

            {/* Titre "Mon véhicule" + inputs inline + reset */}
            <div className="flex items-center justify-between gap-3">
              <div className="text-muted-foreground shrink-0 text-xs font-bold tracking-wider uppercase">
                Mon véhicule
              </div>
              {vehicleType && (
                <VehicleInputs key={vehicleType} vehicleType={vehicleType} />
              )}
            </div>

            {/* Grille de types de véhicules */}
            <div className="grid grid-cols-2 gap-1.5">
              {VEHICLE_PRESETS.map((preset) => {
                const Icon = VEHICLE_ICONS[preset.icon];
                const isSelected = vehicleType === preset.type;
                return (
                  <button
                    key={preset.type}
                    onClick={() =>
                      setVehicleType(isSelected ? null : preset.type)
                    }
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
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};

export default StationListSettings;
