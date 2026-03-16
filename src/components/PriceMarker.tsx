import { FuelType } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Fuel } from "lucide-react";

type PriceMarkerProps = {
  price: number;
  fuelType: FuelType;
  isSelected?: boolean;
  trend?: "up" | "down" | "stable";
  q1?: number | null;
  q3?: number | null;
};

export function PriceMarker({ price, isSelected, q1, q3 }: PriceMarkerProps) {
  // Determine color status
  const getStatusColor = () => {
    if (typeof q1 === "number" && typeof q3 === "number") {
      if (price < q1) {
        return "text-emerald-600 border-emerald-500 bg-emerald-50";
      }
      if (price > q3) {
        return "text-rose-600 border-rose-500 bg-rose-50";
      }
      return "text-amber-600 border-amber-500 bg-amber-50";
    }

    return "text-amber-600 border-amber-500 bg-amber-50";
  };

  const statusColor = getStatusColor();

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border shadow-sm transition-all duration-300",
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
        <span className="font-mono text-sm leading-none font-extrabold tracking-tight">
          {price.toFixed(3)}€
        </span>
      </div>

      <div
        className={cn(
          "absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-r border-b",
          isSelected
            ? "border-primary bg-primary"
            : cn(statusColor.split(" ")[2], statusColor.split(" ")[1]),
        )}
      />
    </div>
  );
}
