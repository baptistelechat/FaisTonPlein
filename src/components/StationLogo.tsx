'use client'

import { cn } from '@/lib/utils'
import { BRAND_LOGO_DOMAINS, normalizeBrand } from '@/lib/brandMapping'
import Image from 'next/image'
import { useState } from 'react'

interface StationLogoProps {
  name: string
  size?: 'sm' | 'md'
  className?: string
}

const PALETTE = [
  '#e63946',
  '#2a9d8f',
  '#e9c46a',
  '#264653',
  '#f4a261',
  '#457b9d',
  '#6d6875',
  '#3d405b',
]

const hashColor = (str: string): string => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]!
}

const slugify = (s: string): string =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '')

export const StationLogo = ({ name, size = 'sm', className }: StationLogoProps) => {
  const [srcIndex, setSrcIndex] = useState(0)
  const [imgLoaded, setImgLoaded] = useState(false)

  const brand = normalizeBrand(name)
  const displayName = brand ?? name
  const initial = displayName.charAt(0).toUpperCase()
  const color = hashColor(displayName)

  const domain = brand ? BRAND_LOGO_DOMAINS[brand] : null
  const localSrc = brand ? `/logos/${slugify(brand)}.png` : null
  const googleSrc = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null

  const sources: string[] = [localSrc, googleSrc].filter(Boolean) as string[]
  const currentSrc = sources[srcIndex] ?? null

  const sizeClass = size === 'md' ? 'size-10' : 'size-6'
  const textClass = size === 'md' ? 'text-sm' : 'text-[10px]'

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-md',
        sizeClass,
        className,
      )}
    >
      {/* Lettre-avatar : toujours présent en fond */}
      <div
        style={{ backgroundColor: color }}
        className="flex size-full items-center justify-center"
      >
        <span className={cn('font-bold text-white', textClass)}>{initial}</span>
      </div>

      {/* Logo avec fallback 3 niveaux : local PNG → Google S2 → lettre-avatar */}
      {currentSrc !== null && (
        <Image
          src={currentSrc}
          alt={brand ?? name}
          fill
          className={cn(
            'bg-white object-contain p-0.5 transition-opacity duration-200',
            imgLoaded ? 'opacity-100' : 'opacity-0',
          )}
          onLoad={() => setImgLoaded(true)}
          onError={() => {
            setSrcIndex(i => i + 1)
            setImgLoaded(false)
          }}
        />
      )}
    </div>
  )
}
