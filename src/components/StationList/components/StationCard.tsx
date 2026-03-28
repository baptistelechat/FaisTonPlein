'use client'

import { FillEstimate } from '@/components/FillEstimate'
import { StationLogo } from '@/components/StationLogo'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getPriceTextColor } from '@/lib/priceColor'
import {
  formatPriceAgeCompact,
  FRESHNESS_DOT_COLORS,
  FRESHNESS_TEXT_COLORS,
  getPriceFreshness,
} from '@/lib/priceFreshness'
import { calculateDistance, cn } from '@/lib/utils'
import { FuelStats, Station, useAppStore } from '@/store/useAppStore'
import { Euro, Navigation, Road, Route } from 'lucide-react'

export interface StationCardProps {
  station: Station
  selectedFuel: string
  referenceLocation: [number, number] | null
  filteredStats: FuelStats | null
  bestPriceStationIds: string[]
  bestDistanceStationIds: string[]
  onClick: () => void
}

export function StationCard({
  station,
  selectedFuel,
  referenceLocation,
  filteredStats,
  bestPriceStationIds,
  bestDistanceStationIds,
  onClick,
}: StationCardProps) {
  const resolvedName = useAppStore((s) => s.resolvedNames[String(station.id)])
  const displayName = resolvedName ?? station.name
  const isNameLoading = resolvedName === undefined
  const price = station.prices.find((p) => p.fuel_type === selectedFuel)
  const distance = referenceLocation
    ? calculateDistance(
        referenceLocation[1], // lat
        referenceLocation[0], // lon
        station.lat,
        station.lon,
      )
    : null

  const priceColor = price
    ? getPriceTextColor(price.price, filteredStats)
    : 'text-foreground'

  return (
    <Card
      className='hover:bg-muted/50 mt-0.5 cursor-pointer p-4 transition-all'
      onClick={onClick}
    >
      <div className='grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1'>
        {/* Logo — aligne les 2 lignes */}
        <div className='row-span-2 self-center'>
          {isNameLoading ? (
            <Skeleton className='size-6 shrink-0 rounded-md' />
          ) : (
            <StationLogo name={displayName} size='sm' />
          )}
        </div>

        {/* Ligne 1 : nom + badges | prix */}
        <h3 className='flex min-w-0 items-center gap-2 truncate text-sm font-semibold'>
          {isNameLoading ? <Skeleton className='h-4 w-28' /> : displayName}
          {bestPriceStationIds.includes(station.id) && (
            <Euro className='size-4 shrink-0 text-yellow-500' />
          )}
          {bestDistanceStationIds.includes(station.id) && (
            <Route className='size-4 shrink-0 text-yellow-500' />
          )}
          {station.isHighway && (
            <Road className='size-4 shrink-0 text-blue-500' />
          )}
        </h3>
        <div className='flex flex-col items-end'>
          {price ? (
            <span
              className={cn(
                'font-mono text-lg leading-none font-bold',
                priceColor,
              )}
            >
              {price.price.toFixed(3)}
              <span className='text-muted-foreground ml-0.5 text-xs font-normal'>
                €
              </span>
            </span>
          ) : (
            <span className='text-muted-foreground text-xs'>-</span>
          )}
          {price && <FillEstimate pricePerLiter={price.price} />}
        </div>

        {/* Ligne 2 : distance + adresse | fraîcheur */}
        <div className='text-muted-foreground flex min-w-0 items-center gap-2 text-xs'>
          {distance !== null && (
            <span className='text-primary/80 flex shrink-0 items-center gap-0.5 whitespace-nowrap'>
              <Navigation className='size-3' />
              {distance.toFixed(1)} km
            </span>
          )}
          <span className='truncate'>{station.address}</span>
        </div>
        <div className='flex justify-end'>
          {price?.updated_at &&
            (() => {
              const freshness = getPriceFreshness(price.updated_at)
              const ageLabel = formatPriceAgeCompact(price.updated_at)
              if (!ageLabel) return null
              return (
                <span className='flex items-center gap-1'>
                  <span
                    className={cn(
                      'size-1.5 shrink-0 rounded-full',
                      FRESHNESS_DOT_COLORS[freshness],
                    )}
                  />
                  <span
                    className={cn(
                      'text-[10px] font-medium',
                      FRESHNESS_TEXT_COLORS[freshness],
                    )}
                  >
                    {ageLabel}
                  </span>
                </span>
              )
            })()}
        </div>
      </div>
    </Card>
  )
}
