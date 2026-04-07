'use client'

import { ReactNode } from 'react'

export function getIQRLabel(iqr: number): ReactNode {
  if (iqr < 0.03)
    return <><span className="font-semibold text-emerald-600">Marché homogène</span> — les prix sont très proches entre eux</>
  if (iqr < 0.08)
    return <><span className="font-semibold text-amber-600">Dispersion modérée</span> — quelques écarts notables entre stations</>
  return <><span className="font-semibold text-rose-600">Marché très dispersé</span> — comparer attentivement les prix</>
}

export function getStdDevLabel(stdDev: number): ReactNode {
  if (stdDev < 0.03)
    return <><span className="font-semibold text-emerald-600">Prix très stables</span> — peu de variation autour de la moyenne</>
  if (stdDev < 0.06)
    return <><span className="font-semibold text-amber-600">Variation normale</span> — quelques stations sortent légèrement de la moyenne</>
  return <><span className="font-semibold text-rose-600">Prix très variables</span> — certaines stations s&apos;écartent nettement de la moyenne</>
}
