"use client";

import {
  Map,
  MapControls,
  MapMarker,
  type MapViewport,
} from "@/components/ui/map";
import { useAppStore } from "@/store/useAppStore";
import { Loader2 } from "lucide-react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import useSupercluster from "use-supercluster";
import { PriceMarker } from "./PriceMarker";

const DEFAULT_CENTER: [number, number] = [2.3522, 48.8566]; // Paris [lon, lat]
const DEFAULT_ZOOM = 13;

export default function InteractiveMap({ children }: { children?: ReactNode }) {
  const {
    stations,
    isLoading,
    selectedFuel,
    selectedStation,
    setSelectedStation,
    userLocation,
    setUserLocation,
  } = useAppStore();

  const mapRef = useRef<MapLibreMap>(null);

  const [bounds, setBounds] = useState<[number, number, number, number] | null>(
    null,
  );

  const [viewport, setViewport] = useState<Partial<MapViewport>>({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    bearing: 0,
    pitch: 0,
  });

  // Prepare points for supercluster
  const points = stations
    .map((station) => {
      const price = station.prices.find((p) => p.fuel_type === selectedFuel);
      if (!price) return null;
      return {
        type: "Feature",
        properties: {
          cluster: false,
          stationId: station.id,
          price: price.price,
          fuelType: selectedFuel,
          isSelected: selectedStation?.id === station.id,
        },
        geometry: {
          type: "Point",
          coordinates: [station.lon, station.lat],
        },
      };
    })
    .filter((p) => p !== null);

  // Get clusters

  const { clusters, supercluster } = useSupercluster({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    points: points as any[],
    bounds: bounds ?? undefined,
    zoom: viewport.zoom || DEFAULT_ZOOM,
    options: { radius: 75, maxZoom: 15 }, // radius: cluster size in pixels
  });

  // Update bounds on viewport change
  const handleViewportChange = (newViewport: Partial<MapViewport>) => {
    // We need to cast newViewport because react-map-gl types might differ slightly from our local MapViewport definition
    setViewport(newViewport as Partial<MapViewport>);

    if (mapRef.current) {
      // mapRef.current IS the MapLibreGL.Map instance in our custom implementation
      const b = mapRef.current.getBounds();
      setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    }
  };

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
    <div className="relative h-full w-full bg-slate-100">
      <Map
        ref={mapRef}
        theme="light"
        viewport={viewport}
        onViewportChange={handleViewportChange}
        className="h-full w-full"
      >
        <MapControls />
        {children}

        {/* User Location Marker */}
        {userLocation && (
          <MapMarker longitude={userLocation[0]} latitude={userLocation[1]}>
            <div className="group relative flex size-6 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-75 duration-1000"></span>
              <div className="relative inline-flex h-4 w-4 rounded-full border-[3px] border-white bg-indigo-600 shadow-lg ring-1 ring-black/10"></div>
              {/* Tooltip */}
              <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-black/80 px-2 py-1 text-[10px] font-bold whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                Vous êtes ici
              </div>
            </div>
          </MapMarker>
        )}

        {/* Clusters and Markers */}
        {clusters.map((cluster) => {
          const [longitude, latitude] = cluster.geometry.coordinates;
          const { cluster: isCluster, point_count: pointCount } =
            cluster.properties;

          if (isCluster) {
            return (
              <MapMarker
                key={`cluster-${cluster.id}`}
                latitude={latitude}
                longitude={longitude}
                onClick={(e) => {
                  e.stopPropagation();
                  const expansionZoom = Math.min(
                    supercluster?.getClusterExpansionZoom(cluster.id as number) || 0,
                    20,
                  );
                  setViewport({
                    ...viewport,
                    zoom: expansionZoom,
                    center: [longitude, latitude],
                  });
                }}
              >
                <div className="bg-primary flex h-10 w-10 items-center justify-center rounded-full border-2 border-white font-bold text-white shadow-lg">
                  {pointCount}
                </div>
              </MapMarker>
            );
          }

          // Render individual station marker
          return (
            <MapMarker
              key={`station-${cluster.properties.stationId}`}
              latitude={latitude}
              longitude={longitude}
              onClick={(e) => {
                e.stopPropagation();
                // Find original station object
                const station = stations.find(
                  (s) => s.id === cluster.properties.stationId,
                );
                if (station) {
                  setSelectedStation(station);
                  setViewport((prev) => ({
                    ...prev,
                    center: [station.lon, station.lat],
                    zoom: 15,
                    duration: 800,
                  }));
                }
              }}
            >
              <PriceMarker
                price={cluster.properties.price}
                fuelType={cluster.properties.fuelType}
                isSelected={cluster.properties.isSelected}
              />
            </MapMarker>
          );
        })}
      </Map>

      {isLoading && (
        <div className="bg-background/20 pointer-events-none absolute inset-0 z-50 flex items-center justify-center backdrop-blur-[2px]">
          <div className="bg-background/90 border-border/50 flex flex-col items-center gap-3 rounded-2xl border p-4 shadow-xl">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
            <span className="text-muted-foreground text-sm font-medium">
              Chargement des prix...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
