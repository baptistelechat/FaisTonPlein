import { FuelType } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Euro, Fuel, Route } from "lucide-react";

type PriceMarkerProps = {
  price: number;
  fuelType: FuelType;
  isSelected?: boolean;
  isBestPrice?: boolean;
  isBestDistance?: boolean;
  trend?: "up" | "down" | "stable";
  q1?: number | null;
  q3?: number | null;
};

export function PriceMarker({
  price,
  isSelected,
  isBestPrice,
  isBestDistance,
  q1,
  q3,
}: PriceMarkerProps) {
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
  // const showBestBadge = isBestPrice || isBestDistance;

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border shadow-sm transition-all duration-300",
        isSelected
          ? "bg-primary text-primary-foreground border-primary z-50 shadow-xl"
          : cn("bg-background hover:scale-105 hover:shadow-md", statusColor),
      )}
    >
      {/* {showBestBadge && (
        <div
          className={cn(
            "pointer-events-none absolute -top-2 -right-2 flex items-center gap-1 rounded-full border px-0.5 py-0.5 text-[10px] font-semibold shadow-sm",
            isSelected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-yellow-300 bg-yellow-50 text-yellow-900",
          )}
        >
          {isBestPrice && <Euro className="size-3" />}
          {isBestDistance && <MapPin className="size-3" />}
        </div>
      )} */}
      <div className="flex items-center gap-1 px-2 py-1">
        {isBestPrice && <Euro className="size-3.5" />}
        {isBestDistance && <Route className="size-3.5" />}
        {!isBestPrice && !isBestDistance && <Fuel className="size-3.5" />}
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
