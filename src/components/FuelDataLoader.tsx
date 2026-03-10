'use client';

import { useEffect, useState } from 'react';
import { useDuckDB } from './DuckDBProvider';
import { useAppStore } from '@/store/useAppStore';
import { mapRawDataToStation, RawStationData } from '@/lib/mappers';
import { toast } from 'sonner';

const DEPARTEMENT = 85;

export const FuelDataLoader = () => {
  const { db, isLoading: isDbLoading, error: dbError } = useDuckDB();
  const { setStations, setIsLoading } = useAppStore();
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      // If data is already loaded, ensure loading is false and exit
      if (dataLoaded) {
        setIsLoading(false);
        return;
      }
      
      if (!db) return;
      
      setIsLoading(true);
      try {
        const conn = await db.connect();
        
        // URL for DEPARTEMENT (Hardcoded for now as per US-00-02)
        const url = `https://huggingface.co/datasets/baptistelechat/fais-ton-plein_dataset/resolve/main/data/latest/code_departement=${DEPARTEMENT}/data_0.parquet`;
        
        // Load Parquet file
        await conn.query(`
          CREATE OR REPLACE TABLE fuel_prices AS 
          SELECT * FROM read_parquet('${url}');
        `);

        // Query all stations
        const res = await conn.query('SELECT * FROM fuel_prices');
        const rawStations = res.toArray().map((r) => r.toJSON()) as unknown as RawStationData[];
        
        // Map to application format
        const stations = rawStations.map(mapRawDataToStation);
        
        if (isMounted) {
            console.log(`Loaded ${stations.length} stations from DuckDB`);
            setStations(stations);
            setDataLoaded(true);
            toast.success(`${stations.length} stations chargées (${DEPARTEMENT})`);
        }
        
        await conn.close();
      } catch (err) {
        if (isMounted) {
            console.error("Failed to load fuel data:", err);
            toast.error("Erreur lors du chargement des données carburant");
        }
      } finally {
        if (isMounted) {
            setIsLoading(false);
        }
      }
    };

    if (!isDbLoading && !dbError) {
      loadData();
    }

    return () => {
        isMounted = false;
    };
  }, [db, isDbLoading, dbError, dataLoaded, setStations, setIsLoading]);

  if (dbError) {
    return null; // Or show a global error banner
  }

  return null; // This component doesn't render anything visible
};
