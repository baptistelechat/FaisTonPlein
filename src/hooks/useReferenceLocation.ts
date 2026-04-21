'use client'
import { useAppStore } from '@/store/useAppStore'

export function useReferenceLocation(): [number, number] | null {
  const searchLocation = useAppStore((s) => s.searchLocation)
  const userLocation = useAppStore((s) => s.userLocation)
  return searchLocation ?? userLocation
}
