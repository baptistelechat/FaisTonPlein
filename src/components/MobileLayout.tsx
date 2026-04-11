import { FuelTypeSelector } from "@/components/FuelTypeSelector";
import InteractiveMap from "@/components/InteractiveMap";
import { SearchPanel } from "@/components/SearchPanel";
import { StationDetail } from "@/components/StationDetail";
import { StationList } from "@/components/StationList";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { usePriceTrends } from "@/hooks/usePriceTrends";
import { useRoadDistances } from "@/hooks/useRoadDistances";
import { DRAWER_SNAP_POINTS, DRAWER_SNAP_POINTS_ARRAY } from "@/lib/constants";
import { useAppStore } from "@/store/useAppStore";
import { ArrowLeft, Search } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function MobileLayout() {
  useRoadDistances();
  usePriceTrends();
  const {
    selectedStation,
    setSelectedStation,
    searchQuery,
    triggerFitToList,
  } = useAppStore();
  const [snap, setSnap] = useState<number | string | null>(
    DRAWER_SNAP_POINTS.DEFAULT,
  );
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);

  // Refs pour accéder aux valeurs courantes dans les event listeners sans stale closures
  const snapRef = useRef(snap);
  const selectedStationRef = useRef(selectedStation);
  const searchPanelRef = useRef(searchPanelOpen);
  useLayoutEffect(() => {
    snapRef.current = snap;
    selectedStationRef.current = selectedStation;
    searchPanelRef.current = searchPanelOpen;
  }, [snap, selectedStation, searchPanelOpen]);

  // Snap à DEFAULT quand une station est sélectionnée
  useEffect(() => {
    if (selectedStation) {
      const timer = setTimeout(() => setSnap(DRAWER_SNAP_POINTS.DEFAULT), 0);
      return () => clearTimeout(timer);
    }
  }, [selectedStation]);

  // Interception du bouton retour Android
  useEffect(() => {
    window.history.pushState(null, "");

    const handlePopState = () => {
      window.history.pushState(null, "");

      if (searchPanelRef.current) {
        // Panneau de recherche ouvert → le fermer
        setSearchPanelOpen(false);
      } else if (selectedStationRef.current) {
        if (snapRef.current === DRAWER_SNAP_POINTS.EXPANDED) {
          // Station ouverte en EXPANDED → réduire à DEFAULT d'abord
          setSnap(DRAWER_SNAP_POINTS.DEFAULT);
        } else {
          // Station ouverte en DEFAULT → retour à la liste
          setSelectedStation(null);
          setSnap(DRAWER_SNAP_POINTS.DEFAULT);
          triggerFitToList();
        }
      } else if (snapRef.current === DRAWER_SNAP_POINTS.EXPANDED) {
        // Drawer en grand → réduire
        setSnap(DRAWER_SNAP_POINTS.DEFAULT);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [setSelectedStation, triggerFitToList]);

  return (
    <>
      {/* Map Layer */}
      <div className="absolute inset-0 z-0">
        <InteractiveMap mobileDrawerSnap={snap}>
          {/* Floating Header (Mobile) */}
          <div className="pointer-events-none absolute top-0 right-0 left-0 z-20 flex flex-col items-center gap-3 p-4">
            {/* Search Trigger Button */}
            <div className="pointer-events-auto w-full max-w-md px-4">
              <Button
                variant="outline"
                onClick={() => setSearchPanelOpen(true)}
                className="bg-background/80 text-muted-foreground hover:bg-background w-full justify-start gap-2 rounded-md border shadow-md backdrop-blur-md"
              >
                <Search className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {searchQuery || "Rechercher une ville..."}
                </span>
              </Button>
            </div>
            <div className="flex flex-col items-center gap-2">
              <FuelTypeSelector className="justify-center" />
            </div>
          </div>
        </InteractiveMap>
      </div>

      {searchPanelOpen ? (
        // SearchPanel monté SANS le drawer → vaul n'a aucun listener actif
        // → les événements touch/click atteignent normalement l'input
        // → fixed inset-0 s'adapte au viewport réduit par le clavier
        <SearchPanel onClose={() => setSearchPanelOpen(false)} />
      ) : (
        // Drawer monté SANS le SearchPanel → vaul gère ses propres événements
        <Drawer
          open={true}
          onOpenChange={(open) => {
            if (!open) setSnap(DRAWER_SNAP_POINTS.DEFAULT);
          }}
          modal={false}
          dismissible={false}
          snapPoints={DRAWER_SNAP_POINTS_ARRAY}
          activeSnapPoint={snap}
          setActiveSnapPoint={(newSnap) => {
            if (newSnap !== null) setSnap(newSnap);
          }}
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
                  <div className="flex items-center px-4 py-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedStation(null);
                        setSnap(DRAWER_SNAP_POINTS.DEFAULT);
                        triggerFitToList();
                      }}
                      className="max-w-full justify-start gap-2"
                    >
                      <ArrowLeft className="h-4 w-4 shrink-0" />
                      <span className="shrink-0">Retour</span>
                    </Button>
                  </div>
                  <div className="min-h-0 flex-1">
                    <StationDetail mobileDrawerSnap={snap} />
                  </div>
                </div>
              ) : (
                <StationList mobileDrawerSnap={snap} />
              )}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
