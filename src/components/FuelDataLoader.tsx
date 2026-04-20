"use client";

import { getDepartmentsInRadius } from "@/lib/departments";
import { mapRawDataToStation, RawStationData } from "@/lib/mappers";
import { HF_LATEST_BASE_URL } from "@/lib/constants";
import {
  getDeptCacheEntry,
  getDeptLocalFileName,
  getRollingDeptCacheEntry,
  isCacheValid,
  isRollingCacheValid,
  registerCachedDeptInDuckDB,
} from "@/lib/deptCache";
import { Station, useAppStore } from "@/store/useAppStore";
import { useDeptCache } from "@/hooks/useDeptCache";
import { useEffect, useMemo, useRef, useState } from "react";
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
    setNationalFranceAreaKm2,
    searchLocation,
    searchRadius,
    userLocation,
    setLoadedDepts,
  } = useAppStore();
  const { cacheInBackground, cacheRollingInBackground } = useDeptCache();
  // Refs stables pour éviter que les useCallback dans le dep array
  // ne déclenchent un cleanup prématuré et bloquent isLoading=true indéfiniment
  const cacheInBackgroundRef = useRef(cacheInBackground);
  const cacheRollingInBackgroundRef = useRef(cacheRollingInBackground);
  useEffect(() => {
    cacheInBackgroundRef.current = cacheInBackground;
    cacheRollingInBackgroundRef.current = cacheRollingInBackground;
  });
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
        const BASE = HF_LATEST_BASE_URL;

        // Métadonnées globales France (total stations + last_updated)
        fetch(`${BASE}/metadata.json`)
          .then((res) => res.json())
          .then((meta) => {
            if (isMounted && typeof meta.total_stations === "number")
              setNationalStationsCount(meta.total_stations);
            if (isMounted && typeof meta.france_area_km2 === "number")
              setNationalFranceAreaKm2(meta.france_area_km2);
            if (isMounted && meta.last_updated)
              setLastUpdate(meta.last_updated);
          })
          .catch(() => {});

        // Charger tous les départements en parallèle (cache IndexedDB ou HuggingFace)
        let cacheHits = 0;
        const results = await Promise.allSettled(
          departmentsToLoad.map(async (dept) => {
            const entry = await getDeptCacheEntry(dept);

            if (entry && isCacheValid(entry)) {
              // Cache valide (< 2h) : aucun appel réseau
              cacheHits++;
              try {
                await registerCachedDeptInDuckDB(db, dept, entry.buffer);
                const conn = await db.connect();
                try {
                  const res = await conn.query(
                    `SELECT * FROM read_parquet('${getDeptLocalFileName(dept)}')`,
                  );
                  return res
                    .toArray()
                    .map((r) => r.toJSON()) as unknown as RawStationData[];
                } finally {
                  await conn.close();
                }
              } catch {
                // Cache corrompu → fallback HuggingFace
                cacheHits--;
              }
            }

            // Pas de cache valide → comportement actuel (HuggingFace)
            const conn = await db.connect();
            try {
              const url = `${BASE}/code_departement=${dept}/data_0.parquet`;
              const res = await conn.query(
                `SELECT * FROM read_parquet('${url}')`,
              );
              return res
                .toArray()
                .map((r) => r.toJSON()) as unknown as RawStationData[];
            } finally {
              await conn.close();
            }
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
          const fromCache = cacheHits === departmentsToLoad.length;
          const label = fromCache ? "cache local" : selectedDepartment;
          toast.success(
            departmentsToLoad.length > 1
              ? `${stations.length} stations chargées (${fromCache ? "cache local" : `${departmentsToLoad.length} depts`})`
              : `${stations.length} stations chargées (${label})`,
          );

          // Informer le store des depts actuellement chargés (pour l'UI Réglages)
          setLoadedDepts(departmentsToLoad);

          // Cacher en arrière-plan tous les depts sans cache valide
          for (const dept of departmentsToLoad) {
            const entry = await getDeptCacheEntry(dept);
            if (!entry || !isCacheValid(entry)) {
              // Latest expiré → cacheInBackground gère latest + rolling en parallèle
              void cacheInBackgroundRef.current(dept);
            } else {
              // Latest encore valide → vérifier rolling indépendamment
              // (couvre les utilisateurs existants et les premiers démarrages post-déploiement)
              const rollingEntry = await getRollingDeptCacheEntry(dept);
              if (!rollingEntry || !isRollingCacheValid(rollingEntry)) {
                void cacheRollingInBackgroundRef.current(dept);
              }
            }
          }

          // setLoadedDeptsKey EN DERNIER : son changement déclenche le cleanup
          // du useEffect (isMounted=false). S'il était appelé avant les await
          // ci-dessus, le finally ne pouvait plus appeler setIsLoading(false).
          setLoadedDeptsKey(deptKey);
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
    setNationalStationsCount,
    setNationalFranceAreaKm2,
    setLoadedDepts,
  ]);

  if (dbError) {
    return null; // Or show a global error banner
  }

  return null; // This component doesn't render anything visible
};
