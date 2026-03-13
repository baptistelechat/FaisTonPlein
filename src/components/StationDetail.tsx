"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DRAWER_SNAP_POINTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { FuelPrice, useAppStore } from "@/store/useAppStore";
import { CreditCard, History, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";

interface IStationPrice {
  mobileDrawerSnap?: number | string | null;
}

const PriceCard = ({
  price,
  selectedFuel,
}: {
  price: FuelPrice;
  selectedFuel: string;
}) => {
  return (
    <div
      key={price.fuel_type}
      className={`flex flex-col rounded-xl border p-3 transition-all ${
        price.fuel_type === selectedFuel
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border/50 bg-muted/30"
      }`}
    >
      <span className="text-muted-foreground mb-1 text-[10px] font-bold tracking-widest uppercase">
        {price.fuel_type}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-xl font-extrabold tracking-tighter">
          {price.price.toFixed(3)}
        </span>
        <span className="text-xs font-semibold opacity-70">€/L</span>
      </div>
    </div>
  );
};

export function StationDetail({ mobileDrawerSnap }: IStationPrice) {
  const { selectedStation, selectedFuel } = useAppStore();

  if (!selectedStation) return null;

  const selectedPrice = selectedStation.prices.find(
    (p) => p.fuel_type === selectedFuel,
  );

  const sortedPrices = [...selectedStation.prices].sort(
    (a, b) =>
      Number(b.fuel_type === selectedFuel) -
      Number(a.fuel_type === selectedFuel),
  );

  const handleNavigate = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedStation.lat},${selectedStation.lon}`;
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
            <h2 className="font-heading text-primary text-2xl font-bold tracking-tight">
              {selectedStation.name}
            </h2>
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/5 text-emerald-500"
            >
              Ouvert 24/7
            </Badge>
          </div>
          <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <MapPin className="h-3.5 w-3.5" />
            {selectedStation.address}
          </p>
        </div>

        {mobileDrawerSnap === DRAWER_SNAP_POINTS.MEDIUM && selectedPrice && (
          <PriceCard price={selectedPrice} selectedFuel={selectedFuel} />
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
                />
              ))}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 gap-3 pt-2">
              <Button onClick={handleNavigate} size="xl" className="w-full">
                <Navigation className="h-5 w-5" />Y Aller (Google Maps)
              </Button>

              <Button
                variant="outline"
                size="lg"
                disabled={true}
                className="w-full"
              >
                <History className="h-4 w-4" />
                Historique
              </Button>
            </div>

            {/* Services */}
            {selectedStation.services &&
              selectedStation.services.length > 0 && (
                <div className="border-border/50 space-y-3 border-t pt-4">
                  <h4 className="text-muted-foreground flex items-center gap-2 text-sm font-bold tracking-wider uppercase">
                    <CreditCard className="h-4 w-4" />
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
