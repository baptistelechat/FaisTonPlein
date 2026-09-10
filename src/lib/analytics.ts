import posthog from "posthog-js";

const isEnabled = () => !!process.env.NEXT_PUBLIC_POSTHOG_KEY;

let sessionStartedAt: number | null = null;
let navigationWasLaunched = false;
let stationDetailWasOpened = false;

function elapsedMs(): number | null {
  return sessionStartedAt ? Date.now() - sessionStartedAt : null;
}

const analytics = {
  sessionStart: (props: {
    sessionSource: "pwa" | "browser";
    geolocStatus: "granted" | "denied" | "not_requested";
    networkQuality: string;
  }) => {
    sessionStartedAt = Date.now();
    if (!isEnabled()) return;
    posthog.capture("session_start", props);
  },

  stationDetailViewed: () => {
    stationDetailWasOpened = true;
    if (!isEnabled()) return;
    posthog.capture("station_detail_viewed");
  },

  navigationLaunched: (props: {
    destination: "google_maps" | "waze";
    fuelType: string;
    sortMode: string;
  }) => {
    navigationWasLaunched = true;
    if (!isEnabled()) return;
    posthog.capture("navigation_launched", {
      ...props,
      sessionDurationMs: elapsedMs(),
    });
  },

  modeSelected: (mode: string) => {
    if (!isEnabled()) return;
    posthog.capture("mode_selected", { mode });
  },

  fuelSelected: (fuelType: string) => {
    if (!isEnabled()) return;
    posthog.capture("fuel_selected", { fuelType });
  },

  /**
   * Envoyé à la fermeture de la page via navigator.sendBeacon (fallback fetch keepalive)
   * pour survivre à une fermeture brutale — posthog.capture() n'est pas fiable dans ce cas.
   */
  sessionEnded: (props: { lastMode: string; lastFuelType: string }) => {
    if (!isEnabled()) return;

    const host =
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
    const payload = JSON.stringify({
      api_key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      event: "session_ended",
      properties: {
        distinct_id: posthog.get_distinct_id(),
        app: "faistonplein",
        // $host non auto-attaché ici (beacon manuel, hors SDK) — nécessaire pour
        // que le filtre PostHog "Internal and test users" (Host ≠ ...) s'applique
        $host: window.location.host,
        navigationLaunched: navigationWasLaunched,
        stationDetailOpened: stationDetailWasOpened,
        lastMode: props.lastMode,
        lastFuelType: props.lastFuelType,
        sessionDurationMs: elapsedMs(),
      },
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        `${host}/i/v0/e/`,
        new Blob([payload], { type: "text/plain" }),
      );
    } else {
      fetch(`${host}/i/v0/e/`, {
        method: "POST",
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  },
};

export default analytics;
