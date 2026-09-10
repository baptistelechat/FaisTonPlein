"use client";
import posthog from "posthog-js";
import { useEffect } from "react";

let initialized = false;

function isLocalhost(hostname: string): boolean {
  return hostname === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
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
    });
    // même projet PostHog qu'ifecho — distingue les events par app
    posthog.register({ app: "faistonplein" });
  }, []);

  return null;
}
