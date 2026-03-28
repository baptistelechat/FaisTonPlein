"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { searchAddresses, type SearchResult } from "@/lib/api-adresse";
import { useAppStore } from "@/store/useAppStore";
import { ArrowLeft, Loader2, MapPin, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface SearchPanelProps {
  onClose: () => void;
}

export function SearchPanel({ onClose }: SearchPanelProps) {
  const {
    searchQuery,
    setSearchQuery,
    setFlyToLocation,
    setSearchLocation,
    setSelectedDepartment,
  } = useAppStore();

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSelection, setIsSelection] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus : délai pour laisser l'animation d'entrée se terminer
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (isSelection) {
        setIsSelection(false);
        return;
      }
      if (!searchQuery || searchQuery.length < 3) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const data = await searchAddresses(searchQuery);
        setResults(data);
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
    onClose();

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
    setSearchLocation(null);
    inputRef.current?.focus();
  };

  return (
    // fixed inset-0 : s'adapte naturellement au viewport réduit par le clavier
    // Le clavier réduit window.innerHeight → inset-0 prend les nouvelles dimensions
    // L'input en haut reste toujours visible au-dessus du clavier
    <div className="bg-background fixed inset-0 z-[200] flex flex-col">
      {/* Header : bouton retour + input */}
      <div className="flex items-center p-3 pb-0">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={onClose}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            placeholder="Rechercher une ville..."
            value={searchQuery}
            variant="search"
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-3"
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
      </div>

      {/* Résultats : scrollables, fill remaining height */}
      <div className="flex-1 overflow-y-auto p-4">
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
          <div className="flex flex-col gap-2">
            {results.map((item) => (
              <Card
                key={item.properties.id}
                onClick={() => handleSelect(item)}
                className="hover:bg-muted/50 cursor-pointer p-3 transition-all"
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
    </div>
  );
}
