import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import InteractiveMap from "./InteractiveMap";

// Mock dependencies
vi.mock("@/components/ui/map", () => ({
  Map: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  MapControls: () => <div data-testid="map-controls" />,
  MapMarker: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-marker">{children}</div>
  ),
  MapPopup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-popup">{children}</div>
  ),
}));

// Mock Lucide icons
vi.mock("lucide-react", () => ({
  Loader2: () => <div data-testid="loader" />,
  MapPin: () => <div data-testid="map-pin" />,
}));

// Mock PriceMarker
vi.mock("./PriceMarker", () => ({
  PriceMarker: () => <div data-testid="price-marker" />,
}));

// Mock store
vi.mock("@/store/useAppStore", () => ({
  useAppStore: () => ({
    stations: [
      {
        id: "1",
        name: "Station 1",
        lat: 48.8566,
        lon: 2.3522,
        services: ["Service 1"],
        address: "Address 1",
        prices: [{ fuel_type: "E10", price: 1.5, updated_at: "2023-01-01" }],
      },
    ],
    stats: {
      E10: {
        min: 1.5,
        max: 1.5,
        average: 1.5,
        median: 1.5,
        p10: 1.5,
        p25: 1.5,
        p75: 1.5,
        p90: 1.5,
        iqr: 0,
        stdDev: 0,
        cv: 0,
        trimmedMean10: 1.5,
        count: 1,
        stationCount: 1,
        oldestUpdatedAt: "2023-01-01T00:00:00.000Z",
        latestUpdatedAt: "2023-01-01T00:00:00.000Z",
      },
    },
    isLoading: false,
    selectedFuel: "E10",
    selectedStation: null,
    setSelectedStation: vi.fn(),
    userLocation: null,
    setUserLocation: vi.fn(),
    flyToStation: null,
    setFlyToStation: vi.fn(),
    flyToLocation: null,
    setFlyToLocation: vi.fn(),
    searchLocation: null,
    setSelectedDepartment: vi.fn(),
    setSearchLocation: vi.fn(),
  }),
}));

// Mock navigator.geolocation
Object.defineProperty(global.navigator, "geolocation", {
  value: {
    getCurrentPosition: vi.fn(),
  },
  writable: true,
});

describe("InteractiveMap", () => {
  it("renders map and markers", () => {
    render(<InteractiveMap />);

    expect(screen.getByTestId("map")).toBeInTheDocument();
    expect(screen.getByTestId("map-controls")).toBeInTheDocument();
  });
});
