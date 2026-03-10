"use client";

import {
  Map,
  MapControls,
  MapMarker,
  type MapViewport,
} from "@/components/ui/map";
import { useAppStore } from "@/store/useAppStore";
import { Loader2 } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { PriceMarker } from "./PriceMarker";

const DEFAULT_CENTER: [number, number] = [2.3522, 48.8566]; // Paris [lon, lat]
const DEFAULT_ZOOM = 13;

export default function InteractiveMap({ children }: { children?: ReactNode }) {
  const {
    stations,
    fetchStations,
    isLoading,
    selectedFuel,
    selectedStation,
    setSelectedStation,
    userLocation,
    setUserLocation,
  } = useAppStore();

  const [viewport, setViewport] = useState<Partial<MapViewport>>({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    bearing: 0,
    pitch: 0,
  });

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  // Initial Geolocation
  useEffect(() => {
    if (!userLocation && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([longitude, latitude]);
          setViewport((prev) => ({
            ...prev,
            center: [longitude, latitude],
            zoom: 14,
          }));
          toast.success("Position trouvée !");
        },
        (error) => {
          console.error("Geolocation error:", error);
          if (
            window.location.protocol !== "https:" &&
            window.location.hostname !== "localhost"
          ) {
            toast.warning(
              "Géolocalisation bloquée (non-HTTPS). Utilisez la recherche manuelle.",
            );
          } else {
            toast.info(
              "Impossible de vous localiser. Recherche manuelle conseillée.",
            );
          }
        },
        { enableHighAccuracy: true, timeout: 5000 },
      );
    }
  }, [setUserLocation, userLocation]);

  return (
    <div className="relative w-full h-full bg-slate-100">
      <Map
        theme="light"
        viewport={viewport}
        onViewportChange={setViewport}
        className="w-full h-full"
      >
        <MapControls />
        {children}

        {/* User Location Marker */}
        {userLocation && (
          <MapMarker longitude={userLocation[0]} latitude={userLocation[1]}>
            <div className="relative flex items-center justify-center size-6 group">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75 duration-1000"></span>
              <div className="relative inline-flex h-4 w-4 rounded-full bg-blue-600 border-[3px] border-white shadow-lg ring-1 ring-black/10"></div>
              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Vous êtes ici
              </div>
            </div>
          </MapMarker>
        )}

        {/* Station Markers */}
        {stations.map((station) => {
          const price = station.prices.find(
            (p) => p.fuel_type === selectedFuel,
          );
          if (!price) return null;

          return (
            <MapMarker
              key={station.id}
              longitude={station.lon}
              latitude={station.lat}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedStation(station);
                setViewport((prev) => ({
                  ...prev,
                  center: [station.lon, station.lat],
                  zoom: 15,
                  duration: 800,
                }));
              }}
            >
              <PriceMarker
                price={price.price}
                fuelType={selectedFuel}
                isSelected={selectedStation?.id === station.id}
              />
            </MapMarker>
          );
        })}
      </Map>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[2px] z-50 pointer-events-none">
          <div className="bg-background/90 p-4 rounded-2xl shadow-xl flex flex-col items-center gap-3 border border-border/50">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              Chargement des prix...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
