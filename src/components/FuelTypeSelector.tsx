"use client";

import { Badge } from "@/components/ui/badge";
import analytics from "@/lib/analytics";
import { FUEL_TYPES } from "@/lib/constants";
import { resolveHex } from "@/lib/fuelColors";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

interface FuelTypeSelectorProps {
  className?: string;
}

export function FuelTypeSelector({ className }: FuelTypeSelectorProps) {
  const { selectedFuel, setSelectedFuel } = useAppStore();

  const toRgba = (hex: string, alpha: number) => {
    const normalized = hex.replace("#", "");
    const full =
      normalized.length === 3
        ? normalized
            .split("")
            .map((c) => c + c)
            .join("")
        : normalized;

    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <div
      className={cn(
        "no-scrollbar pointer-events-auto flex max-w-full flex-wrap justify-center gap-2 px-2 py-1",
        className,
      )}
    >
      {FUEL_TYPES.map((fuel) => {
        const isSelected = selectedFuel === fuel.type;
        const dotHex = resolveHex(fuel.color, 500);
        const selectedBgHex = resolveHex(fuel.color, 600);

        return (
          <Badge
            key={fuel.type}
            variant="secondary"
            onClick={() => {
              setSelectedFuel(fuel.type);
              analytics.fuelSelected(fuel.type);
            }}
            className={cn(
              "font-heading text-muted-foreground cursor-pointer px-3 py-1.5 text-sm shadow-sm backdrop-blur-md transition-all",
              isSelected
                ? "text-white"
                : "bg-background/80 hover:bg-background",
            )}
            style={
              isSelected
                ? {
                    backgroundColor: selectedBgHex,
                    boxShadow: `0 0 0 3px ${toRgba(selectedBgHex, 0.25)}`,
                  }
                : {}
            }
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: dotHex }}
            />
            {fuel.type}
          </Badge>
        );
      })}
    </div>
  );
}
