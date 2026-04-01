"use client";

import { MapMarker, useMap } from "@/components/ui/map";
import type { RouteGeometry } from "@/hooks/useRouteGeometry";
import { formatDuration } from "@/lib/utils";
import type { GeoJSONSource } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

const ROUTE_SOURCE_ID = "station-route-source";
const ROUTE_ROAD_LAYER = "station-route-road";
const ROUTE_CROW_LAYER = "station-route-crow";
const ROUTE_COLOR = "#4f46e5";
const ROAD_ANIMATION_MS = 800;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function getRouteMidpoint(coords: [number, number][]): [number, number] | null {
  if (coords.length === 0) return null;
  return coords[Math.floor(coords.length / 2)];
}

function RouteLayer({ route }: { route: RouteGeometry | null }) {
  const { map, isLoaded } = useMap();
  const animFrameRef = useRef<number | null>(null);
  const animStartRef = useRef<number | null>(null);

  // Create source and layers once
  useEffect(() => {
    if (!isLoaded || !map) return;

    map.addSource(ROUTE_SOURCE_ID, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
      },
    });
    map.addLayer({
      id: ROUTE_ROAD_LAYER,
      type: "line",
      source: ROUTE_SOURCE_ID,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": ROUTE_COLOR, "line-width": 4, "line-opacity": 0 },
    });
    map.addLayer({
      id: ROUTE_CROW_LAYER,
      type: "line",
      source: ROUTE_SOURCE_ID,
      layout: { "line-join": "round", "line-cap": "butt" },
      paint: {
        "line-color": ROUTE_COLOR,
        "line-width": 2,
        "line-opacity": 0,
        "line-dasharray": [6, 4],
      },
    });

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      try {
        if (map.getLayer(ROUTE_ROAD_LAYER)) map.removeLayer(ROUTE_ROAD_LAYER);
        if (map.getLayer(ROUTE_CROW_LAYER)) map.removeLayer(ROUTE_CROW_LAYER);
        if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);
      } catch {
        /* map already destroyed */
      }
    };
  }, [isLoaded, map]);

  // Update and animate whenever the route changes
  useEffect(() => {
    if (!isLoaded || !map) return;

    const source = map.getSource(ROUTE_SOURCE_ID) as GeoJSONSource;
    if (!source) return;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    animStartRef.current = null;

    if (!route) {
      source.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
      });
      if (map.getLayer(ROUTE_ROAD_LAYER))
        map.setPaintProperty(ROUTE_ROAD_LAYER, "line-opacity", 0);
      if (map.getLayer(ROUTE_CROW_LAYER))
        map.setPaintProperty(ROUTE_CROW_LAYER, "line-opacity", 0);
      return;
    }

    if (!route.isRoad) {
      // Crow-fly: set data instantly, fade in
      source.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: route.coordinates },
      });
      if (map.getLayer(ROUTE_ROAD_LAYER))
        map.setPaintProperty(ROUTE_ROAD_LAYER, "line-opacity", 0);

      const fadeIn = (timestamp: number) => {
        if (animStartRef.current === null) animStartRef.current = timestamp;
        const progress = Math.min((timestamp - animStartRef.current) / 300, 1);
        if (map.getLayer(ROUTE_CROW_LAYER)) {
          map.setPaintProperty(
            ROUTE_CROW_LAYER,
            "line-opacity",
            easeOutCubic(progress) * 0.65,
          );
        }
        if (progress < 1) animFrameRef.current = requestAnimationFrame(fadeIn);
      };
      if (map.getLayer(ROUTE_CROW_LAYER))
        map.setPaintProperty(ROUTE_CROW_LAYER, "line-opacity", 0);
      animFrameRef.current = requestAnimationFrame(fadeIn);
      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    }

    // Road route: draw progressively from start to end
    if (map.getLayer(ROUTE_CROW_LAYER))
      map.setPaintProperty(ROUTE_CROW_LAYER, "line-opacity", 0);
    const allCoords = route.coordinates;

    const animate = (timestamp: number) => {
      if (animStartRef.current === null) animStartRef.current = timestamp;
      const progress = Math.min(
        (timestamp - animStartRef.current) / ROAD_ANIMATION_MS,
        1,
      );
      const eased = easeOutCubic(progress);

      const numPoints = Math.max(2, Math.round(allCoords.length * eased));
      source.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: allCoords.slice(0, numPoints),
        },
      });
      if (map.getLayer(ROUTE_ROAD_LAYER)) {
        map.setPaintProperty(
          ROUTE_ROAD_LAYER,
          "line-opacity",
          Math.min(eased * 1.5, 0.85),
        );
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isLoaded, map, route]);

  return null;
}

export function StationRoute({ route }: { route: RouteGeometry | null }) {
  const [showRoadBadge, setShowRoadBadge] = useState(false);

  useEffect(() => {
    if (!route?.isRoad || route.durationSeconds === null) {
      return;
    }
    const timer = setTimeout(() => setShowRoadBadge(true), ROAD_ANIMATION_MS);
    return () => {
      clearTimeout(timer);
      setShowRoadBadge(false);
    };
  }, [route]);

  const roadMidpoint =
    showRoadBadge && route?.isRoad && route.durationSeconds !== null
      ? getRouteMidpoint(route.coordinates)
      : null;

  const crowMidpoint: [number, number] | null =
    route !== null &&
    !route.isRoad &&
    route.distanceKm !== null &&
    route.coordinates.length >= 2
      ? [
          (route.coordinates[0][0] + route.coordinates[1][0]) / 2,
          (route.coordinates[0][1] + route.coordinates[1][1]) / 2,
        ]
      : null;

  return (
    <>
      <RouteLayer route={route} />
      {roadMidpoint && route?.durationSeconds !== null && (
        <MapMarker longitude={roadMidpoint[0]} latitude={roadMidpoint[1]}>
          <div className="pointer-events-none rounded-full bg-indigo-600/90 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-white shadow-lg backdrop-blur-sm">
            ~{formatDuration(route!.durationSeconds!)}
          </div>
        </MapMarker>
      )}
      {crowMidpoint && route !== null && route.distanceKm !== null && (
        <MapMarker longitude={crowMidpoint[0]} latitude={crowMidpoint[1]}>
          <div className="pointer-events-none rounded-full bg-indigo-600/90 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-white shadow-lg backdrop-blur-sm">
            ~{route.distanceKm.toFixed(1)} km
          </div>
        </MapMarker>
      )}
    </>
  );
}
