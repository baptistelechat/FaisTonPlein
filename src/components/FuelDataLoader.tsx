"use client";

import { mapRawDataToStation, RawStationData } from "@/lib/mappers";
import { useAppStore } from "@/store/useAppStore";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDuckDB } from "./DuckDBProvider";

export const FuelDataLoader = () => {
  const { db, isLoading: isDbLoading, error: dbError } = useDuckDB();
  const {
    setStations,
    setIsLoading,
    selectedDepartment,
    setLastUpdate,
    searchLocation,
  } = useAppStore();
  const [dataLoaded, setDataLoaded] = useState(false);
  const [currentDepartment, setCurrentDepartment] = useState<string | null>(
    null,
  );
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

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      // If data is already loaded for this department, ensure loading is false and exit
      if (dataLoaded && currentDepartment === selectedDepartment) {
        setIsLoading(false);
        return;
      }

      if (!db) return;

      setIsLoading(true);
      try {
        const conn = await db.connect();

        // URL for DEPARTEMENT
        const baseUrl = `https://huggingface.co/datasets/baptistelechat/fais-ton-plein_dataset/resolve/main/data/latest/code_departement=${selectedDepartment}`;
        const parquetUrl = `${baseUrl}/data_0.parquet`;
        const metadataUrl = `${baseUrl}/metadata.json`;

        // Try loading metadata first (non-blocking for parquet load but useful for UI)
        try {
          fetch(metadataUrl)
            .then((res) => res.json())
            .then((meta) => {
              if (isMounted && meta.last_updated) {
                setLastUpdate(meta.last_updated);
              }
            })
            .catch((err) => console.warn("Failed to load metadata", err));
        } catch (e) {
          console.warn("Metadata fetch error", e);
        }

        // Load Parquet file
        await conn.query(`
          CREATE OR REPLACE TABLE fuel_prices AS 
          SELECT * FROM read_parquet('${parquetUrl}');
        `);

        // Query all stations
        const res = await conn.query("SELECT * FROM fuel_prices");
        const rawStations = res
          .toArray()
          .map((r) => r.toJSON()) as unknown as RawStationData[];

        // Map to application format
        const stations = rawStations.map(mapRawDataToStation);

        if (isMounted) {
          console.log(`Loaded ${stations.length} stations from DuckDB`);
          setStations(stations);
          setDataLoaded(true);
          setCurrentDepartment(selectedDepartment);
          toast.success(
            `${stations.length} stations chargées (${selectedDepartment})`,
          );
        }

        await conn.close();
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load fuel data:", err);
          toast.error(
            `Erreur lors du chargement des données carburant (${selectedDepartment})`,
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (locationAvailable === null && !searchLocation) return;

    // Ensure we have a selected department before attempting to load data
    // This prevents 404 errors when the location is found but the department hasn't been reverse-geocoded yet
    if (!isDbLoading && !dbError && canLoadData && selectedDepartment) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [
    db,
    isDbLoading,
    dbError,
    dataLoaded,
    setStations,
    setIsLoading,
    selectedDepartment,
    currentDepartment,
    setLastUpdate,
    locationAvailable,
    searchLocation,
    canLoadData,
  ]);

  if (dbError) {
    return null; // Or show a global error banner
  }

  return null; // This component doesn't render anything visible
};
