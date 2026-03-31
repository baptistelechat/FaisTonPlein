"use client";

import { Badge } from "@/components/ui/badge";
import { FUEL_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import colors from "tailwindcss/colors";

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

  const resolveHex = (colorName: string, shade: number) => {
    const entry = (colors as unknown as Record<string, unknown>)[colorName];
    if (!entry) return null;
    if (typeof entry === "string") return entry;
    if (typeof entry === "object" && entry !== null) {
      const byShade = entry as Record<number, string>;
      return byShade[shade] ?? null;
    }
    return null;
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
        const dotHex = resolveHex(fuel.color, 500) ?? "#64748b";
        const selectedBgHex = resolveHex(fuel.color, 600) ?? dotHex;

        return (
          <Badge
            key={fuel.type}
            variant="secondary"
            onClick={() => setSelectedFuel(fuel.type)}
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
