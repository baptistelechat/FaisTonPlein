import { cn } from "@/lib/utils";
import { FuelType } from "@/store/useAppStore";
import { Fuel } from "lucide-react";

type PriceMarkerProps = {
  price: number;
  fuelType: FuelType;
  isSelected?: boolean;
  trend?: "up" | "down" | "stable";
};

export function PriceMarker({ price, isSelected }: PriceMarkerProps) {
  // Determine color status
  const statusColor =
    price < 1.8
      ? "text-emerald-600 border-emerald-500 bg-emerald-50"
      : price > 1.9
        ? "text-rose-600 border-rose-500 bg-rose-50"
        : "text-amber-600 border-amber-500 bg-amber-50";

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg border shadow-sm transition-all duration-300 cursor-pointer group",
        isSelected
          ? "bg-primary text-primary-foreground border-primary z-50 scale-110 shadow-xl"
          : cn("bg-background hover:scale-105 hover:shadow-md", statusColor),
      )}
    >
      <div className="flex items-center gap-1 px-2 py-1">
        <Fuel
          className={cn(
            "h-3.5 w-3.5",
            isSelected ? "text-primary-foreground" : "text-current opacity-70",
          )}
        />
        <span className="text-sm font-extrabold font-mono tracking-tight leading-none">
          {price.toFixed(3)}€
        </span>
      </div>

      {/* Triangle pointer */}
      <div
        className={cn(
          "absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-b border-r",
          isSelected
            ? "border-primary bg-primary"
            : cn(statusColor.split(" ")[2], statusColor.split(" ")[1]), // Use background and border color from statusColor
        )}
      />
    </div>
  );
}
