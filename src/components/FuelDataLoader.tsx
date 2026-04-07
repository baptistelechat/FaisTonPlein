"use client";

import { getDepartmentsInRadius } from "@/lib/departments";
import { mapRawDataToStation, RawStationData } from "@/lib/mappers";
import { Station, useAppStore } from "@/store/useAppStore";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDuckDB } from "./DuckDBProvider";

export const FuelDataLoader = () => {
  const { db, error: dbError } = useDuckDB();
  const {
    setStations,
    setIsLoading,
    selectedDepartment,
    setLastUpdate,
    setNationalStationsCount,
    searchLocation,
    searchRadius,
    userLocation,
  } = useAppStore();
  const [loadedDeptsKey, setLoadedDeptsKey] = useState("");
  const [locationAvailable, setLocationAvailable] = useState<boolean | null>(
    null,
  );

  const canLoadData = locationAvailable === true || searchLocation;

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setLocationAvailable(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => setLocationAvailable(true),
      () => setLocationAvailable(false),
    );
  }, []);

  useEffect(() => {
    if (locationAvailable === false && !searchLocation) {
      toast.info(
        "La localisation est nécessaire pour charger des stations au démarrage. Recherche manuelle conseillée.",
      );
    }
  }, [locationAvailable, searchLocation]);

  const referenceLocation = searchLocation || userLocation;

  const departmentsToLoad = useMemo<string[]>(() => {
    if (!selectedDepartment) return [];

    if (!referenceLocation || searchRadius === 0) {
      return [selectedDepartment];
    }

    const fromRadius = getDepartmentsInRadius(referenceLocation, searchRadius);
    // Toujours inclure le département principal, dédupliquer, trier
    const all = new Set([selectedDepartment, ...fromRadius]);
    return Array.from(all).sort();
  }, [selectedDepartment, referenceLocation, searchRadius]);

  const deptKey = departmentsToLoad.join(",");

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!db || !deptKey || deptKey === loadedDeptsKey) return;
      if (locationAvailable === null && !searchLocation) return;
      if (!canLoadData) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const BASE =
          "https://huggingface.co/datasets/baptistelechat/fais-ton-plein_dataset/resolve/main/data/latest";

        // Métadonnées globales France (total stations)
        fetch(`${BASE}/metadata.json`)
          .then((res) => res.json())
          .then((meta) => {
            if (isMounted && typeof meta.total_stations === 'number')
              setNationalStationsCount(meta.total_stations);
          })
          .catch(() => {});

        // Charger tous les départements en parallèle
        const results = await Promise.allSettled(
          departmentsToLoad.map(async (dept) => {
            const conn = await db.connect();
            const url = `${BASE}/code_departement=${dept}/data_0.parquet`;
            // Charger aussi les métadonnées du département principal
            if (dept === selectedDepartment) {
              fetch(`${BASE}/code_departement=${dept}/metadata.json`)
                .then((res) => res.json())
                .then((meta) => {
                  if (isMounted && meta.last_updated)
                    setLastUpdate(meta.last_updated);
                })
                .catch(() => {});
            }
            const res = await conn.query(
              `SELECT * FROM read_parquet('${url}')`,
            );
            await conn.close();
            return res
              .toArray()
              .map((r) => r.toJSON()) as unknown as RawStationData[];
          }),
        );

        // Fusionner tous les résultats, dédupliquer par id
        const stationMap = new Map<string, Station>();
        for (const result of results) {
          if (result.status === "fulfilled") {
            for (const raw of result.value) {
              const station = mapRawDataToStation(raw);
              stationMap.set(station.id, station);
            }
          }
        }

        if (isMounted) {
          const stations = Array.from(stationMap.values());
          setStations(stations);
          setLoadedDeptsKey(deptKey);
          toast.success(
            departmentsToLoad.length > 1
              ? `${stations.length} stations chargées (${departmentsToLoad.length} depts)`
              : `${stations.length} stations chargées (${selectedDepartment})`,
          );
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load fuel data:", err);
          toast.error(`Erreur lors du chargement des données carburant`);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [
    db,
    deptKey,
    loadedDeptsKey,
    canLoadData,
    locationAvailable,
    searchLocation,
    selectedDepartment,
    setIsLoading,
    setLastUpdate,
    setStations,
    departmentsToLoad,
  ]);

  if (dbError) {
    return null; // Or show a global error banner
  }

  return null; // This component doesn't render anything visible
};
