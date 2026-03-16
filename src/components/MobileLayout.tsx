import { FuelTypeSelector } from "@/components/FuelTypeSelector";
import InteractiveMap from "@/components/InteractiveMap";
import { SearchBar } from "@/components/SearchBar";
import { StationDetail } from "@/components/StationDetail";
import { StationList } from "@/components/StationList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { DRAWER_SNAP_POINTS, DRAWER_SNAP_POINTS_ARRAY } from "@/lib/constants";
import { useAppStore } from "@/store/useAppStore";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Clock, Euro, Route } from "lucide-react";
import { useEffect, useState } from "react";

export function MobileLayout() {
  const {
    selectedStation,
    setSelectedStation,
    lastUpdate,
    bestPriceStationId,
    bestDistanceStationId,
  } = useAppStore();
  const [snap, setSnap] = useState<number | string | null>(
    DRAWER_SNAP_POINTS.MEDIUM,
  );

  const selectedStationId = selectedStation?.id ?? null;

  // Reset snap to middle when a station is selected on mobile
  useEffect(() => {
    if (selectedStation) {
      // Use setTimeout to avoid synchronous state update warning
      const timer = setTimeout(() => setSnap(DRAWER_SNAP_POINTS.MEDIUM), 0);
      return () => clearTimeout(timer);
    }
  }, [selectedStation]);

  return (
    <>
      {/* Map Layer */}
      <div className="absolute inset-0 z-0">
        <InteractiveMap mobileDrawerSnap={snap}>
          {/* Floating Header (Mobile) */}
          <div className="pointer-events-none absolute top-0 right-0 left-0 z-20 flex flex-col items-center gap-3 p-4">
            {/* Search Trigger Button */}
            <div className="pointer-events-auto w-full max-w-md px-4">
              <SearchBar />
            </div>

            <div className="flex flex-col items-center gap-2">
              <FuelTypeSelector className="justify-center" />
              {lastUpdate && (
                <Badge
                  variant="outline"
                  className="bg-background/60 text-muted-foreground pointer-events-auto flex items-center gap-1.5 border-none px-3 py-1 text-xs font-medium shadow-sm backdrop-blur-sm"
                >
                  <Clock className="size-3" />
                  <span>
                    MAJ :{" "}
                    {format(new Date(lastUpdate), "d MMM à HH:mm", {
                      locale: fr,
                    })}
                  </span>
                </Badge>
              )}
            </div>
          </div>
        </InteractiveMap>
      </div>

      {/* Mobile Drawer (Stations List) */}
      <Drawer
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            // Prevent closing
          }
        }}
        modal={false}
        dismissible={false}
        snapPoints={DRAWER_SNAP_POINTS_ARRAY}
        activeSnapPoint={snap}
        setActiveSnapPoint={setSnap}
        disablePreventScroll
      >
        <DrawerContent
          className="z-40 mt-24 h-[96dvh] rounded-t-[20px] shadow-2xl outline-none"
          style={{ overscrollBehavior: "none" }}
        >
          <DrawerTitle className="sr-only">
            {selectedStation ? "Détails" : "Liste des stations"}
          </DrawerTitle>

          <div className="min-h-0 flex-1 pt-2">
            {selectedStation ? (
              <div className="flex h-full flex-col gap-2">
                <div className="flex items-center justify-between px-4 py-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedStation(null);
                      setSnap(DRAWER_SNAP_POINTS.MEDIUM);
                    }}
                    className="max-w-full justify-start gap-2"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" />
                    <span className="shrink-0">
                      {snap === DRAWER_SNAP_POINTS.MINIMIZED
                        ? "Retour vers la liste"
                        : "Retour"}
                    </span>
                  </Button>
                  {snap === DRAWER_SNAP_POINTS.MINIMIZED && (
                    <span className="font-heading text-primary flex items-center gap-2 truncate text-sm font-bold">
                      {selectedStation.name}
                      {selectedStationId !== null &&
                        selectedStationId === bestPriceStationId && (
                          <Euro className="size-4 text-yellow-500" />
                        )}
                      {selectedStationId !== null &&
                        selectedStationId === bestDistanceStationId && (
                          <Route className="size-4 text-yellow-500" />
                        )}
                    </span>
                  )}
                </div>
                <div className="min-h-0 flex-1">
                  <StationDetail mobileDrawerSnap={snap} />
                </div>
              </div>
            ) : (
              <StationList />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
