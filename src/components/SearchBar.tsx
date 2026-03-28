"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { searchAddresses, type SearchResult } from "@/lib/api-adresse";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { Loader2, MapPin, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function SearchBar() {
  const {
    searchQuery,
    setSearchQuery,
    setFlyToLocation,
    setSearchLocation,
    setSelectedDepartment,
  } = useAppStore();
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSelection, setIsSelection] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
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
        const data = await searchAddresses(searchQuery);
        setResults(data);
        if (data.length > 0) setOpen(true);
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
    setIsSelection(true);
    setSearchQuery("");
    setResults([]);
    setOpen(false);

    if (item.properties?.label) {
      toast.success(`Positionnée sur : ${item.properties.label}`);
    }
    if (item.properties?.context) {
      const deptCode = item.properties.context.split(",")[0].trim();
      if (deptCode) setSelectedDepartment(deptCode);
    }
    if (item.geometry?.coordinates) {
      const [lon, lat] = item.geometry.coordinates;
      setFlyToLocation([lon, lat]);
      setSearchLocation([lon, lat]);
    }
  };

  const handleClear = () => {
    setSearchQuery("");
    setResults([]);
    setOpen(false);
    setSearchLocation(null);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Rechercher une ville..."
          value={searchQuery}
          variant="search"
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (e.target.value.length >= 3) setOpen(true);
          }}
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {open && (
        <div className="border-primary/20 bg-background animate-in fade-in-0 zoom-in-95 absolute top-full left-0 z-50 mt-2 w-full overflow-hidden rounded-xl border shadow-xl">
          {loading && (
            <div className="text-muted-foreground flex items-center justify-center p-4 text-sm">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Recherche...
            </div>
          )}
          {!loading && results.length === 0 && searchQuery.length >= 3 && (
            <div className="text-muted-foreground p-4 text-center text-sm">
              Aucun résultat.
            </div>
          )}
          {!loading && results.length > 0 && (
            <div className="max-h-75 overflow-auto py-1">
              {results.map((item) => (
                <Card
                  key={item.properties.id}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "hover:bg-muted/50 cursor-pointer transition-all",
                    "rounded-none border-0 px-4 py-2 shadow-none",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 mt-0.5 shrink-0 rounded-full p-1.5">
                      <MapPin className="text-primary h-4 w-4" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="truncate text-sm font-medium">
                        {item.properties.label}
                      </span>
                      <span className="text-muted-foreground truncate text-xs">
                        {item.properties.context}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
