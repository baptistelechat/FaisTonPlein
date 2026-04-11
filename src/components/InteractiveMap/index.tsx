"use client";

import {
  Map,
  MapControls,
  MapMarker,
  type MapViewport,
} from "@/components/ui/map";
import { useFilteredStations } from "@/hooks/useFilteredStations";
import { useIsodistance } from "@/hooks/useIsodistance";
import { useRouteGeometry } from "@/hooks/useRouteGeometry";
import { useRuptureStations } from "@/hooks/useRuptureStations";
import { reverseGeocode } from "@/lib/api-adresse";
import { useAppStore } from "@/store/useAppStore";
import { Loader2 } from "lucide-react";
import type { Map as MapLibreMap } from "maplibre-gl";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import useSupercluster from "use-supercluster";
import { PulseMarker } from "./components/PulseMarker";
import { StationRoute } from "../StationRoute";
import { RadiusZone } from "./components/RadiusZone";
import { StationClustersLayer } from "./components/StationClustersLayer";

const DEFAULT_CENTER: [number, number] = [2.3522, 48.8566]; // Paris [lon, lat]
const DEFAULT_ZOOM = 13;
const MAP_HEADER_HEIGHT = 100;
const MAP_DRAWER_CLEARANCE = 16;

export default function InteractiveMap({
  children,
  mobileDrawerSnap,
}: {
  children?: ReactNode;
  mobileDrawerSnap?: number | string | null;
}) {
  const {
    isLoading,
    selectedFuel,
    selectedStation,
    userLocation,
    setUserLocation,
    flyToStation,
    setFlyToStation,
    flyToLocation,
    setFlyToLocation,
    searchLocation,
    setSelectedDepartment,
    setSearchLocation,
    searchRadius,
    fitToListSignal,
  } = useAppStore();

  const distanceMode = useAppStore((s) => s.distanceMode);
  const showRoute = useAppStore((s) => s.showRoute);
  const showRuptureStations = useAppStore((s) => s.showRuptureStations);
  useIsodistance();

  const route = useRouteGeometry();

  const getMapPadding = useCallback(
    (base: number) => {
      const drawerPx =
        typeof mobileDrawerSnap === "number" && typeof window !== "undefined"
          ? Math.round(window.innerHeight * mobileDrawerSnap) +
            MAP_DRAWER_CLEARANCE
          : base;
      return {
        top: base + MAP_HEADER_HEIGHT,
        right: base,
        bottom: drawerPx,
        left: base,
      };
    },
    [mobileDrawerSnap],
  );

  const filteredStations = useFilteredStations();
  const ruptureStations = useRuptureStations();
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

  const referenceLocation = searchLocation || userLocation;
  const searchRadiusRef = useRef(searchRadius);
  const referenceLocationRef = useRef(referenceLocation);
  useEffect(() => {
    searchRadiusRef.current = searchRadius;
    referenceLocationRef.current = referenceLocation;
  }, [searchRadius, referenceLocation]);

  const isodistanceGeometry = useAppStore((s) => s.isodistanceGeometry);

  useEffect(() => {
    if (!mapRef.current || !isodistanceGeometry || distanceMode !== "road")
      return;
    const coords: [number, number][] = [];
    if (isodistanceGeometry.type === "Polygon") {
      coords.push(
        ...(isodistanceGeometry.coordinates[0] as [number, number][]),
      );
    } else if (isodistanceGeometry.type === "MultiPolygon") {
      for (const polygon of isodistanceGeometry.coordinates) {
        coords.push(...(polygon[0] as [number, number][]));
      }
    }
    if (coords.length === 0) return;
    const lons = coords.map(([lon]) => lon);
    const lats = coords.map(([, lat]) => lat);
    mapRef.current.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding: getMapPadding(60), duration: 800 },
    );
  }, [isodistanceGeometry, distanceMode, getMapPadding]);

  useEffect(() => {
    if (searchRadius === 0 || referenceLocation === null || !mapRef.current)
      return;
    const [lon, lat] = referenceLocation;
    const latRad = (lat * Math.PI) / 180;
    const latOffset = searchRadius / 111.32;
    const lonOffset = searchRadius / (111.32 * Math.cos(latRad));
    mapRef.current.fitBounds(
      [
        [lon - lonOffset, lat - latOffset],
        [lon + lonOffset, lat + latOffset],
      ],
      { padding: getMapPadding(60), duration: 800 },
    );
  }, [searchRadius, referenceLocation, getMapPadding]);

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
        { padding: getMapPadding(60), duration: 800 },
      );
    }
  }, [fitToListSignal, getMapPadding]);

  useEffect(() => {
    if (
      !showRoute ||
      !route?.isRoad ||
      route.coordinates.length < 2 ||
      !mapRef.current
    )
      return;
    const lons = route.coordinates.map(([lon]) => lon);
    const lats = route.coordinates.map(([, lat]) => lat);
    mapRef.current.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding: getMapPadding(80), duration: 400, maxZoom: 16 },
    );
  }, [route, showRoute, getMapPadding]);

  useEffect(() => {
    if (!flyToLocation || !mapRef.current) return;
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
        { padding: getMapPadding(60), duration: 800 },
      );
    } else {
      mapRef.current.flyTo({ center: [lon, lat], zoom: 13, duration: 2000 });
    }
    setFlyToLocation(null);
  }, [flyToLocation, setFlyToLocation, searchRadius, getMapPadding]);

  useEffect(() => {
    if (!flyToStation || !mapRef.current) return;
    const timer = setTimeout(() => {
      if (!showRoute) {
        mapRef.current?.flyTo({
          center: [flyToStation.lon, flyToStation.lat],
          zoom: 15,
          speed: 1.2,
          curve: 1.42,
          essential: true,
        });
      } else if (referenceLocation) {
        const [originLon, originLat] = referenceLocation;
        mapRef.current?.fitBounds(
          [
            [
              Math.min(originLon, flyToStation.lon),
              Math.min(originLat, flyToStation.lat),
            ],
            [
              Math.max(originLon, flyToStation.lon),
              Math.max(originLat, flyToStation.lat),
            ],
          ],
          { padding: getMapPadding(80), duration: 800, maxZoom: 16 },
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
  }, [
    flyToStation,
    setFlyToStation,
    referenceLocation,
    showRoute,
    getMapPadding,
  ]);

  const points = [
    ...filteredStations
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
            isRupture: false,
          },
          geometry: { type: "Point", coordinates: [station.lon, station.lat] },
        };
      })
      .filter((p) => p !== null),
    ...(showRuptureStations ? ruptureStations : []).map((station) => ({
      type: "Feature",
      properties: {
        cluster: false,
        stationId: station.id,
        price: null as number | null,
        fuelType: selectedFuel,
        isSelected: selectedStation?.id === station.id,
        updatedAt: null,
        isRupture: true,
      },
      geometry: { type: "Point", coordinates: [station.lon, station.lat] },
    })),
  ];

  const { clusters, supercluster } = useSupercluster({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    points: points as any[],
    bounds: bounds ?? undefined,
    zoom: viewport.zoom || DEFAULT_ZOOM,
    options: { radius: 75, maxZoom: 15 },
  });

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
        )
          return prev;
        return { ...prev, ...newViewport };
      });
    },
    [],
  );

  const handleGeolocation = useCallback(
    async (coords: { latitude: number; longitude: number }) => {
      const { latitude, longitude } = coords;
      setUserLocation([longitude, latitude]);
      if (useAppStore.getState().searchLocation) return;
      setSearchLocation(null);
      setViewport((prev) => ({
        ...prev,
        center: [longitude, latitude],
        zoom: 14,
      }));
      toast.success("Position trouvée !", { id: "geo-success" });
      try {
        const result = await reverseGeocode(longitude, latitude);
        if (result?.properties?.context) {
          const deptCode = result.properties.context.split(",")[0].trim();
          setSelectedDepartment(deptCode);
          toast.success(`Département détecté : ${deptCode}`, {
            id: "geo-dept",
          });
        }
      } catch (error) {
        console.error("Failed to detect department", error);
        useAppStore.getState().setIsApiAdresseUnavailable(true);
      }
    },
    [setUserLocation, setSearchLocation, setSelectedDepartment],
  );

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
            useAppStore.getState().setSearchLocation(null);
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

        <RadiusZone
          referenceLocation={referenceLocation}
          searchRadius={searchRadius}
          distanceMode={distanceMode}
        />

        <StationRoute route={showRoute ? route : null} />

        {userLocation && !searchLocation && (
          <MapMarker longitude={userLocation[0]} latitude={userLocation[1]}>
            <PulseMarker
              color="bg-primary"
              pingColor="bg-primary/50"
              tooltip="Vous êtes ici"
            />
          </MapMarker>
        )}

        <StationClustersLayer
          clusters={clusters}
          supercluster={supercluster}
          viewport={viewport}
          setViewport={setViewport}
          mapRef={mapRef}
          getMapPadding={getMapPadding}
          referenceLocation={referenceLocation}
        />

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
