import { cn } from "@/lib/utils";
import { Fuel } from "lucide-react";

interface RuptureMarkerProps {
  isSelected?: boolean;
}

export function RuptureMarker({ isSelected }: RuptureMarkerProps) {
  return (
    <div className="relative flex items-center justify-center">
      <div
        className={cn(
          "group relative z-10 flex cursor-pointer flex-col items-center justify-center rounded-lg border shadow-sm transition-all duration-300",
          isSelected
            ? "border-red-500 bg-red-500 shadow-xl"
            : "border-red-200 bg-background hover:scale-105 hover:shadow-md",
        )}
      >
        <div className="flex items-center gap-1 px-2 py-1">
          <Fuel
            className={cn(
              "size-3.5",
              isSelected ? "text-white" : "text-red-400",
            )}
          />
          <span
            className={cn(
              "text-xs leading-none font-bold",
              isSelected ? "text-white" : "text-red-400",
            )}
          >
            Rupture
          </span>
        </div>
        <div
          className={cn(
            "absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-r border-b",
            isSelected
              ? "border-red-500 bg-red-500"
              : "border-red-200 bg-background",
          )}
        />
      </div>
    </div>
  );
}
