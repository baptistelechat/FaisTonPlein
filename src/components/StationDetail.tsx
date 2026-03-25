"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DRAWER_SNAP_POINTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { FuelPrice, useAppStore } from "@/store/useAppStore";
import {
  CreditCard,
  Euro,
  History,
  MapPin,
  Navigation,
  Route,
} from "lucide-react";
import { toast } from "sonner";

interface IStationDetailsProps {
  mobileDrawerSnap?: number | string | null;
}

const PriceCard = ({
  price,
  selectedFuel,
  averagePrice,
}: {
  price: FuelPrice;
  selectedFuel: string;
  averagePrice?: number;
}) => {
  let priceColor = "text-foreground";
  let diffBadge = null;

  if (averagePrice) {
    const diff = price.price - averagePrice;
    const threshold = 0.02;
    if (diff < -threshold) {
      priceColor = "text-emerald-600";
      diffBadge = (
        <span className="rounded-sm bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-500">
          - {Math.abs(diff).toFixed(3)}€
        </span>
      );
    } else if (diff > threshold) {
      priceColor = "text-rose-600";
      diffBadge = (
        <span className="rounded-sm bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-500">
          + {diff.toFixed(3)}€
        </span>
      );
    } else {
      priceColor = "text-amber-600";
      diffBadge = (
        <span className="rounded-sm bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">
          {`${diff > 0 ? "+ " : "- "}${Math.abs(diff).toFixed(3)}€`}
        </span>
      );
    }
  }

  return (
    <div
      className={`flex flex-col rounded-xl border p-3 transition-all ${
        price.fuel_type === selectedFuel
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border/50 bg-muted/30"
      }`}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
          {price.fuel_type}
        </span>
        {diffBadge}
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            "font-mono text-xl font-extrabold tracking-tighter",
            priceColor,
          )}
        >
          {price.price.toFixed(3)}
        </span>
        <span className="text-xs font-semibold opacity-70">€</span>
      </div>
    </div>
  );
};

export function StationDetail({ mobileDrawerSnap }: IStationDetailsProps) {
  const {
    selectedStation,
    selectedFuel,
    stats,
    bestPriceStationId,
    bestDistanceStationId,
  } = useAppStore();

  const selectedStationId = selectedStation?.id ?? null;

  const isBestPrice =
    selectedStationId !== null && selectedStationId === bestPriceStationId;
  const isBestDistance =
    selectedStationId !== null && selectedStationId === bestDistanceStationId;

  if (!selectedStation) return null;

  const selectedPrice = selectedStation.prices.find(
    (p) => p.fuel_type === selectedFuel,
  );

  const sortedPrices = [...selectedStation.prices].sort(
    (a, b) =>
      Number(b.fuel_type === selectedFuel) -
      Number(a.fuel_type === selectedFuel),
  );

  const handleNavigateGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedStation.lat},${selectedStation.lon}`;
    window.open(url, "_blank");
    toast.info("Ouverture de l'itinéraire...");
  };

  const handleNavigateWaze = () => {
    const url = `https://waze.com/ul?ll=${selectedStation.lat},${selectedStation.lon}&navigate=yes`;
    window.open(url, "_blank");
    toast.info("Ouverture de l'itinéraire...");
  };

  return (
    <ScrollArea className="bg-background animate-in slide-in-from-bottom h-full duration-300">
      <div
        className={cn(
          "flex flex-col space-y-6 p-6 py-0 md:pb-6",
          mobileDrawerSnap === DRAWER_SNAP_POINTS.EXPANDED && "pb-44",
        )}
      >
        {/* Header */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-primary flex items-center gap-2 text-2xl font-bold tracking-tight">
              {selectedStation.name}
            </h2>
            {selectedStation.is24h && (
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/5 text-emerald-500"
              >
                Ouvert 24/7
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <MapPin className="size-3.5" />
            {selectedStation.address}
          </p>
          {(isBestPrice || isBestDistance) && (
            <div className="flex flex-wrap gap-2">
              {isBestPrice && (
                <Badge
                  variant="outline"
                  className="border-yellow-500/30 bg-yellow-500/10 text-yellow-600"
                >
                  <Euro className="size-3.5" />
                  Meilleur prix
                </Badge>
              )}
              {isBestDistance && (
                <Badge
                  variant="outline"
                  className="border-yellow-500/30 bg-yellow-500/10 text-yellow-600"
                >
                  <Route className="size-3.5" />
                  Plus proche
                </Badge>
              )}
            </div>
          )}
        </div>

        {mobileDrawerSnap === DRAWER_SNAP_POINTS.MEDIUM && selectedPrice && (
          <PriceCard
            price={selectedPrice}
            selectedFuel={selectedFuel}
            averagePrice={
              stats[selectedPrice.fuel_type]?.median ??
              stats[selectedPrice.fuel_type]?.average
            }
          />
        )}

        {(mobileDrawerSnap === DRAWER_SNAP_POINTS.EXPANDED ||
          !mobileDrawerSnap) && (
          <>
            {/* Pricing Grid */}
            <div className="grid grid-cols-2 gap-4">
              {sortedPrices.map((price) => (
                <PriceCard
                  price={price}
                  selectedFuel={selectedFuel}
                  key={price.fuel_type}
                  averagePrice={
                    stats[price.fuel_type]?.median ??
                    stats[price.fuel_type]?.average
                  }
                />
              ))}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 gap-3 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleNavigateGoogleMaps}
                  size="lg"
                  className="flex w-full gap-2"
                >
                  <Navigation className="size-4" />
                  Google Maps
                </Button>
                <Button
                  onClick={handleNavigateWaze}
                  size="lg"
                  variant="outline"
                  className="flex w-full gap-2"
                >
                  <Navigation className="size-4" />
                  Waze
                </Button>
              </div>

              <Button
                variant="outline"
                size="lg"
                disabled={true}
                className="w-full"
              >
                <History className="size-4" />
                Historique
              </Button>
            </div>

            {/* Services */}
            {selectedStation.services &&
              selectedStation.services.length > 0 && (
                <div className="border-border/50 space-y-3 border-t pt-4">
                  <h4 className="text-muted-foreground flex items-center gap-2 text-sm font-bold tracking-wider uppercase">
                    <CreditCard className="size-4" />
                    Services disponibles
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedStation.services.map((service) => (
                      <Badge
                        key={service}
                        variant="outline"
                        className="bg-background/80 hover:bg-background border-border/60 rounded-full px-3 py-1 font-medium shadow-sm transition-colors"
                      >
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
          </>
        )}
      </div>
    </ScrollArea>
  );
}
