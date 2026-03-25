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

export const StationLogo = ({ name, size = 'sm', className }: StationLogoProps) => {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  const brand = normalizeBrand(name)
  const displayName = brand ?? name
  const initial = displayName.charAt(0).toUpperCase()
  const color = hashColor(displayName)

  const domain = brand ? BRAND_LOGO_DOMAINS[brand] : null
  const faviconUrl = domain && !imgError
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    : null

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

      {/* Favicon via Google S2 : superposé avec transition opacity */}
      {faviconUrl && (
        <Image
          src={faviconUrl}
          alt={brand ?? name}
          fill
          className={cn(
            'bg-white object-contain p-0.5 transition-opacity duration-200',
            imgLoaded ? 'opacity-100' : 'opacity-0',
          )}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
        />
      )}
    </div>
  )
}
