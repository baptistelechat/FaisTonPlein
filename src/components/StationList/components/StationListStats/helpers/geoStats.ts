import type { Geometry } from 'geojson'
import { getStationDistance } from '@/lib/utils'
import { Station } from '@/store/useAppStore'

// Formule de Shoelace sphérique — même algorithme que @turf/area
function ringAreaKm2(ring: number[][]): number {
  const R = 6371
  let area = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const lam1 = ring[i][0] * (Math.PI / 180)
    const phi1 = ring[i][1] * (Math.PI / 180)
    const lam2 = ring[i + 1][0] * (Math.PI / 180)
    const phi2 = ring[i + 1][1] * (Math.PI / 180)
    area += (lam2 - lam1) * (2 + Math.sin(phi1) + Math.sin(phi2))
  }
  return Math.abs((area * R * R) / 2)
}

export function computeGeometryAreaKm2(geometry: Geometry): number {
  if (geometry.type === 'Polygon') {
    const [outer, ...holes] = geometry.coordinates
    return ringAreaKm2(outer) - holes.reduce((s, h) => s + ringAreaKm2(h), 0)
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.reduce((sum, poly) => {
      const [outer, ...holes] = poly
      return sum + ringAreaKm2(outer) - holes.reduce((s, h) => s + ringAreaKm2(h), 0)
    }, 0)
  }
  return 0
}

export function computeAvgDistance(
  stations: Station[],
  referenceLocation: [number, number] | null,
  roadDistances: Record<string, number>,
): number | null {
  if (!referenceLocation || stations.length === 0) return null
  const sum = stations.reduce(
    (acc, s) => acc + getStationDistance(s, referenceLocation, roadDistances),
    0,
  )
  return sum / stations.length
}
