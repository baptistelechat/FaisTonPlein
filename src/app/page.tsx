"use client";

import InteractiveMap from "@/components/InteractiveMap";
import { SearchBar } from "@/components/SearchBar";
import { StationDetailSheet } from "@/components/StationDetailSheet";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { FuelType, useAppStore } from "@/store/useAppStore";
import { Toaster } from "sonner";
import { Drawer } from "vaul";

export default function Home() {
  const { selectedFuel, setSelectedFuel, selectedStation, setSelectedStation } =
    useAppStore();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const fuelTypes: FuelType[] = ["E10", "SP98", "Gazole", "E85", "GPLc"];

  return (
    <main className="bg-background relative flex h-dvh w-full flex-col overflow-hidden">
      <Toaster position="bottom-center" richColors />

      {/* Map Layer */}
      <div className="absolute inset-0 z-0">
        <InteractiveMap>
          {/* Floating Header */}
          <div className="pointer-events-none absolute top-0 right-0 left-0 z-20 flex flex-col items-center gap-3 p-4 pt-6">
            <div className="pointer-events-auto w-full max-w-md rounded-full shadow-2xl">
              <SearchBar />
            </div>

            <div className="no-scrollbar pointer-events-auto flex max-w-full gap-2 overflow-x-auto px-2 pb-2">
              {fuelTypes.map((fuel) => (
                <Badge
                  key={fuel}
                  variant={selectedFuel === fuel ? "default" : "secondary"}
                  onClick={() => setSelectedFuel(fuel)}
                  className={`
                    cursor-pointer border px-4 py-1.5 text-sm font-bold shadow-sm transition-all
                    ${
                      selectedFuel === fuel
                        ? "ring-primary/20 scale-105 ring-2"
                        : "bg-background/80 hover:bg-background border-border/50 backdrop-blur-md"
                    }
                  `}
                >
                  {fuel}
                </Badge>
              ))}
            </div>
          </div>
        </InteractiveMap>
      </div>

      {/* Responsive Station Details */}
      {isDesktop ? (
        // Desktop: Sidebar (Shadcn Sheet)
        <Sheet
          open={!!selectedStation}
          onOpenChange={(open) => !open && setSelectedStation(null)}
          modal={false} // Non-blocking sidebar
        >
          <SheetContent
            side="left"
            className="w-100 pt-12 shadow-2xl sm:w-112.5 "
          >
            <SheetTitle className="sr-only">Détails de la station</SheetTitle>
            <div className="h-full overflow-auto">
              <StationDetailSheet />
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        // Mobile: Bottom Drawer (Vaul)
        <Drawer.Root
          open={!!selectedStation}
          onOpenChange={(open) => !open && setSelectedStation(null)}
          shouldScaleBackground
        >
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
            <Drawer.Content className="bg-background fixed right-0 bottom-0 left-0 z-50 mt-24 flex h-[45dvh] max-h-[96dvh] flex-col rounded-t-[20px] shadow-2xl outline-none">
              <div className="bg-background flex-1 overflow-auto rounded-t-[20px] p-4">
                <Drawer.Title className="sr-only">
                  Détails de la station
                </Drawer.Title>
                <div className="bg-muted mx-auto mb-6 h-1.5 w-12 shrink-0 rounded-full" />
                <StationDetailSheet />
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}
    </main>
  );
}
