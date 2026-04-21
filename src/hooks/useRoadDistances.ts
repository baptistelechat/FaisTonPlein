"use client";

import { useFilteredStations } from "@/hooks/useFilteredStations";
import { fetchRoadDistances } from "@/lib/roadDistances";
import { useAppStore } from "@/store/useAppStore";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function useRoadDistances() {
  const {
    userLocation,
    searchLocation,
    distanceMode,
    setRoadDistances,
    setRoadDurations,
    setIsLoadingRoadDistances,
  } = useAppStore();
  const filteredStations = useFilteredStations();
  const referenceLocation = searchLocation ?? userLocation;

  const distanceCacheRef = useRef<Map<string, number>>(new Map());
  const durationCacheRef = useRef<Map<string, number>>(new Map());
  const cachedLocationKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      distanceMode !== "road" ||
      !referenceLocation ||
      filteredStations.length === 0
    ) {
      setRoadDistances({});
      setRoadDurations({});
      setIsLoadingRoadDistances(false);
      return;
    }

    const locationKey = `${referenceLocation[0]},${referenceLocation[1]}`;

    if (cachedLocationKeyRef.current !== locationKey) {
      distanceCacheRef.current = new Map();
      durationCacheRef.current = new Map();
      cachedLocationKeyRef.current = locationKey;
    }

    const missing = filteredStations.filter(
      (s) => !distanceCacheRef.current.has(s.id),
    );

    if (missing.length === 0) {
      const distResult: Record<string, number> = {};
      const durResult: Record<string, number> = {};
      filteredStations.forEach((s) => {
        const d = distanceCacheRef.current.get(s.id);
        if (d !== undefined) distResult[s.id] = d;
        const dur = durationCacheRef.current.get(s.id);
        if (dur !== undefined) durResult[s.id] = dur;
      });
      setRoadDistances(distResult);
      setRoadDurations(durResult);
      setIsLoadingRoadDistances(false);
      return;
    }

    let cancelled = false;
    setIsLoadingRoadDistances(true);
    fetchRoadDistances(referenceLocation, filteredStations).then(
      ({ distances, durations }) => {
        if (cancelled) return;

        if (distances.size > 0) {
          distances.forEach((v, k) => distanceCacheRef.current.set(k, v));
          durations.forEach((v, k) => durationCacheRef.current.set(k, v));

          const distResult: Record<string, number> = {};
          const durResult: Record<string, number> = {};
          filteredStations.forEach((s) => {
            const d = distanceCacheRef.current.get(s.id);
            if (d !== undefined) distResult[s.id] = d;
            const dur = durationCacheRef.current.get(s.id);
            if (dur !== undefined) durResult[s.id] = dur;
          });
          setRoadDistances(distResult);
          setRoadDurations(durResult);
        } else {
          toast.warning(
            "Service de distances routières indisponible - Utilisation des distance à vol d'oiseau",
            {
              id: "osrm-fail",
            },
          );
        }

        setIsLoadingRoadDistances(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [
    referenceLocation,
    filteredStations,
    distanceMode,
    setRoadDistances,
    setRoadDurations,
    setIsLoadingRoadDistances,
  ]);
}
