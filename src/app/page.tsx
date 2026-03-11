"use client";

import InteractiveMap from "@/components/InteractiveMap";
import { SearchBar } from "@/components/SearchBar";
import { StationDetail } from "@/components/StationDetail";
import { StationList } from "@/components/StationList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { FuelType, useAppStore } from "@/store/useAppStore";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Clock } from "lucide-react";
import React, { useEffect } from "react";
import { Toaster } from "sonner";
import { Drawer } from "vaul";

export default function Home() {
  const {
    selectedFuel,
    setSelectedFuel,
    selectedStation,
    setSelectedStation,
    lastUpdate,
  } = useAppStore();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const fuelTypes: FuelType[] = ["E10", "SP98", "Gazole", "E85", "GPLc"];
  const [snap, setSnap] = React.useState<number | string | null>(0.45);

  // Reset snap to middle when a station is selected on mobile
  useEffect(() => {
    if (selectedStation && !isDesktop) {
      // Use setTimeout to avoid synchronous state update warning
      const timer = setTimeout(() => setSnap(0.45), 0);
      return () => clearTimeout(timer);
    }
  }, [selectedStation, isDesktop]);

  return (
    <main className="bg-background relative flex h-dvh w-full flex-col overflow-hidden">
      <Toaster position="bottom-center" richColors />

      {/* Desktop Layout: Sidebar + Map */}
      {isDesktop ? (
        <div className="flex h-full w-full">
          {/* Sidebar */}
          <aside className="bg-background border-primary z-30 flex h-full w-80 flex-col border-r shadow-xl xl:w-96">
            <div className="h-full overflow-hidden">
              {selectedStation ? (
                <div className="flex h-full flex-col">
                  <div className="p-4 pb-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedStation(null)}
                      className="gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Retour à la liste
                    </Button>
                  </div>
                  <div className="flex-1 overflow-auto">
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
                  <div className="no-scrollbar pointer-events-auto flex max-w-full gap-2 overflow-x-auto px-2 pb-2">
                    {fuelTypes.map((fuel) => (
                      <Badge
                        key={fuel}
                        variant={
                          selectedFuel === fuel ? "default" : "secondary"
                        }
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
        </div>
      ) : (
        // Mobile Layout: Full Screen Map + Drawer
        <>
          {/* Map Layer */}
          <div className="absolute inset-0 z-0">
            <InteractiveMap>
              {/* Floating Header (Mobile) */}
              <div className="pointer-events-none absolute top-0 right-0 left-0 z-20 flex flex-col items-center gap-3 p-4 pt-6">
                <div className="pointer-events-auto w-full max-w-md rounded-full shadow-2xl">
                  <SearchBar />
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="no-scrollbar pointer-events-auto flex max-w-full gap-2 overflow-x-auto px-2 pb-2">
                    {fuelTypes.map((fuel) => (
                      <Badge
                        key={fuel}
                        variant={
                          selectedFuel === fuel ? "default" : "secondary"
                        }
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

          {/* Mobile Drawer */}
          <Drawer.Root
            open={true}
            onOpenChange={(open) => {
              if (!open) {
                // Prevent closing
              }
            }}
            modal={false}
            dismissible={false}
            snapPoints={[0.18, 0.45, 1]}
            activeSnapPoint={snap}
            setActiveSnapPoint={setSnap}
          >
            <Drawer.Portal>
              <Drawer.Content className="bg-background fixed right-0 bottom-0 left-0 z-50 flex h-full max-h-[96dvh] flex-col rounded-t-[20px] shadow-2xl outline-none">
                <div
                  className={`flex-1 rounded-t-[20px] ${
                    snap === 1 ? "overflow-auto" : "overflow-hidden"
                  }`}
                >
                  <Drawer.Title className="sr-only">
                    {selectedStation ? "Détails" : "Liste des stations"}
                  </Drawer.Title>

                  {/* Drag Handle */}
                  <div className="bg-muted mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full" />

                  <div className="h-full pt-2">
                    {selectedStation ? (
                      <div className="flex h-full flex-col">
                        <div className="px-4 pb-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedStation(null);
                              setSnap(0.45);
                            }}
                            className="gap-2"
                          >
                            <ArrowLeft className="h-4 w-4" />
                            Retour
                          </Button>
                        </div>
                        <div className="flex-1 overflow-auto pb-8">
                          <StationDetail />
                        </div>
                      </div>
                    ) : (
                      <StationList isPeeking={snap === 0.18} />
                    )}
                  </div>
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        </>
      )}
    </main>
  );
}
