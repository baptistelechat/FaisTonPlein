"use client";

import * as duckdb from "@duckdb/duckdb-wasm";
import React, { createContext, useContext, useEffect, useState } from "react";

interface DuckDBContextType {
  db: duckdb.AsyncDuckDB | null;
  isLoading: boolean;
  error: Error | null;
}

const DuckDBContext = createContext<DuckDBContextType>({
  db: null,
  isLoading: true,
  error: null,
});

export const useDuckDB = () => useContext(DuckDBContext);

export const DuckDBProvider = ({ children }: { children: React.ReactNode }) => {
  const [db, setDb] = useState<duckdb.AsyncDuckDB | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Track initialization status to prevent double init in React Strict Mode
  const isInitializing = React.useRef(false);

  useEffect(() => {
    // Check if we are in the browser
    if (typeof window === "undefined") return;

    // Prevent double initialization
    if (db || isInitializing.current) return;

    let isMounted = true;
    let newDb: duckdb.AsyncDuckDB | null = null;

    const initDuckDB = async () => {
      isInitializing.current = true;
      try {
        const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
          mvp: {
            mainModule: "/duckdb/duckdb-mvp.wasm",
            mainWorker: "/duckdb/duckdb-browser-mvp.worker.js",
          },
          eh: {
            mainModule: "/duckdb/duckdb-eh.wasm",
            mainWorker: "/duckdb/duckdb-browser-eh.worker.js",
          },
        };

        // Select bundle based on browser support
        const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);

        const worker = new Worker(bundle.mainWorker!);
        const logger = new duckdb.ConsoleLogger();
        newDb = new duckdb.AsyncDuckDB(logger, worker);
        await newDb.instantiate(bundle.mainModule, bundle.pthreadWorker);

        if (isMounted) {
          setDb(newDb);
          setIsLoading(false);
        } else {
          await newDb.terminate();
        }
      } catch (err) {
        console.error("Failed to initialize DuckDB", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
          setIsLoading(false);
        }
      } finally {
        isInitializing.current = false;
      }
    };

    initDuckDB();

    return () => {
      isMounted = false;
      // In strict mode, this cleanup might run while the init is still pending.
      // We handle this with isMounted check.
      // If we already have a connection, we should probably close it,
      // but reusing the instance is better in dev.
      // For now, let's just close if it was set.
      const cleanup = async () => {
        if (newDb) {
          await newDb.terminate();
        }
      };
      void cleanup();
      // We don't await here because it's a sync cleanup function, but we can fire and forget or track it.
      // Ideally we should persist the instance in a ref or global to avoid double init in strict mode.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DuckDBContext.Provider value={{ db, isLoading, error }}>
      {children}
    </DuckDBContext.Provider>
  );
};
