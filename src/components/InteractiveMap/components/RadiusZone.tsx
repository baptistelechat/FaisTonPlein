"use client";

import type { GeoJSONSource } from "maplibre-gl";
import { useEffect } from "react";
import { useMap } from "@/components/ui/map";
import { useAppStore } from "@/store/useAppStore";

const RADIUS_SOURCE_ID = "radius-zone";
const RADIUS_PRIMARY_COLOR = "#4f46e5";

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
    geometry: { type: "Polygon", coordinates: [coordinates] },
  };
};

interface RadiusZoneProps {
  referenceLocation: [number, number] | null;
  searchRadius: number;
  distanceMode: "road" | "crow-fly";
}

export function RadiusZone({
  referenceLocation,
  searchRadius,
  distanceMode,
}: RadiusZoneProps) {
  const { map, isLoaded } = useMap();
  const isodistanceGeometry = useAppStore((s) => s.isodistanceGeometry);

  // Créer la source et les layers une seule fois quand la carte est chargée
  useEffect(() => {
    if (!isLoaded || !map) return;
    if (!map.getSource(RADIUS_SOURCE_ID)) {
      map.addSource(RADIUS_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "radius-fill",
        type: "fill",
        source: RADIUS_SOURCE_ID,
        paint: { "fill-color": RADIUS_PRIMARY_COLOR, "fill-opacity": 0.04 },
      });
      map.addLayer({
        id: "radius-border",
        type: "line",
        source: RADIUS_SOURCE_ID,
        paint: {
          "line-color": RADIUS_PRIMARY_COLOR,
          "line-width": 1.5,
          "line-opacity": 0.5,
        },
      });
    }
    return () => {
      try {
        if (map.getLayer("radius-border")) map.removeLayer("radius-border");
        if (map.getLayer("radius-fill")) map.removeLayer("radius-fill");
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

    if (map.getLayer("radius-border")) {
      map.setPaintProperty(
        "radius-border",
        "line-dasharray",
        distanceMode === "crow-fly" ? [3, 3] : null,
      );
    }

    if (!referenceLocation || searchRadius === 0) {
      source.setData({ type: "FeatureCollection", features: [] });
    } else if (distanceMode === "road") {
      if (isodistanceGeometry) {
        source.setData({
          type: "Feature",
          geometry: isodistanceGeometry,
          properties: {},
        });
      } else {
        source.setData({ type: "FeatureCollection", features: [] });
      }
    } else {
      source.setData(createCircleGeoJSON(referenceLocation, searchRadius));
    }
  }, [
    isLoaded,
    map,
    referenceLocation,
    searchRadius,
    distanceMode,
    isodistanceGeometry,
  ]);

  return null;
}
