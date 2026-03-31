'use client'
import { useMediaQuery } from '@/hooks/use-media-query'

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)')
}
