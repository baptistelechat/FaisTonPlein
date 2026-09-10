import { HEALTH_STALE_THRESHOLD_MS, HF_LATEST_BASE_URL } from "@/lib/constants";
import { NextResponse } from "next/server";

interface HealthMetadata {
  total_stations: number;
  last_updated: string;
}

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const res = await fetch(`${HF_LATEST_BASE_URL}/metadata.json`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`metadata.json fetch failed: ${res.status}`);

    const metadata: HealthMetadata = await res.json();
    const isStale =
      Date.now() - new Date(metadata.last_updated).getTime() >
      HEALTH_STALE_THRESHOLD_MS;

    return NextResponse.json({
      status: isStale ? "degraded" : "healthy",
      lastETLUpdate: metadata.last_updated,
      stationsCount: metadata.total_stations,
      // ponytail: branché sur le taux d'erreur réel une fois US-05-03 (PostHog error tracking) livrée
      errorRateLast30min: null,
      timestamp,
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        lastETLUpdate: null,
        stationsCount: null,
        errorRateLast30min: null,
        timestamp,
      },
      { status: 503 },
    );
  }
}
