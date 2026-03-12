"use client";

import { Badge } from "@/components/ui/badge";
import { FUEL_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

interface FuelTypeSelectorProps {
  className?: string;
}

export function FuelTypeSelector({ className }: FuelTypeSelectorProps) {
  const { selectedFuel, setSelectedFuel } = useAppStore();

  return (
    <div
      className={cn(
        "no-scrollbar pointer-events-auto flex max-w-full flex-wrap justify-center gap-2 overflow-x-auto px-2 pb-2",
        className,
      )}
    >
      {FUEL_TYPES.map((fuel) => (
        <Badge
          key={fuel}
          variant={selectedFuel === fuel ? "default" : "secondary"}
          onClick={() => setSelectedFuel(fuel)}
          className={cn(
            "font-heading cursor-pointer border px-4 py-1.5 text-sm shadow-sm transition-all",
            selectedFuel === fuel
              ? "ring-primary/20 scale-105 ring-2"
              : "bg-background/80 hover:bg-background border-border/50 backdrop-blur-md",
          )}
        >
          {fuel}
        </Badge>
      ))}
    </div>
  );
}
