import { Button } from '@/components/ui/button'
import { DRAWER_SNAP_POINTS } from '@/lib/constants'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { FuelStats } from '@/store/useAppStore'
import { ChartNoAxesCombined } from 'lucide-react'

interface StationListStatsProps {
  statistics: FuelStats
}

const StationListStats = ({ statistics }: StationListStatsProps) => {
  const formatPrice = (value: number) => `${value.toFixed(3)}€`

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant='outline' size='icon'>
          <ChartNoAxesCombined />
        </Button>
      </DrawerTrigger>
      <DrawerContent
        className='rounded-t-[20px] shadow-2xl'
        style={{ height: `${DRAWER_SNAP_POINTS.EXPANDED * 100}svh` }}
      >
        <DrawerHeader className='text-left!'>
          <DrawerTitle className='flex items-center gap-2'>
            <ChartNoAxesCombined className='size-4' />
            Statistiques
          </DrawerTitle>
          <DrawerDescription>
            Voici les statistiques des prix des stations de carburant.
          </DrawerDescription>
        </DrawerHeader>
        <ScrollArea style={{ height: `calc(${DRAWER_SNAP_POINTS.EXPANDED * 100}svh - 8rem)` }}>
          <div className='flex flex-col gap-4 px-4 pb-8'>
            <div className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
              Échantillon
            </div>
            <div className='flex flex-col gap-4'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-bold'>Nombre de stations</span>
                <span className='font-mono font-bold text-slate-600'>
                  {statistics.count}
                </span>
              </div>
            </div>
            <Separator />
            <div className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
              Plage
            </div>
            <div className='flex flex-col gap-4'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-bold'>Prix minimum</span>
                <span className='font-mono font-bold text-emerald-600'>
                  {formatPrice(statistics.min)}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-bold'>Prix maximum</span>
                <span className='font-mono font-bold text-rose-600'>
                  {formatPrice(statistics.max)}
                </span>
              </div>
            </div>
            <Separator />
            <div className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
              Tendance
            </div>
            <div className='flex flex-col gap-4'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-bold'>Médiane</span>
                <span className='font-mono font-bold text-amber-600'>
                  {formatPrice(statistics.median)}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-bold'>Prix moyen</span>
                <span className='font-mono font-bold text-slate-600'>
                  {formatPrice(statistics.average)}
                </span>
              </div>
            </div>
            <Separator />
            <div className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
              Quartiles & percentiles
            </div>
            <div className='flex flex-col gap-4'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-bold'>P10</span>
                <span className='font-mono font-bold text-slate-600'>
                  {formatPrice(statistics.p10)}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-bold'>P25</span>
                <span className='font-mono font-bold text-slate-600'>
                  {formatPrice(statistics.p25)}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-bold'>P75</span>
                <span className='font-mono font-bold text-slate-600'>
                  {formatPrice(statistics.p75)}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-bold'>P90</span>
                <span className='font-mono font-bold text-slate-600'>
                  {formatPrice(statistics.p90)}
                </span>
              </div>
            </div>
            <Separator />
            <div className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
              Dispersion
            </div>
            <div className='flex flex-col gap-4'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-bold'>
                  Écart interquartile (P75 − P25)
                </span>
                <span className='font-mono font-bold text-slate-600'>
                  {formatPrice(statistics.iqr)}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-bold'>Écart-type</span>
                <span className='font-mono font-bold text-slate-600'>
                  {formatPrice(statistics.stdDev)}
                </span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  )
}

export default StationListStats
