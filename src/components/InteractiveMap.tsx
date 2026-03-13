"use client";

import {
  Map,
  MapControls,
  MapMarker,
  type MapViewport,
} from "@/components/ui/map";
import { reverseGeocode } from "@/lib/api-adresse";
import { useAppStore } from "@/store/useAppStore";
import { Loader2 } from "lucide-react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import useSupercluster from "use-supercluster";
import { PriceMarker } from "./PriceMarker";
import { PulseMarker } from "./PulseMarker";

const DEFAULT_CENTER: [number, number] = [2.3522, 48.8566]; // Paris [lon, lat]
const DEFAULT_ZOOM = 13;

export default function InteractiveMap({
  children,
  mobileDrawerSnap,
}: {
  children?: ReactNode;
  mobileDrawerSnap?: number | string | null;
}) {
  const {
    stations,
    isLoading,
    selectedFuel,
    selectedStation,
    setSelectedStation,
    userLocation,
    setUserLocation,
    flyToStation,
    setFlyToStation,
    flyToLocation,
    setFlyToLocation,
    searchLocation,
    setSelectedDepartment,
    setSearchLocation,
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

  // Handle flyToLocation effect
  useEffect(() => {
    if (flyToLocation && mapRef.current) {
      const [lon, lat] = flyToLocation;
      mapRef.current?.flyTo({
        center: [lon, lat],
        zoom: 13,
        duration: 2000,
      });
      setFlyToLocation(null);
    }
  }, [flyToLocation, setFlyToLocation]);

  // Handle flyToStation effect
  useEffect(() => {
    if (flyToStation && mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current?.flyTo({
          center: [flyToStation.lon, flyToStation.lat],
          zoom: 15,
          speed: 1.2, // Make the flying slow
          curve: 1.42, // Change the speed at which it zooms out
          essential: true, // This animation is considered essential with respect to prefers-reduced-motion
        });
        setFlyToStation(null); // Reset after flying
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [flyToStation, setFlyToStation]);

  // Ensure bounds are updated when viewport stabilizes
  // We removed the timeout here to avoid conflict with handleViewportChange
  // But if we notice missing clusters after flyTo, we might need to trigger a bounds update manually.
  // The handleViewportChange is called during flyTo so it should be fine.

  // Prepare points for supercluster
  const points = stations
    .filter((station) =>
      station.prices.some((p) => p.fuel_type === selectedFuel),
    ) // Filter stations that have the selected fuel
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
  const handleViewportChange = useCallback(
    (newViewport: Partial<MapViewport>) => {
      // We need to cast newViewport because react-map-gl types might differ slightly from our local MapViewport definition
      setViewport((prev) => {
        const isZoomSame =
          Math.abs((prev.zoom || 0) - (newViewport.zoom || 0)) < 0.001;
        const isLatSame =
          Math.abs((prev.center?.[1] || 0) - (newViewport.center?.[1] || 0)) <
          0.00001;
        const isLonSame =
          Math.abs((prev.center?.[0] || 0) - (newViewport.center?.[0] || 0)) <
          0.00001;
        const isBearingSame =
          Math.abs((prev.bearing || 0) - (newViewport.bearing || 0)) < 0.01;
        const isPitchSame =
          Math.abs((prev.pitch || 0) - (newViewport.pitch || 0)) < 0.01;

        // Only update if something changed significantly to avoid loop
        if (
          isZoomSame &&
          isLatSame &&
          isLonSame &&
          isBearingSame &&
          isPitchSame
        ) {
          return prev;
        }
        return { ...prev, ...newViewport };
      });

      if (mapRef.current) {
        // mapRef.current IS the MapLibreGL.Map instance in our custom implementation
        const b = mapRef.current.getBounds();
        // Debounce bounds update to avoid too many re-renders during animation
        // Actually we can just update it, but maybe we should throttle it?
        // For now, let's keep it simple. The issue "Maximum update depth" might be caused by something else.
        // But if we want to be safe, we can wrap this in a transition or check if bounds changed significantly.
        setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      }
    },
    [],
  );

  const handleGeolocation = useCallback(
    async (coords: { latitude: number; longitude: number }) => {
      const { latitude, longitude } = coords;
      setUserLocation([longitude, latitude]);

      // Clear search location when geolocation is used to show user marker
      setSearchLocation(null);

      // Force viewport update
      setViewport((prev) => ({
        ...prev,
        center: [longitude, latitude],
        zoom: 14,
      }));

      toast.success("Position trouvée !", { id: "geo-success" });

      try {
        const result = await reverseGeocode(longitude, latitude);
        if (result && result.properties && result.properties.context) {
          const contextParts = result.properties.context.split(",");
          const deptCode = contextParts[0].trim();

          // Always set the department to trigger reload if needed
          setSelectedDepartment(deptCode);
          toast.success(`Département détecté : ${deptCode}`, {
            id: "geo-dept",
          });
        }
      } catch (error) {
        console.error("Failed to detect department", error);
      }
    },
    [setUserLocation, setSearchLocation, setSelectedDepartment],
  );

  // Initial Geolocation
  useEffect(() => {
    if (!userLocation && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => handleGeolocation(position.coords),
        (error) => {
          console.warn("Geolocation error:", error);
          if (
            window.location.protocol !== "https:" &&
            window.location.hostname !== "localhost"
          ) {
            toast.warning(
              "Géolocalisation bloquée (non-HTTPS). Utilisez la recherche manuelle.",
              { id: "geo-warning" },
            );
          } else {
            // toast.info(
            //   "Impossible de vous localiser. Recherche manuelle conseillée.",
            //   { id: "geo-info" },
            // );
          }
        },
        { enableHighAccuracy: true, timeout: 5000 },
      );
    }
  }, [setUserLocation, userLocation, handleGeolocation]);

  return (
    <div className="relative h-full w-full bg-slate-100">
      <Map
        ref={mapRef}
        theme="light"
        viewport={viewport}
        onViewportChange={handleViewportChange}
        className="h-full w-full"
      >
        <MapControls
          position="bottom-right"
          showZoom={true}
          showCompass={true}
          showLocate={true}
          onLocate={(coords) => {
            handleGeolocation(coords);
          }}
          style={
            typeof mobileDrawerSnap === "number" && mobileDrawerSnap < 0.82
              ? {
                  bottom: `calc(${mobileDrawerSnap * 100}dvh)`,
                  transition: "bottom 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
                }
              : undefined
          }
        />
        {children}

        {/* User Location Marker */}
        {userLocation && !searchLocation && (
          <MapMarker longitude={userLocation[0]} latitude={userLocation[1]}>
            <PulseMarker
              color="bg-primary"
              pingColor="bg-primary/50"
              tooltip="Vous êtes ici"
            />
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
                    supercluster?.getClusterExpansionZoom(
                      cluster.id as number,
                    ) || 0,
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

        {searchLocation && (
          <MapMarker longitude={searchLocation[0]} latitude={searchLocation[1]}>
            <PulseMarker color="bg-primary" pingColor="bg-primary/50" />
          </MapMarker>
        )}
      </Map>

      {isLoading && (
        <div className="bg-background/20 pointer-events-none absolute inset-0 z-50 flex items-center justify-center backdrop-blur-[2px]">
          <div className="bg-background/90 border-border/50 flex items-center gap-3 rounded-2xl border p-4 shadow-xl">
            <Loader2 className="text-primary size-6 animate-spin" />
            <span className="text-muted-foreground text-sm font-medium">
              Chargement des prix...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
