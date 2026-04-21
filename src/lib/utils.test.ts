import { describe, expect, it } from "vitest";
import { calculateDistance } from "./utils";

describe("calculateDistance", () => {
  it("should calculate distance between two points correctly", () => {
    // Paris (48.8566, 2.3522) to Lyon (45.7640, 4.8357)
    // Distance is approx 391 km
    const dist = calculateDistance(48.8566, 2.3522, 45.764, 4.8357);
    expect(dist).toBeCloseTo(391, -1); // Check within 10km precision
  });

  it("should return 0 for same location", () => {
    const dist = calculateDistance(48.8566, 2.3522, 48.8566, 2.3522);
    expect(dist).toBe(0);
  });
});
