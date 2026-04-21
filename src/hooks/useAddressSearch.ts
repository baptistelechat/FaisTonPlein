"use client";

import { searchAddresses, type SearchResult } from "@/lib/api-adresse";
import { useAppStore } from "@/store/useAppStore";
import { useRef, useState } from "react";

interface UseAddressSearchOptions {
  onSelect?: () => void;
}

interface UseAddressSearchReturn {
  results: SearchResult[];
  isLoading: boolean;
  handleSearch: (query: string) => void;
  handleSelect: (item: SearchResult) => void;
  clearResults: () => void;
}

export const useAddressSearch = (
  options: UseAddressSearchOptions = {},
): UseAddressSearchReturn => {
  const { onSelect } = options;

  const {
    setSearchQuery,
    setFlyToLocation,
    setSearchLocation,
    setSelectedDepartment,
    setUserLocation,
  } = useAppStore();

  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSelectionRef = useRef(false);

  const handleSearch = (query: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (isSelectionRef.current) {
        isSelectionRef.current = false;
        return;
      }

      if (!query || query.length < 3) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const data = await searchAddresses(query);
        setResults(data);
      } catch (error) {
        console.error("Search error:", error);
        useAppStore.getState().setIsApiAdresseUnavailable(true);
      } finally {
        setIsLoading(false);
      }
    }, 500);
  };

  const handleSelect = (item: SearchResult) => {
    isSelectionRef.current = true;

    setUserLocation(null);
    setSearchQuery("");
    setResults([]);

    if (item.properties?.context) {
      const deptCode = item.properties.context.split(",")[0].trim();
      if (deptCode) setSelectedDepartment(deptCode);
    }

    if (item.geometry?.coordinates) {
      const [lon, lat] = item.geometry.coordinates;
      setFlyToLocation([lon, lat]);
      setSearchLocation([lon, lat]);
    }

    onSelect?.();
  };

  const clearResults = () => {
    setResults([]);
  };

  return { results, isLoading, handleSearch, handleSelect, clearResults };
};
