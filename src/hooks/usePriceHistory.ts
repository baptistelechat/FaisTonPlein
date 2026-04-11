"use client";

import { useState, useEffect } from "react";
import { useDuckDB } from "@/components/DuckDBProvider";
import { useAppStore } from "@/store/useAppStore";
import {
  fetchStationPriceHistory,
  type PriceHistoryPoint,
} from "@/lib/priceHistory";
import { getDeptFromStationId } from "@/lib/utils";

// Cache module-level — persiste toute la session (survit aux unmounts du composant)
const HISTORY_CACHE_MAX = 150;
const historyCache = new Map<string, PriceHistoryPoint[]>();

function setCached(key: string, value: PriceHistoryPoint[]): void {
  if (historyCache.size >= HISTORY_CACHE_MAX) {
    const firstKey = historyCache.keys().next().value;
    if (firstKey !== undefined) historyCache.delete(firstKey);
  }
  historyCache.set(key, value);
}

export function usePriceHistory() {
  const { db } = useDuckDB();
  const selectedStation = useAppStore((s) => s.selectedStation);
  const selectedFuel = useAppStore((s) => s.selectedFuel);

  const [data, setData] = useState<PriceHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!db || !selectedStation) return;

    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = `${selectedStation.id}_${selectedFuel}_${today}`;
    const cached = historyCache.get(cacheKey);

    if (cached) {
      setData(cached);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setData([]);

    const dept = getDeptFromStationId(selectedStation.id);
    fetchStationPriceHistory(db, selectedStation.id, dept, selectedFuel)
      .then((history) => {
        if (cancelled) return;
        setCached(cacheKey, history);
        setData(history);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, selectedStation?.id, selectedFuel]);

  return { data, isLoading };
}
