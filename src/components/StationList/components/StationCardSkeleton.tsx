import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function StationCardSkeleton() {
  return (
    <Card className='p-4'>
      <div className='flex items-start justify-between gap-2'>
        <div className='flex min-w-0 flex-1 items-start gap-2'>
          <Skeleton className='size-6 shrink-0 rounded-md' />
          <div className='flex flex-col gap-1 overflow-hidden'>
            <Skeleton className='h-4 w-28' />
            <div className='flex items-center gap-2'>
              <Skeleton className='h-3 w-10 shrink-0' />
              <Skeleton className='h-3 w-40' />
            </div>
          </div>
        </div>
        <Skeleton className='h-6 w-16 shrink-0' />
      </div>
    </Card>
  )
}
