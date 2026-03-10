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
    <main className="relative flex flex-col w-full h-dvh overflow-hidden bg-background">
      <Toaster position="bottom-center" richColors />

      {/* Map Layer */}
      <div className="absolute inset-0 z-0">
        <InteractiveMap>
          {/* Floating Header */}
          <div className="absolute top-0 left-0 right-0 z-20 flex flex-col items-center pointer-events-none p-4 gap-3 pt-6">
            <div className="pointer-events-auto w-full max-w-md shadow-2xl rounded-full">
              <SearchBar />
            </div>

            <div className="pointer-events-auto flex gap-2 overflow-x-auto max-w-full pb-2 no-scrollbar px-2">
              {fuelTypes.map((fuel) => (
                <Badge
                  key={fuel}
                  variant={selectedFuel === fuel ? "default" : "secondary"}
                  onClick={() => setSelectedFuel(fuel)}
                  className={`
                    px-4 py-1.5 text-sm font-bold shadow-sm transition-all cursor-pointer border
                    ${
                      selectedFuel === fuel
                        ? "scale-105 ring-2 ring-primary/20"
                        : "bg-background/80 hover:bg-background backdrop-blur-md border-border/50"
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
            className="w-100 sm:w-112.5 pt-12 shadow-2xl "
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
            <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
            <Drawer.Content className="bg-background flex flex-col rounded-t-[20px] h-[45dvh] mt-24 fixed bottom-0 left-0 right-0 z-50 shadow-2xl outline-none max-h-[96dvh]">
              <div className="p-4 bg-background rounded-t-[20px] flex-1 overflow-auto">
                <Drawer.Title className="sr-only">
                  Détails de la station
                </Drawer.Title>
                <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-muted mb-6" />
                <StationDetailSheet />
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}
    </main>
  );
}
