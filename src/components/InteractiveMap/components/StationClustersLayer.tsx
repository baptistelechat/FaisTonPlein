"use client";

import { PriceMarker } from "./PriceMarker";
import { RuptureMarker } from "./RuptureMarker";
import { MapMarker } from "@/components/ui/map";
import type { MapViewport } from "@/components/ui/map";
import { useFilteredStats } from "@/hooks/useFilteredStats";
import { useAppStore } from "@/store/useAppStore";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { Dispatch, RefObject, SetStateAction } from "react";

interface StationClustersLayerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clusters: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supercluster: any;
  viewport: Partial<MapViewport>;
  setViewport: Dispatch<SetStateAction<Partial<MapViewport>>>;
  mapRef: RefObject<MapLibreMap | null>;
  getMapPadding: (base: number) => {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  referenceLocation: [number, number] | null;
}

export function StationClustersLayer({
  clusters,
  supercluster,
  viewport,
  setViewport,
  mapRef,
  getMapPadding,
  referenceLocation,
}: StationClustersLayerProps) {
  const {
    stations,
    setSelectedStation,
    showRoute,
    bestPriceStationIds,
    bestDistanceStationIds,
    bestRealCostStationIds,
    selectedFuel,
  } = useAppStore();
  const allFilteredStats = useFilteredStats();
  const filteredStats = allFilteredStats[selectedFuel] ?? null;

  return (
    <>
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
                  supercluster?.getClusterExpansionZoom(cluster.id as number) ||
                    0,
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

        const onClickStation = (e: MouseEvent) => {
          e.stopPropagation();
          const station = stations.find(
            (s) => s.id === cluster.properties.stationId,
          );
          if (!station) return;
          setSelectedStation(station);
          if (!showRoute || cluster.properties.isRupture) {
            setViewport((prev) => ({
              ...prev,
              center: [station.lon, station.lat],
              zoom: 15,
              duration: 800,
            }));
          } else if (referenceLocation && mapRef.current) {
            const [originLon, originLat] = referenceLocation;
            mapRef.current.fitBounds(
              [
                [
                  Math.min(originLon, station.lon),
                  Math.min(originLat, station.lat),
                ],
                [
                  Math.max(originLon, station.lon),
                  Math.max(originLat, station.lat),
                ],
              ],
              { padding: getMapPadding(80), duration: 800, maxZoom: 16 },
            );
          } else {
            setViewport((prev) => ({
              ...prev,
              center: [station.lon, station.lat],
              zoom: 15,
              duration: 800,
            }));
          }
        };

        if (cluster.properties.isRupture) {
          return (
            <MapMarker
              key={`station-${cluster.properties.stationId}`}
              latitude={latitude}
              longitude={longitude}
              onClick={onClickStation}
            >
              <RuptureMarker isSelected={cluster.properties.isSelected} />
            </MapMarker>
          );
        }

        return (
          <MapMarker
            key={`station-${cluster.properties.stationId}`}
            latitude={latitude}
            longitude={longitude}
            onClick={onClickStation}
          >
            <PriceMarker
              price={cluster.properties.price}
              fuelType={cluster.properties.fuelType}
              isSelected={cluster.properties.isSelected}
              isBestPrice={bestPriceStationIds.includes(
                cluster.properties.stationId,
              )}
              isBestDistance={bestDistanceStationIds.includes(
                cluster.properties.stationId,
              )}
              isBestRealCost={bestRealCostStationIds.includes(
                cluster.properties.stationId,
              )}
              filteredStats={filteredStats}
              updatedAt={cluster.properties.updatedAt}
            />
          </MapMarker>
        );
      })}
    </>
  );
}
