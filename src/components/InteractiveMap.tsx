"use client";

import {
  Map,
  MapControls,
  MapMarker,
  type MapViewport,
} from "@/components/ui/map";
import { useFilteredStations } from "@/hooks/useFilteredStations";
import { useFilteredStats } from "@/hooks/useFilteredStats";
import { reverseGeocode } from "@/lib/api-adresse";
import { useAppStore } from "@/store/useAppStore";
import { Loader2 } from "lucide-react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import useSupercluster from "use-supercluster";
import { PriceMarker } from "./PriceMarker";
import { PulseMarker } from "./PulseMarker";

const DEFAULT_CENTER: [number, number] = [2.3522, 48.8566]; // Paris [lon, lat]
const DEFAULT_ZOOM = 13;

const createCircleGeoJSON = (
  center: [number, number],
  radiusKm: number,
): GeoJSON.Feature<GeoJSON.Polygon> => {
  const POINTS = 64;
  const [lon, lat] = center;
  const latRad = (lat * Math.PI) / 180;
  const latOffset = radiusKm / 111.32;
  const lonOffset = radiusKm / (111.32 * Math.cos(latRad));

  const coordinates: [number, number][] = [];
  for (let i = 0; i <= POINTS; i++) {
    const angle = (i * 2 * Math.PI) / POINTS;
    coordinates.push([
      lon + lonOffset * Math.cos(angle),
      lat + latOffset * Math.sin(angle),
    ]);
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
  };
};

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
    bestPriceStationId,
    bestDistanceStationId,
    searchRadius,
    fitToListSignal,
  } = useAppStore();

  const filteredStations = useFilteredStations();
  const filteredStats = useFilteredStats();
  const filteredStationsRef = useRef(filteredStations);
  useEffect(() => {
    filteredStationsRef.current = filteredStations;
  }, [filteredStations]);

  const mapRef = useRef<MapLibreMap>(null);
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null);

  const [bounds, setBounds] = useState<[number, number, number, number] | null>(
    null,
  );

  const [viewport, setViewport] = useState<Partial<MapViewport>>({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    bearing: 0,
    pitch: 0,
  });

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (mapRef.current) {
        setMapInstance(mapRef.current);
        return;
      }
      requestAnimationFrame(tick);
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [mapInstance]);

  useEffect(() => {
    if (!mapInstance) return;

    const updateBounds = () => {
      const b = mapInstance.getBounds();
      setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    };

    updateBounds();
    const timer = setTimeout(updateBounds, 0);

    mapInstance.on("load", updateBounds);
    mapInstance.on("moveend", updateBounds);
    mapInstance.on("zoomend", updateBounds);

    return () => {
      clearTimeout(timer);
      mapInstance.off("load", updateBounds);
      mapInstance.off("moveend", updateBounds);
      mapInstance.off("zoomend", updateBounds);
    };
  }, [mapInstance]);

  // Search radius circle layer
  const referenceLocation = searchLocation || userLocation;
  // Refs stables pour lecture dans les effects à dep unique (fitToListSignal)
  const searchRadiusRef = useRef(searchRadius);
  const referenceLocationRef = useRef(referenceLocation);
  useEffect(() => {
    searchRadiusRef.current = searchRadius;
    referenceLocationRef.current = referenceLocation;
  }, [searchRadius, referenceLocation]);

  useEffect(() => {
    if (!mapInstance) return;

    const updateCircle = () => {
      if (!mapInstance.getSource("radius-circle")) {
        const primaryColor = "#4f46e5"; // indigo-600
        mapInstance.addSource("radius-circle", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        mapInstance.addLayer({
          id: "radius-fill",
          type: "fill",
          source: "radius-circle",
          paint: {
            "fill-color": primaryColor,
            "fill-opacity": 0.04,
          },
        });
        mapInstance.addLayer({
          id: "radius-border",
          type: "line",
          source: "radius-circle",
          paint: {
            "line-color": primaryColor,
            "line-width": 1.5,
            "line-opacity": 0.5,
            "line-dasharray": [3, 3],
          },
        });
      }

      const source = mapInstance.getSource("radius-circle") as GeoJSONSource;

      if (!referenceLocation || searchRadius === 0) {
        source.setData({ type: "FeatureCollection", features: [] });
      } else {
        source.setData(createCircleGeoJSON(referenceLocation, searchRadius));
      }
    };

    if (!mapInstance.isStyleLoaded()) {
      mapInstance.once("load", updateCircle);
      return () => {
        mapInstance.off("load", updateCircle);
      };
    }

    updateCircle();
  }, [mapInstance, referenceLocation, searchRadius]);

  // Recentrer la carte quand le rayon de recherche change
  useEffect(() => {
    if (searchRadius === 0 || referenceLocation === null) return;
    if (!mapRef.current) return;

    const [lon, lat] = referenceLocation;
    const latRad = (lat * Math.PI) / 180;
    const latOffset = searchRadius / 111.32;
    const lonOffset = searchRadius / (111.32 * Math.cos(latRad));

    mapRef.current.fitBounds(
      [
        [lon - lonOffset, lat - latOffset],
        [lon + lonOffset, lat + latOffset],
      ],
      { padding: 60, duration: 800 },
    );
  }, [searchRadius, referenceLocation]);

  // Retour à la liste — recentre sur le cercle de rayon (même comportement que le changement de rayon)
  useEffect(() => {
    if (fitToListSignal === 0 || !mapRef.current) return;
    const sr = searchRadiusRef.current;
    const rl = referenceLocationRef.current;
    if (sr > 0 && rl) {
      const [lon, lat] = rl;
      const latRad = (lat * Math.PI) / 180;
      const latOffset = sr / 111.32;
      const lonOffset = sr / (111.32 * Math.cos(latRad));
      mapRef.current.fitBounds(
        [
          [lon - lonOffset, lat - latOffset],
          [lon + lonOffset, lat + latOffset],
        ],
        { padding: 60, duration: 800 },
      );
    }
  }, [fitToListSignal]);

  // Handle flyToLocation effect — si un rayon est actif, fitBounds sur le cercle plutôt que flyTo fixe
  useEffect(() => {
    if (flyToLocation && mapRef.current) {
      const [lon, lat] = flyToLocation;
      if (searchRadius > 0) {
        const latRad = (lat * Math.PI) / 180;
        const latOffset = searchRadius / 111.32;
        const lonOffset = searchRadius / (111.32 * Math.cos(latRad));
        mapRef.current.fitBounds(
          [
            [lon - lonOffset, lat - latOffset],
            [lon + lonOffset, lat + latOffset],
          ],
          { padding: 60, duration: 800 },
        );
      } else {
        mapRef.current.flyTo({
          center: [lon, lat],
          zoom: 13,
          duration: 2000,
        });
      }
      setFlyToLocation(null);
    }
  }, [flyToLocation, setFlyToLocation, searchRadius]);

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
  const points = filteredStations
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

  const bestPriceStation = useMemo(
    () => stations.find((s) => s.id === bestPriceStationId) ?? null,
    [stations, bestPriceStationId],
  );

  const bestDistanceStation = useMemo(
    () => stations.find((s) => s.id === bestDistanceStationId) ?? null,
    [stations, bestDistanceStationId],
  );

  // Get clusters
  const { clusters, supercluster } = useSupercluster({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    points: points as any[],
    bounds: bounds ?? undefined,
    zoom: viewport.zoom || DEFAULT_ZOOM,
    options: { radius: 75, maxZoom: 15 }, // radius: cluster size in pixels
  });

  // Update viewport state on map move — bounds are handled separately by the mapInstance effect (moveend/zoomend)
  const handleViewportChange = useCallback(
    (newViewport: Partial<MapViewport>) => {
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
                isBestPrice={
                  cluster.properties.stationId === bestPriceStationId
                }
                isBestDistance={
                  cluster.properties.stationId === bestDistanceStationId
                }
                filteredStats={filteredStats}
              />
            </MapMarker>
          );
        })}
        {bestPriceStation &&
          bestDistanceStation &&
          bestPriceStation.id === bestDistanceStation.id && (
            <MapMarker
              key="best-both"
              longitude={bestPriceStation.lon}
              latitude={bestPriceStation.lat}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedStation(bestPriceStation);
                setViewport((prev) => ({
                  ...prev,
                  center: [bestPriceStation.lon, bestPriceStation.lat],
                  zoom: 15,
                  duration: 800,
                }));
              }}
            >
              <PulseMarker
                color="bg-yellow-500"
                pingColor="bg-yellow-500"
                tooltip="Meilleur prix & plus proche"
              />
            </MapMarker>
          )}

        {bestPriceStation &&
          (!bestDistanceStation ||
            bestDistanceStation.id !== bestPriceStation.id) && (
            <MapMarker
              key="best-price"
              longitude={bestPriceStation.lon}
              latitude={bestPriceStation.lat}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedStation(bestPriceStation);
                setViewport((prev) => ({
                  ...prev,
                  center: [bestPriceStation.lon, bestPriceStation.lat],
                  zoom: 15,
                  duration: 800,
                }));
              }}
            >
              <PulseMarker
                color="bg-yellow-500"
                pingColor="bg-yellow-500"
                tooltip="Meilleur prix"
              />
            </MapMarker>
          )}

        {bestDistanceStation &&
          (!bestPriceStation ||
            bestPriceStation.id !== bestDistanceStation.id) && (
            <MapMarker
              key="best-distance"
              longitude={bestDistanceStation.lon}
              latitude={bestDistanceStation.lat}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedStation(bestDistanceStation);
                setViewport((prev) => ({
                  ...prev,
                  center: [bestDistanceStation.lon, bestDistanceStation.lat],
                  zoom: 15,
                  duration: 800,
                }));
              }}
            >
              <PulseMarker
                color="bg-yellow-500"
                pingColor="bg-yellow-500"
                tooltip="Plus proche"
              />
            </MapMarker>
          )}

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
