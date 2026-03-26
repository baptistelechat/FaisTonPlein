import { getStationNamesDb } from '@/lib/stationName'
import { Station, useAppStore } from '@/store/useAppStore'
import { useEffect } from 'react'

const DEFAULT_NAME = 'Station service'

export function useStationName(
  station: Station | null,
): { name: string; isLoading: boolean } {
  const resolvedNames = useAppStore((s) => s.resolvedNames)
  const setResolvedName = useAppStore((s) => s.setResolvedName)

  useEffect(() => {
    if (!station) return
    if (station.name !== DEFAULT_NAME) return
    if (resolvedNames[String(station.id)]) return

    getStationNamesDb().then((db) => {
      setResolvedName(String(station.id), db[String(station.id)] ?? DEFAULT_NAME)
    })
  }, [station?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!station) return { name: DEFAULT_NAME, isLoading: false }
  const resolved = resolvedNames[String(station.id)]
  const isLoading = station.name === DEFAULT_NAME && !resolved
  return { name: resolved ?? station.name, isLoading }
}
