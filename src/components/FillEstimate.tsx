'use client'

import { FILL_HABIT_OPTIONS } from '@/lib/constants'
import { useAppStore } from '@/store/useAppStore'

interface FillEstimateProps {
  pricePerLiter: number
  inline?: boolean
}

const getFillLabel = (fillHabit: number, cost: string): string => {
  switch (fillHabit) {
    case 1.0:
      return `Plein complet : ~${cost}€`
    case 0.9:
      return `À la réserve : ~${cost}€`
    case 0.75:
      return `Au 1/4 restant : ~${cost}€`
    case 0.5:
      return `À mi-réservoir : ~${cost}€`
    case 0.25:
      return `Dès 1/4 entamé : ~${cost}€`
    default:
      return `~${cost}€ le plein`
  }
}

export const FillEstimate = ({ pricePerLiter, inline = false }: FillEstimateProps) => {
  const tankCapacity = useAppStore((s) => s.tankCapacity)
  const fillHabit = useAppStore((s) => s.fillHabit)

  if (tankCapacity <= 0) return null

  const cost = (tankCapacity * fillHabit * pricePerLiter).toFixed(0)
  const label = getFillLabel(fillHabit, cost)

  // Vérification que fillHabit est bien une valeur connue
  const isKnownHabit = FILL_HABIT_OPTIONS.some((o) => o.value === fillHabit)
  const displayText = isKnownHabit ? label : `~${cost}€ le plein`

  return (
    <span className='text-muted-foreground text-[10px] font-medium'>
      {inline ? `(${displayText})` : displayText}
    </span>
  )
}
