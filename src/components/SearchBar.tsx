'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAddressSearch } from '@/hooks/useAddressSearch';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function SearchBar() {
  const { searchQuery, setSearchQuery, setSearchLocation } = useAppStore();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { results, isLoading, handleSearch, handleSelect, clearResults } =
    useAddressSearch({
      onSelect: () => setOpen(false),
    });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = () => {
    setSearchQuery('');
    clearResults();
    setOpen(false);
    setSearchLocation(null);
  };

  return (
    <div ref={containerRef} className='relative w-full max-w-md'>
      <div className='relative'>
        <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
        <Input
          placeholder='Rechercher une ville...'
          value={searchQuery}
          variant='search'
          onChange={(e) => {
            const value = e.target.value;
            setSearchQuery(value);
            if (value.length >= 3) setOpen(true);
            handleSearch(value);
          }}
        />
        {searchQuery && (
          <Button
            variant='ghost'
            size='icon'
            onClick={handleClear}
            className='text-muted-foreground hover:text-foreground absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2 rounded-full'
          >
            <X className='h-4 w-4' />
          </Button>
        )}
      </div>

      {open && (
        <div className='border-primary/20 bg-background animate-in fade-in-0 zoom-in-95 absolute top-full left-0 z-50 mt-2 w-full overflow-hidden rounded-xl border shadow-xl'>
          {isLoading && (
            <div className='text-muted-foreground flex items-center justify-center p-4 text-sm'>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Recherche...
            </div>
          )}
          {!isLoading && results.length === 0 && searchQuery.length >= 3 && (
            <div className='text-muted-foreground p-4 text-center text-sm'>
              Aucun résultat.
            </div>
          )}
          {!isLoading && results.length > 0 && (
            <div className='max-h-75 overflow-auto py-1'>
              {results.map((item) => (
                <Card
                  key={item.properties.id}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    'hover:bg-muted/50 cursor-pointer transition-all',
                    'rounded-none border-0 px-4 py-2 shadow-none',
                  )}
                >
                  <div className='flex items-start gap-3'>
                    <div className='bg-primary/10 mt-0.5 shrink-0 rounded-full p-1.5'>
                      <MapPin className='text-primary h-4 w-4' />
                    </div>
                    <div className='flex flex-col overflow-hidden'>
                      <span className='truncate text-sm font-medium'>
                        {item.properties.label}
                      </span>
                      <span className='text-muted-foreground truncate text-xs'>
                        {item.properties.context}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
