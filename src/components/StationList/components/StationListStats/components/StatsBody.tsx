'use client'

import { useMemo } from 'react'
import type { Geometry } from 'geojson'
import { Separator } from '@/components/ui/separator'
import { FuelType } from '@/lib/constants'
import { TrendDirection } from '@/lib/priceTrends'
import { formatPrice } from '@/lib/utils'
import { FuelStats, Station } from '@/store/useAppStore'
import { useAppStore } from '@/store/useAppStore'
import { BrandInsightSection } from './BrandInsightSection'
import { SectionTitle, StatRow } from './StatRow'
import { getIQRLabel, getStdDevLabel } from '../helpers/dispersionLabels'
import { computeAvgDistance, computeGeometryAreaKm2 } from '../helpers/geoStats'

export interface StatsBodyProps {
  statistics: FuelStats
  stations: Station[]
  searchRadius: number
  selectedFuel: FuelType
  referenceLocation: [number, number] | null
  roadDistances: Record<string, number>
  priceTrends: Record<string, TrendDirection>
  stationNames: Record<string, string>
  namesLoading: boolean
  distanceMode: 'road' | 'crow-fly'
  isodistanceGeometry: Geometry | null
}

export function StatsBody({
  statistics,
  stations,
  searchRadius,
  selectedFuel,
  referenceLocation,
  roadDistances,
  priceTrends,
  stationNames,
  namesLoading,
  distanceMode,
  isodistanceGeometry,
}: StatsBodyProps) {
  const circleArea = Math.PI * searchRadius * searchRadius
  const isoArea = useMemo(
    () => (distanceMode === 'road' && isodistanceGeometry ? computeGeometryAreaKm2(isodistanceGeometry) : null),
    [distanceMode, isodistanceGeometry],
  )
  const area = isoArea ?? circleArea
  const densityPer100 = (statistics.count / area) * 100
  const densityStr = `${densityPer100 < 1 ? densityPer100.toFixed(2) : densityPer100.toFixed(1)} station${densityPer100 >= 2 ? 's' : ''} / 100 km²`
  const typicalSpacingKm = Math.sqrt(area / statistics.count)

  // Références nationales France (depuis HF metadata.json, fallback 11 600)
  const nationalStationsCount = useAppStore((s) => s.nationalStationsCount) ?? 11600
  const FR_AREA = 543000 //Source : https://formation-civique.interieur.gouv.fr/fiches-par-thematiques/histoire-geographie-et-culture/atlas-de-la-france/le-territoire-de-la-france/#:~:text=La%20France%20en%20quelques%20chiffres,(au%201er%20janvier%202025).
  const FR_DENSITY = (nationalStationsCount / FR_AREA) * 100
  const FR_SPACING = Math.sqrt(FR_AREA / nationalStationsCount)

  const densityRatio = densityPer100 / FR_DENSITY
  const spacingRatio = typicalSpacingKm / FR_SPACING

  const densityColor =
    densityRatio >= 1.2 ? 'text-emerald-600' : densityRatio >= 0.8 ? 'text-amber-600' : 'text-rose-600'
  const spacingColor =
    spacingRatio <= 0.8 ? 'text-emerald-600' : spacingRatio <= 1.2 ? 'text-amber-600' : 'text-rose-600'

  const avgDist = useMemo(
    () => computeAvgDistance(stations, referenceLocation, roadDistances),
    [stations, referenceLocation, roadDistances],
  )

  return (
    <div className="flex flex-col gap-4 pr-4 pb-4">

      {/* Tendances & Enseignes — en premier */}
      <BrandInsightSection
        stations={stations}
        selectedFuel={selectedFuel}
        priceTrends={priceTrends}
        stationNames={stationNames}
        namesLoading={namesLoading}
        totalCount={statistics.count}
      />

      <Separator />

      {/* Plage */}
      <SectionTitle>Plage</SectionTitle>
      <div className="flex flex-col gap-4">
        <StatRow label="Prix minimum" value={formatPrice(statistics.min)} className="text-emerald-600" />
        <StatRow label="Prix maximum" value={formatPrice(statistics.max)} className="text-rose-600" />
      </div>

      <Separator />

      {/* Tendance centrale */}
      <SectionTitle>Tendance centrale</SectionTitle>
      <div className="flex flex-col gap-4">
        <StatRow
          label="Médiane"
          value={formatPrice(statistics.median)}
          className="text-amber-600"
          description="50% des stations proposent un prix inférieur"
        />
        <StatRow
          label="Prix moyen"
          value={formatPrice(statistics.average)}
          description="Somme des prix / nombre de stations"
        />
      </div>

      <Separator />

      {/* Quartiles & percentiles */}
      <SectionTitle>Quartiles & percentiles</SectionTitle>
      <div className="flex flex-col gap-4">
        <StatRow label="P10" value={formatPrice(statistics.p10)} percentile={10} description="90% des stations sont plus chères que ce seuil" />
        <StatRow label="P25" value={formatPrice(statistics.p25)} percentile={25} description="Quartile inférieur — 75% des stations sont plus chères que ce seuil" />
        <StatRow label="P75" value={formatPrice(statistics.p75)} percentile={75} description="Quartile supérieur — 25% des stations sont plus chères que ce seuil" />
        <StatRow label="P90" value={formatPrice(statistics.p90)} percentile={90} description="10% des stations sont plus chères que ce seuil" />
      </div>

      <Separator />

      {/* Dispersion */}
      <SectionTitle>Dispersion</SectionTitle>
      <div className="flex flex-col gap-4">
        <StatRow label="Écart interquartile (P75 − P25)" value={formatPrice(statistics.iqr)} description={getIQRLabel(statistics.iqr)} />
        <StatRow label="Écart-type" value={formatPrice(statistics.stdDev)} description={getStdDevLabel(statistics.stdDev)} />
      </div>

      <Separator />

      {/* Couverture géographique */}
      <SectionTitle>Couverture géographique</SectionTitle>
      <div className="flex flex-col gap-4">
        <StatRow
          label="Nombre de stations"
          value={`${statistics.count} · ${searchRadius} km`}
          description={`Surface couverte ≈ ${area.toFixed(0)} km²`}
        />
        <StatRow
          label="Densité"
          value={densityStr}
          className={densityColor}
          description={`Moyenne nationale : ~${FR_DENSITY.toFixed(1)} / 100 km²`}
        />
        <StatRow
          label="Espacement typique"
          value={`~${typicalSpacingKm.toFixed(1)} km`}
          className={spacingColor}
          description={`Moyenne nationale : ~${FR_SPACING.toFixed(1)} km`}
        />
        <StatRow
          label="Distance moyenne"
          value={avgDist !== null ? `${avgDist.toFixed(1)} km` : '—'}
          description={
            avgDist !== null
              ? "Distance moyenne des stations au point de référence"
              : "Localisation non disponible"
          }
        />
      </div>
    </div>
  )
}
