"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { StationCard } from "./components/StationCard";
import { StationCardSkeleton } from "./components/StationCardSkeleton";
import { StationListHeader } from "./components/StationListHeader";
import { StationListRuptureSection } from "./components/StationListRuptureSection";
import { StationListStatBar } from "./components/StationListStatBar";
import { useStationListData } from "./hooks/useStationListData";

interface StationListProps {
  mobileDrawerSnap?: number | string | null;
}

export function StationList({ mobileDrawerSnap }: StationListProps = {}) {
  const {
    isExpanded,
    selectedFuel,
    listSortBy,
    setListSortBy,
    bestPriceStationIds,
    bestDistanceStationIds,
    bestRealCostStationIds,
    searchRadius,
    setSearchRadius,
    isLoading,
    distanceMode,
    isLoadingRoadDistances,
    showRuptureStations,
    majLabel,
    isDataStale,
    isDesktop,
    canUseRealCost,
    sortedStations,
    visibleStations,
    ruptureStations,
    referenceLocation,
    currentStats,
    sentinelRef,
    scrollAreaRef,
    ruptureOpen,
    setRuptureOpen,
    handleStationClick,
  } = useStationListData(mobileDrawerSnap);

  return (
    <div className="flex h-full flex-col">
      <StationListHeader
        listSortBy={listSortBy}
        setListSortBy={setListSortBy}
        canUseRealCost={canUseRealCost}
        searchRadius={searchRadius}
        setSearchRadius={setSearchRadius}
        majLabel={majLabel}
        isDataStale={isDataStale}
      />

      <StationListStatBar currentStats={currentStats} />

      {isExpanded &&
      (isLoading || (distanceMode === "road" && isLoadingRoadDistances)) ? (
        <div className="flex-1 overflow-hidden">
          <div className="flex flex-col gap-3 px-4 pt-1 pb-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <StationCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : !isLoading &&
        sortedStations.length === 0 &&
        ruptureStations.length === 0 ? (
        <div
          className={cn(
            "text-muted-foreground flex flex-1 flex-col items-center gap-4 p-4 text-center",
            isDesktop ? "justify-center" : "justify-start",
          )}
        >
          Aucune station trouvée proposant ce carburant dans cette zone.
        </div>
      ) : isExpanded ? (
        <div
          ref={scrollAreaRef}
          className="mr-1 flex h-px flex-1 flex-col overflow-hidden"
        >
          <ScrollArea className="h-full pb-4">
            <div className="flex flex-col gap-3 px-4 pb-32 md:pb-4">
              {sortedStations.length === 0 &&
                showRuptureStations &&
                ruptureStations.length > 0 && (
                  <p className="text-muted-foreground py-2 text-center text-sm">
                    Aucune station active — voir les ruptures ci-dessous.
                  </p>
                )}
              {visibleStations.map((station) => (
                <StationCard
                  key={station.id}
                  station={station}
                  selectedFuel={selectedFuel}
                  referenceLocation={referenceLocation}
                  filteredStats={currentStats}
                  bestPriceStationIds={bestPriceStationIds}
                  bestDistanceStationIds={bestDistanceStationIds}
                  bestRealCostStationIds={bestRealCostStationIds}
                  onClick={() => handleStationClick(station)}
                />
              ))}
              <div ref={sentinelRef} className="h-1" />

              {showRuptureStations && ruptureStations.length > 0 && (
                <StationListRuptureSection
                  ruptureStations={ruptureStations}
                  ruptureOpen={ruptureOpen}
                  setRuptureOpen={setRuptureOpen}
                  selectedFuel={selectedFuel}
                  referenceLocation={referenceLocation}
                  currentStats={currentStats}
                  handleStationClick={handleStationClick}
                />
              )}
            </div>
          </ScrollArea>
        </div>
      ) : null}
    </div>
  );
}
