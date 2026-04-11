'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useFilteredStations } from '@/hooks/useFilteredStations'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { useReferenceLocation } from '@/hooks/useReferenceLocation'
import { DRAWER_SNAP_POINTS } from '@/lib/constants'
import { getStationNamesDb } from '@/lib/stationName'
import { FuelStats, useAppStore } from '@/store/useAppStore'
import { Bird, ChartNoAxesCombined, Navigation } from 'lucide-react'
import { useEffect, useState } from 'react'
import { StatsBody, StatsBodyProps } from './StationListStats/components/StatsBody'

interface StationListStatsProps {
  statistics: FuelStats
}

const StationListStats = ({ statistics }: StationListStatsProps) => {
  const isDesktop = useIsDesktop()
  const selectedFuel = useAppStore((s) => s.selectedFuel)
  const searchRadius = useAppStore((s) => s.searchRadius)
  const distanceMode = useAppStore((s) => s.distanceMode)
  const isodistanceGeometry = useAppStore((s) => s.isodistanceGeometry)
  const roadDistances = useAppStore((s) => s.roadDistances)
  const priceTrends = useAppStore((s) => s.priceTrends)
  const filteredStations = useFilteredStations()
  const referenceLocation = useReferenceLocation()
  const [stationNames, setStationNames] = useState<Record<string, string>>({})
  const [namesLoading, setNamesLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getStationNamesDb()
      .then((names) => {
        if (!cancelled) {
          setStationNames(names)
          setNamesLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setNamesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const count = statistics.count
  const DistanceIcon = distanceMode === 'road' ? Navigation : Bird
  const distanceLabel = distanceMode === 'road' ? 'Route réelle' : "Vol d'oiseau"
  const subtitle = (
    <span className="flex flex-wrap items-center gap-1">
      {count} station{count > 1 ? 's' : ''} proposant du {selectedFuel} dans un rayon de {searchRadius} km
      <span className="text-muted-foreground/70 flex items-center gap-1">
        (<DistanceIcon className="-ml-1 size-3" />{distanceLabel})
      </span>
    </span>
  )

  const bodyProps: StatsBodyProps = {
    statistics,
    stations: filteredStations,
    searchRadius,
    selectedFuel,
    referenceLocation,
    roadDistances,
    priceTrends,
    stationNames,
    namesLoading,
    distanceMode,
    isodistanceGeometry,
  }

  if (isDesktop) {
    return (
      <Dialog>
        <DialogTrigger render={<Button variant="outline" size="icon" />}>
          <ChartNoAxesCombined />
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChartNoAxesCombined className="size-4" />
              Statistiques
            </DialogTitle>
            <DialogDescription>{subtitle}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <StatsBody {...bodyProps} />
          </ScrollArea>
          <div className="flex justify-end pt-2">
            <DialogClose render={<Button variant="outline" />}>Fermer</DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="icon">
          <ChartNoAxesCombined />
        </Button>
      </DrawerTrigger>
      <DrawerContent
        className="rounded-t-[20px] shadow-2xl"
        style={{ height: `${DRAWER_SNAP_POINTS.EXPANDED * 100}svh` }}
      >
        <DrawerHeader className="text-left!">
          <DrawerTitle className="flex items-center gap-2">
            <ChartNoAxesCombined className="size-4" />
            Statistiques
          </DrawerTitle>
          <DrawerDescription>{subtitle}</DrawerDescription>
        </DrawerHeader>
        <ScrollArea
          style={{
            height: `calc(${DRAWER_SNAP_POINTS.EXPANDED * 100}svh - 8rem)`,
          }}
        >
          <div className="px-4">
            <StatsBody {...bodyProps} />
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  )
}

export default StationListStats
