"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VEHICLE_PRESETS } from "@/lib/constants";
import type { VehicleType } from "@/lib/constants";
import { useAppStore } from "@/store/useAppStore";
import { Fuel, Gauge, RotateCcw } from "lucide-react";
import { useState } from "react";

// Se remonte quand vehicleType change grâce au key prop
// ce qui réinitialise les inputs locaux aux valeurs du nouveau preset
export function VehicleInputs({ vehicleType }: { vehicleType: VehicleType }) {
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
