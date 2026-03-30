"use client";

import {
  Map,
  MapControls,
  MapMarker,
  useMap,
  type MapViewport,
} from "@/components/ui/map";
import { useFilteredStations } from "@/hooks/useFilteredStations";
import { useFilteredStats } from "@/hooks/useFilteredStats";
import { useIsodistance } from "@/hooks/useIsodistance";
import { useRouteGeometry } from "@/hooks/useRouteGeometry";
import { reverseGeocode } from "@/lib/api-adresse";
import { useAppStore } from "@/store/useAppStore";
import { Loader2 } from "lucide-react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import useSupercluster from "use-supercluster";
import { PriceMarker } from "./PriceMarker";
import { PulseMarker } from "./PulseMarker";
import { StationRoute } from "./StationRoute";

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

const RADIUS_SOURCE_ID = 'radius-zone';
const RADIUS_PRIMARY_COLOR = '#4f46e5';

function RadiusZone({
  referenceLocation,
  searchRadius,
  distanceMode,
}: {
  referenceLocation: [number, number] | null;
  searchRadius: number;
  distanceMode: 'road' | 'crow-fly';
}) {
  const { map, isLoaded } = useMap();
  const isodistanceGeometry = useAppStore((s) => s.isodistanceGeometry);

  // Créer la source et les layers une seule fois quand la carte est chargée
  useEffect(() => {
    if (!isLoaded || !map) return;
    if (!map.getSource(RADIUS_SOURCE_ID)) {
      map.addSource(RADIUS_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'radius-fill',
        type: 'fill',
        source: RADIUS_SOURCE_ID,
        paint: { 'fill-color': RADIUS_PRIMARY_COLOR, 'fill-opacity': 0.04 },
      });
      map.addLayer({
        id: 'radius-border',
        type: 'line',
        source: RADIUS_SOURCE_ID,
        paint: {
          'line-color': RADIUS_PRIMARY_COLOR,
          'line-width': 1.5,
          'line-opacity': 0.5,
        },
      });
    }
    return () => {
      try {
        if (map.getLayer('radius-border')) map.removeLayer('radius-border');
        if (map.getLayer('radius-fill')) map.removeLayer('radius-fill');
        if (map.getSource(RADIUS_SOURCE_ID)) map.removeSource(RADIUS_SOURCE_ID);
      } catch {
        // la carte a déjà été détruite, rien à nettoyer
      }
    };
  }, [isLoaded, map]);

  // Mettre à jour les données et le style de la zone quand les paramètres changent
  useEffect(() => {
    if (!isLoaded || !map) return;
    const source = map.getSource(RADIUS_SOURCE_ID) as GeoJSONSource;
    if (!source) return;

    if (map.getLayer('radius-border')) {
      map.setPaintProperty(
        'radius-border',
        'line-dasharray',
        distanceMode === 'crow-fly' ? [3, 3] : null,
      );
    }

    if (!referenceLocation || searchRadius === 0) {
      source.setData({ type: 'FeatureCollection', features: [] });
    } else if (distanceMode === 'road') {
      if (isodistanceGeometry) {
        source.setData({ type: 'Feature', geometry: isodistanceGeometry, properties: {} });
      } else {
        source.setData({ type: 'FeatureCollection', features: [] });
      }
    } else {
      source.setData(createCircleGeoJSON(referenceLocation, searchRadius));
    }
  }, [isLoaded, map, referenceLocation, searchRadius, distanceMode, isodistanceGeometry]);

  return null;
}

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
    bestPriceStationIds,
    bestDistanceStationIds,
    bestRealCostStationIds,
    searchRadius,
    fitToListSignal,
  } = useAppStore();

  const distanceMode = useAppStore((s) => s.distanceMode)
  const isodistanceGeometry = useAppStore((s) => s.isodistanceGeometry)
  useIsodistance()

  const route = useRouteGeometry()

  const filteredStations = useFilteredStations();
  const allFilteredStats = useFilteredStats();
  const filteredStats = allFilteredStats[selectedFuel] ?? null;
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

  // Adapter le zoom quand l'isodistance routière arrive
  useEffect(() => {
    if (!mapRef.current || !isodistanceGeometry || distanceMode !== 'road') return;

    const coords: [number, number][] = [];
    if (isodistanceGeometry.type === 'Polygon') {
      coords.push(...(isodistanceGeometry.coordinates[0] as [number, number][]));
    } else if (isodistanceGeometry.type === 'MultiPolygon') {
      for (const polygon of isodistanceGeometry.coordinates) {
        coords.push(...(polygon[0] as [number, number][]));
      }
    }
    if (coords.length === 0) return;

    const lons = coords.map(([lon]) => lon);
    const lats = coords.map(([, lat]) => lat);
    mapRef.current.fitBounds(
      [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
      { padding: 60, duration: 800 },
    );
  }, [isodistanceGeometry, distanceMode]);

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

  // Affiner le zoom quand la vraie géométrie de la route routière arrive
  useEffect(() => {
    if (!route?.isRoad || route.coordinates.length < 2 || !mapRef.current) return
    const lons = route.coordinates.map(([lon]) => lon)
    const lats = route.coordinates.map(([, lat]) => lat)
    mapRef.current.fitBounds(
      [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
      { padding: 80, duration: 400, maxZoom: 16 },
    )
  }, [route])

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
        if (referenceLocation) {
          const [originLon, originLat] = referenceLocation;
          mapRef.current?.fitBounds(
            [
              [Math.min(originLon, flyToStation.lon), Math.min(originLat, flyToStation.lat)],
              [Math.max(originLon, flyToStation.lon), Math.max(originLat, flyToStation.lat)],
            ],
            { padding: 80, duration: 800, maxZoom: 16 },
          );
        } else {
          mapRef.current?.flyTo({
            center: [flyToStation.lon, flyToStation.lat],
            zoom: 15,
            speed: 1.2,
            curve: 1.42,
            essential: true,
          });
        }
        setFlyToStation(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [flyToStation, setFlyToStation, referenceLocation]);

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
          updatedAt: price.updated_at ?? null,
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
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
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

        {/* Zone de rayon — isodistance routière ou cercle à vol d'oiseau */}
        <RadiusZone
          referenceLocation={referenceLocation}
          searchRadius={searchRadius}
          distanceMode={distanceMode}
        />

        {/* Route vers la station sélectionnée */}
        <StationRoute route={route} />

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
                const station = stations.find(
                  (s) => s.id === cluster.properties.stationId,
                );
                if (station) {
                  setSelectedStation(station);
                  if (referenceLocation && mapRef.current) {
                    const [originLon, originLat] = referenceLocation;
                    mapRef.current.fitBounds(
                      [
                        [Math.min(originLon, station.lon), Math.min(originLat, station.lat)],
                        [Math.max(originLon, station.lon), Math.max(originLat, station.lat)],
                      ],
                      { padding: 80, duration: 800, maxZoom: 16 },
                    );
                  } else {
                    setViewport((prev) => ({
                      ...prev,
                      center: [station.lon, station.lat],
                      zoom: 15,
                      duration: 800,
                    }));
                  }
                }
              }}
            >
              <PriceMarker
                price={cluster.properties.price}
                fuelType={cluster.properties.fuelType}
                isSelected={cluster.properties.isSelected}
                isBestPrice={bestPriceStationIds.includes(cluster.properties.stationId)}
                isBestDistance={bestDistanceStationIds.includes(cluster.properties.stationId)}
                isBestRealCost={bestRealCostStationIds.includes(cluster.properties.stationId)}
                filteredStats={filteredStats}
                updatedAt={cluster.properties.updatedAt}
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
