"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { CreditCard, History, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";

export function StationDetailSheet() {
  const { selectedStation, setSelectedStation, selectedFuel } = useAppStore();

  if (!selectedStation) return null;

  const handleNavigate = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedStation.lat},${selectedStation.lon}`;
    window.open(url, "_blank");
    toast.info("Ouverture de l'itinéraire...");
  };

  return (
    <div className="bg-background animate-in slide-in-from-bottom flex h-full flex-col duration-300">
      <div className="flex flex-col space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-2xl font-bold tracking-tight">
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

        {/* Pricing Grid */}
        <div className="grid grid-cols-2 gap-4">
          {selectedStation.prices.map((price) => (
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
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-3 pt-2">
          <Button
            onClick={handleNavigate}
            size="lg"
            className="shadow-primary/20 hover:shadow-primary/30 h-14 w-full gap-2 rounded-2xl text-base font-bold shadow-lg transition-all active:scale-95"
          >
            <Navigation className="h-5 w-5" />Y Aller (Google Maps)
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-12 gap-2 rounded-xl font-semibold"
              disabled={true}
            >
              <History className="h-4 w-4" />
              Historique
            </Button>
            <Button
              variant="outline"
              className="h-12 gap-2 rounded-xl font-semibold"
              onClick={() => setSelectedStation(null)}
            >
              Fermer
            </Button>
          </div>
        </div>

        {/* Services */}
        <div className="border-border/50 space-y-3 border-t pt-4">
          <h4 className="text-muted-foreground flex items-center gap-2 text-sm font-bold tracking-wider uppercase">
            <CreditCard className="h-4 w-4" />
            Services disponibles
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedStation.services.map((service) => (
              <Badge
                key={service}
                variant="secondary"
                className="rounded-lg px-2.5 py-1 text-xs font-medium"
              >
                {service}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
