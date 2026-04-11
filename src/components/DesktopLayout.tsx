import { FuelTypeSelector } from "@/components/FuelTypeSelector";
import InteractiveMap from "@/components/InteractiveMap";
import { SearchBar } from "@/components/SearchBar";
import { StationDetail } from "@/components/StationDetail";
import { StationList } from "@/components/StationList";
import { Button } from "@/components/ui/button";
import { usePriceTrends } from "@/hooks/usePriceTrends";
import { useRoadDistances } from "@/hooks/useRoadDistances";
import { useAppStore } from "@/store/useAppStore";
import { ArrowLeft } from "lucide-react";

export function DesktopLayout() {
  useRoadDistances();
  usePriceTrends();
  const { selectedStation, setSelectedStation, triggerFitToList } =
    useAppStore();

  return (
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <aside className="bg-background border-primary/20 z-30 flex h-full w-96 shrink-0 flex-col border-r shadow-xl">
        <div className="h-full overflow-hidden">
          {selectedStation ? (
            <div className="flex h-full flex-col">
              <div className="p-4 pb-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedStation(null);
                    triggerFitToList();
                  }}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour à la liste
                </Button>
              </div>
              <div className="min-h-0 flex-1">
                <StationDetail />
              </div>
            </div>
          ) : (
            <StationList />
          )}
        </div>
      </aside>

      {/* Map Area */}
      <div className="relative flex-1">
        <InteractiveMap>
          {/* Floating Header */}
          <div className="pointer-events-none absolute top-0 right-0 left-0 z-20 flex flex-col items-center gap-3 p-4 pt-6">
            <div className="pointer-events-auto w-full max-w-md rounded-full shadow-2xl">
              <SearchBar />
            </div>
            <div className="flex flex-col items-center gap-2">
              <FuelTypeSelector />
            </div>
          </div>
        </InteractiveMap>
      </div>
    </div>
  );
}
