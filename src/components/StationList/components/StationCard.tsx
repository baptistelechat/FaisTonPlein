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
import { cn, getStationDistance } from '@/lib/utils'
import { FuelStats, Station, useAppStore } from '@/store/useAppStore'
import { Bird, Euro, Navigation, Road, Route, Scale } from 'lucide-react'

export interface StationCardProps {
  station: Station
  selectedFuel: string
  referenceLocation: [number, number] | null
  filteredStats: FuelStats | null
  bestPriceStationIds: string[]
  bestDistanceStationIds: string[]
  bestRealCostStationIds: string[]
  onClick: () => void
}

export function StationCard({
  station,
  selectedFuel,
  referenceLocation,
  filteredStats,
  bestPriceStationIds,
  bestDistanceStationIds,
  bestRealCostStationIds,
  onClick,
}: StationCardProps) {
  const resolvedName = useAppStore((s) => s.resolvedNames[String(station.id)])
  const roadDistances = useAppStore((s) => s.roadDistances)
  const distanceMode = useAppStore((s) => s.distanceMode)
  const displayName = resolvedName ?? station.name
  const isNameLoading = resolvedName === undefined
  const price = station.prices.find((p) => p.fuel_type === selectedFuel)

  const haversineDistance = referenceLocation
    ? getStationDistance(station, referenceLocation)
    : null

  const roadDistance = roadDistances[station.id] ?? null
  const distance = distanceMode === 'road' && roadDistance !== null ? roadDistance : haversineDistance
  const isExactDistance = distanceMode === 'road' && roadDistance !== null

  const priceColor = price
    ? getPriceTextColor(price.price, filteredStats)
    : 'text-foreground'

  return (
    <Card
      className='hover:bg-muted/50 mt-0.5 cursor-pointer p-4 transition-all'
      onClick={onClick}
    >
      <div className='flex items-stretch gap-x-3'>
        {/* Colonne 1 : nom + adresse */}
        <div className='flex min-w-0 flex-1 flex-col justify-evenly'>
          <h3 className='flex min-w-0 items-center gap-2 text-sm font-semibold'>
            {isNameLoading ? (
              <Skeleton className='size-6 shrink-0 rounded-md' />
            ) : (
              <StationLogo name={displayName} size='sm' />
            )}
            <span className='truncate'>
              {isNameLoading ? <Skeleton className='h-4 w-28' /> : displayName}
            </span>
            {bestPriceStationIds.includes(station.id) && (
              <Euro className='size-4 shrink-0 text-yellow-500' />
            )}
            {bestDistanceStationIds.includes(station.id) && (
              <Route className='size-4 shrink-0 text-yellow-500' />
            )}
            {bestRealCostStationIds.includes(station.id) && (
              <Scale className='size-4 shrink-0 text-yellow-500' />
            )}
            {station.isHighway && (
              <Road className='size-4 shrink-0 text-blue-500' />
            )}
          </h3>
          <div className='text-muted-foreground flex min-w-0 items-center gap-2 text-xs'>
            {distance !== null && (
              <span className='text-primary/80 flex shrink-0 items-center gap-0.5 whitespace-nowrap'>
                {isExactDistance ? <Navigation className='size-3' /> : <Bird className='size-3' />}
                {!isExactDistance && '~'}{distance.toFixed(1)} km
              </span>
            )}
            <span className='truncate'>{station.address}</span>
          </div>
        </div>

        {/* Colonne 2 : prix + estimation + fraîcheur */}
        <div className='flex flex-col items-end gap-0.5'>
          {price ? (
            <span
              className={cn(
                'font-mono text-lg leading-none font-bold',
                priceColor,
              )}
            >
              {price.price.toFixed(3)}
              <span className='text-muted-foreground ml-0.5 text-xs font-normal'>
                €/L
              </span>
            </span>
          ) : (
            <span className='text-muted-foreground text-xs'>-</span>
          )}
          {price && <FillEstimate pricePerLiter={price.price} distanceKm={distance} />}
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
