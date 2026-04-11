import { FuelType } from "@/lib/constants";
import { getPriceMarkerClasses } from "@/lib/priceColor";
import { FRESHNESS_DOT_COLORS, getPriceFreshness } from "@/lib/priceFreshness";
import { cn, formatPrice } from "@/lib/utils";
import { FuelStats } from "@/store/useAppStore";
import { Calculator, Euro, Fuel, Route } from "lucide-react";

type PriceMarkerProps = {
  price: number;
  fuelType: FuelType;
  isSelected?: boolean;
  isBestPrice?: boolean;
  isBestDistance?: boolean;
  isBestRealCost?: boolean;
  filteredStats?: FuelStats | null;
  updatedAt?: string | number | Date | null;
};

export function PriceMarker({
  price,
  isSelected,
  isBestPrice,
  isBestDistance,
  isBestRealCost,
  filteredStats,
  updatedAt,
}: PriceMarkerProps) {
  const statusColor = getPriceMarkerClasses(price, filteredStats ?? null);

  const isBest = isBestPrice || isBestDistance || isBestRealCost;

  return (
    <div className="relative flex items-center justify-center">
      {isBest && (
        <>
          <span className="absolute size-8 animate-ping rounded-full bg-yellow-500 opacity-75 duration-1000" />
          <span className="absolute size-6 rounded-full bg-yellow-500/50" />
        </>
      )}
      <div
        className={cn(
          "group relative z-10 flex cursor-pointer flex-col items-center justify-center rounded-lg border shadow-sm transition-all duration-300",
          isSelected
            ? "bg-primary text-primary-foreground border-primary shadow-xl"
            : cn("bg-background hover:scale-105 hover:shadow-md", statusColor),
        )}
      >
        {updatedAt && (
          <span
            className={cn(
              "border-background absolute -top-1 -right-1 z-20 size-2.5 rounded-full border",
              FRESHNESS_DOT_COLORS[getPriceFreshness(updatedAt)],
            )}
          />
        )}
        <div className="flex items-center gap-1 px-2 py-1">
          {isBestPrice && <Euro className="size-3.5" />}
          {isBestDistance && <Route className="size-3.5" />}
          {isBestRealCost && <Calculator className="size-3.5" />}
          {!isBestPrice && !isBestDistance && !isBestRealCost && (
            <Fuel className="size-3.5" />
          )}
          <span className="font-mono text-sm leading-none font-extrabold tracking-tight">
            {formatPrice(price)}
          </span>
        </div>

        <div
          className={cn(
            "absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-r border-b",
            isSelected
              ? "border-primary bg-primary"
              : cn(statusColor.split(" ")[2], statusColor.split(" ")[1]),
          )}
        />
      </div>
    </div>
  );
}
