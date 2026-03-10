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
import { searchAddresses, type SearchResult } from "@/lib/api-adresse";
import { useAppStore } from "@/store/useAppStore";
import { Loader2, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
        const results = await searchAddresses(searchQuery);
        setResults(results);
        if (results.length > 0) setOpen(true);
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
      <Command className="border-primary bg-background rounded-xl border shadow-md">
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
              <div className="text-muted-foreground flex items-center justify-center p-4 text-sm">
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
                  <MapPin className="mt-1 mr-2 h-4 w-4 shrink-0" />
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate font-medium">
                      {item.properties.label}
                    </span>
                    <span className="text-muted-foreground truncate text-xs">
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
