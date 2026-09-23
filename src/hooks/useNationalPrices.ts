"use client";

import { HF_LATEST_BASE_URL } from "@/lib/constants";
import {
  computeNationalPrices,
  type NationalMetadata,
  type NationalPrices,
} from "@/lib/nationalPrices";
import { useEffect, useState } from "react";

// Une seule requête par chargement de page, partagée entre les layouts desktop/mobile.
// L'ETL republie toutes les 2h : pas de rafraîchissement en cours de session.
let request: Promise<NationalPrices | null> | null = null;

const fetchNationalPrices = () => {
  request ??= fetch(`${HF_LATEST_BASE_URL}/metadata.json`)
    .then((res) => (res.ok ? (res.json() as Promise<NationalMetadata>) : null))
    .then((meta) => (meta ? computeNationalPrices(meta) : null))
    .catch(() => {
      request = null; // permet une nouvelle tentative au prochain montage
      return null;
    });
  return request;
};

export function useNationalPrices(): NationalPrices | null {
  const [data, setData] = useState<NationalPrices | null>(null);

  useEffect(() => {
    let isMounted = true;
    void fetchNationalPrices().then((d) => {
      if (isMounted) setData(d);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return data && data.prices.length > 0 ? data : null;
}
