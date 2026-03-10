"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useMap } from "@/components/ui/map";
import { useAppStore } from "@/store/useAppStore";
import { Loader2, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type SearchResult = {
  properties: {
    id: string;
    label: string;
    context: string;
  };
  geometry: {
    coordinates: [number, number];
  };
};

export function SearchBar() {
  const { searchQuery, setSearchQuery } = useAppStore();
  const { map } = useMap();
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  // Track if the search was triggered by a user selection to prevent reopening
  const [isSelection, setIsSelection] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      // If the query change is due to a selection, don't search again
      if (isSelection) {
        setIsSelection(false);
        return;
      }

      if (!searchQuery || searchQuery.length < 3) {
        setResults([]);
        setOpen(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
            searchQuery,
          )}&limit=5&autocomplete=1`,
        );
        const data = await response.json();

        // API Adresse returns a FeatureCollection, we want the features array
        if (data && data.features) {
          setResults(data.features);
          if (data.features.length > 0) setOpen(true);
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleSelect = (item: SearchResult) => {
    if (!map) return;

    setIsSelection(true); // Flag this update as a selection
    setOpen(false);

    // Safety check for properties
    if (item.properties && item.properties.label) {
      setSearchQuery(item.properties.label);
      toast.success(`Positionnée sur : ${item.properties.label}`);
    }

    // Safety check for geometry
    if (item.geometry && item.geometry.coordinates) {
      const [lon, lat] = item.geometry.coordinates;
      map.flyTo({
        center: [lon, lat],
        zoom: 13,
        duration: 2000,
      });
    }
  };

  return (
    <div className="w-full max-w-md">
      <Command className="rounded-xl border border-primary shadow-md bg-background">
        <CommandInput
          placeholder="Rechercher une ville..."
          value={searchQuery}
          onValueChange={(val) => {
            setSearchQuery(val);
            if (val.length >= 3) setOpen(true);
          }}
        />
        {open && (
          <CommandList className="max-h-75">
            {loading && (
              <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recherche...
              </div>
            )}
            {!loading && results.length === 0 && (
              <CommandEmpty>Aucun résultat.</CommandEmpty>
            )}
            <CommandGroup>
              {results.map((item) => (
                <CommandItem
                  key={item.properties.id}
                  value={item.properties.label}
                  onSelect={() => handleSelect(item)}
                  className="cursor-pointer items-start"
                >
                  <MapPin className="mr-2 h-4 w-4 shrink-0 mt-1" />
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate font-medium">
                      {item.properties.label}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {item.properties.context}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        )}
      </Command>
    </div>
  );
}
