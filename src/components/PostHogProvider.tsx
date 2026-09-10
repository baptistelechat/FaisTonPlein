"use client";
import analytics from "@/lib/analytics";
import { useAppStore } from "@/store/useAppStore";
import posthog from "posthog-js";
import { useEffect } from "react";

let initialized = false;

function isLocalhost(hostname: string): boolean {
  return hostname === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

interface NetworkInformation {
  effectiveType?: string;
}

function getNetworkQuality(): string {
  const nav = navigator as Navigator & { connection?: NetworkInformation };
  return nav.connection?.effectiveType ?? "unknown";
}

function getSessionSource(): "pwa" | "browser" {
  return window.matchMedia("(display-mode: standalone)").matches
    ? "pwa"
    : "browser";
}

export function PostHogProvider() {
  useEffect(() => {
    if (initialized) return;

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const enabled =
      !!key &&
      !isLocalhost(window.location.hostname) &&
      (process.env.NODE_ENV === "production" ||
        process.env.NEXT_PUBLIC_POSTHOG_DEBUG === "true");

    if (!enabled) return;

    initialized = true;
    posthog.init(key as string, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
      persistence: "memory",
      autocapture: false,
      capture_pageview: true,
      capture_pageleave: true,
      // projet PostHog partagé avec ifecho (Session Replay actif côté projet) — désactivé explicitement ici, contrainte RGPD E05
      disable_session_recording: true,
      // capture automatique des erreurs non gérées (window.onerror / unhandledrejection) — US-05-03
      capture_exceptions: true,
    });
    // même projet PostHog qu'ifecho — distingue les events par app
    posthog.register({ app: "faistonplein" });
    if (process.env.NEXT_PUBLIC_POSTHOG_DEBUG === "true") {
      // marque tout event de cette session comme test — à exclure des dashboards
      // via le filtre PostHog "Internal and test users" (test_mode = true)
      posthog.register({ test_mode: true });
    }

    const sessionSource = getSessionSource();
    const networkQuality = getNetworkQuality();

    const emitSessionStart = (
      geolocStatus: "granted" | "denied" | "not_requested",
    ) =>
      analytics.sessionStart({ sessionSource, geolocStatus, networkQuality });

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((status) =>
          emitSessionStart(
            status.state === "prompt" ? "not_requested" : status.state,
          ),
        )
        .catch(() => emitSessionStart("not_requested"));
    } else {
      emitSessionStart("not_requested");
    }

    const handleSessionEnded = () => {
      const state = useAppStore.getState();
      analytics.sessionEnded({
        lastMode: state.listSortBy,
        lastFuelType: state.selectedFuel,
      });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") handleSessionEnded();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", handleSessionEnded);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", handleSessionEnded);
    };
  }, []);

  return null;
}
