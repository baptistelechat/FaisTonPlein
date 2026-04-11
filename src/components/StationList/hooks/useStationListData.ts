"use client";

import { useFilteredStations } from "@/hooks/useFilteredStations";
import { useFilteredStats } from "@/hooks/useFilteredStats";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useReferenceLocation } from "@/hooks/useReferenceLocation";
import { useRuptureStations } from "@/hooks/useRuptureStations";
import { DRAWER_SNAP_POINTS } from "@/lib/constants";

const PAGE_SIZE = 15;
import { getStationNamesDb } from "@/lib/stationName";
import {
  calculateEffectiveCost,
  capitalize,
  getStationDistance,
} from "@/lib/utils";
import { Station, useAppStore } from "@/store/useAppStore";
import { formatRelative } from "date-fns";
import { fr } from "date-fns/locale";
import { useEffect, useMemo, useRef, useState } from "react";

export function useStationListData(mobileDrawerSnap?: number | string | null) {
  const isExpanded =
    !mobileDrawerSnap || mobileDrawerSnap === DRAWER_SNAP_POINTS.EXPANDED;

  const {
    selectedFuel,
    setSelectedStation,
    setFlyToStation,
    listSortBy,
    setListSortBy,
    bestPriceStationIds,
    bestDistanceStationIds,
    bestRealCostStationIds,
    resolvedNames,
    setResolvedName,
    searchRadius,
    setSearchRadius,
    lastUpdate,
    isLoading,
    consumption,
    tankCapacity,
    fillHabit,
    roadDistances,
    isLoadingRoadDistances,
    distanceMode,
    showRuptureStations,
  } = useAppStore();

  const majLabel = lastUpdate
    ? capitalize(
        formatRelative(new Date(lastUpdate), new Date(), { locale: fr }),
      )
    : null;

  const isDataStale = useMemo(
    () =>
      lastUpdate !== null &&
      // eslint-disable-next-line react-hooks/purity
      Date.now() - new Date(lastUpdate).getTime() > 2 * 60 * 60 * 1000,
    [lastUpdate],
  );

  const filteredStations = useFilteredStations();
  const ruptureStations = useRuptureStations();
  const allFilteredStats = useFilteredStats();
  const isDesktop = useIsDesktop();

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [ruptureOpen, setRuptureOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const referenceLocation = useReferenceLocation();

  const canUseRealCost =
    consumption > 0 && tankCapacity > 0 && referenceLocation !== null;

  const sortedStations = useMemo(() => {
    if (!referenceLocation) return filteredStations;

    const fillAmount = tankCapacity * fillHabit;

    return [...filteredStations].sort((a, b) => {
      const priceA = a.prices.find((p) => p.fuel_type === selectedFuel)?.price;
      const priceB = b.prices.find((p) => p.fuel_type === selectedFuel)?.price;

      const distA = getStationDistance(a, referenceLocation, roadDistances);
      const distB = getStationDistance(b, referenceLocation, roadDistances);

      if (listSortBy === "real-cost") {
        if (!priceA) return 1;
        if (!priceB) return -1;
        const costA = calculateEffectiveCost({
          pricePerLiter: priceA,
          distanceKm: distA,
          fillAmount,
          consumption,
        }).total;
        const costB = calculateEffectiveCost({
          pricePerLiter: priceB,
          distanceKm: distB,
          fillAmount,
          consumption,
        }).total;
        const diff = costA - costB;
        if (diff !== 0) return diff;
        return distA - distB;
      }

      if (listSortBy === "price") {
        if (!priceA) return 1;
        if (!priceB) return -1;
        const priceDiff = priceA - priceB;
        if (priceDiff !== 0) return priceDiff;
        return distA - distB;
      }

      // distance (default)
      const distDiff = distA - distB;
      if (distDiff !== 0) return distDiff;
      if (!priceA) return 1;
      if (!priceB) return -1;
      return priceA - priceB;
    });
  }, [
    filteredStations,
    referenceLocation,
    selectedFuel,
    listSortBy,
    consumption,
    tankCapacity,
    fillHabit,
    roadDistances,
  ]);

  const [prevSortedStations, setPrevSortedStations] = useState(sortedStations);
  if (prevSortedStations !== sortedStations) {
    setPrevSortedStations(sortedStations);
    setVisibleCount(PAGE_SIZE);
  }

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]',
    );
    if (viewport) viewport.scrollTop = 0;
  }, [sortedStations]);

  const visibleStations = useMemo(
    () => sortedStations.slice(0, visibleCount),
    [sortedStations, visibleCount],
  );

  useEffect(() => {
    const unresolved = [...visibleStations, ...ruptureStations].filter(
      (s) => !resolvedNames[String(s.id)],
    );
    if (unresolved.length === 0) return;

    getStationNamesDb().then((db) => {
      for (const station of unresolved) {
        setResolvedName(
          String(station.id),
          db[String(station.id)] ?? station.name,
        );
      }
    });
  }, [visibleStations, ruptureStations, resolvedNames, setResolvedName]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + PAGE_SIZE, sortedStations.length),
          );
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sortedStations.length, isLoading, isLoadingRoadDistances]);

  const handleStationClick = (station: Station) => {
    setSelectedStation(station);
    setFlyToStation(station);
  };

  const currentStats = allFilteredStats[selectedFuel] ?? null;

  return {
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
  };
}
