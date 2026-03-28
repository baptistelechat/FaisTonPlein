"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useMediaQuery } from "@/hooks/use-media-query";
import { DRAWER_SNAP_POINTS } from "@/lib/constants";
import { FuelStats } from "@/store/useAppStore";
import { ChartNoAxesCombined } from "lucide-react";

interface StationListStatsProps {
  statistics: FuelStats;
}

function StatsBody({ statistics }: { statistics: FuelStats }) {
  const formatPrice = (value: number) => `${value.toFixed(3)}€`;

  return (
    <div className="flex flex-col gap-4 pr-4 pb-4">
      <div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
        Échantillon
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">Nombre de stations</span>
          <span className="font-mono font-bold text-slate-600">
            {statistics.count}
          </span>
        </div>
      </div>
      <Separator />
      <div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
        Plage
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">Prix minimum</span>
          <span className="font-mono font-bold text-emerald-600">
            {formatPrice(statistics.min)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">Prix maximum</span>
          <span className="font-mono font-bold text-rose-600">
            {formatPrice(statistics.max)}
          </span>
        </div>
      </div>
      <Separator />
      <div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
        Tendance
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">Médiane</span>
          <span className="font-mono font-bold text-amber-600">
            {formatPrice(statistics.median)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">Prix moyen</span>
          <span className="font-mono font-bold text-slate-600">
            {formatPrice(statistics.average)}
          </span>
        </div>
      </div>
      <Separator />
      <div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
        Quartiles & percentiles
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">P10</span>
          <span className="font-mono font-bold text-slate-600">
            {formatPrice(statistics.p10)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">P25</span>
          <span className="font-mono font-bold text-slate-600">
            {formatPrice(statistics.p25)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">P75</span>
          <span className="font-mono font-bold text-slate-600">
            {formatPrice(statistics.p75)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">P90</span>
          <span className="font-mono font-bold text-slate-600">
            {formatPrice(statistics.p90)}
          </span>
        </div>
      </div>
      <Separator />
      <div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
        Dispersion
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">
            Écart interquartile (P75 − P25)
          </span>
          <span className="font-mono font-bold text-slate-600">
            {formatPrice(statistics.iqr)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">Écart-type</span>
          <span className="font-mono font-bold text-slate-600">
            {formatPrice(statistics.stdDev)}
          </span>
        </div>
      </div>
    </div>
  );
}

const StationListStats = ({ statistics }: StationListStatsProps) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog>
        <DialogTrigger render={<Button variant="outline" size="icon" />}>
          <ChartNoAxesCombined />
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChartNoAxesCombined className="size-4" />
              Statistiques
            </DialogTitle>
            <DialogDescription>
              Statistiques des prix dans le rayon sélectionné.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <StatsBody statistics={statistics} />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="icon">
          <ChartNoAxesCombined />
        </Button>
      </DrawerTrigger>
      <DrawerContent
        className="rounded-t-[20px] shadow-2xl"
        style={{ height: `${DRAWER_SNAP_POINTS.EXPANDED * 100}svh` }}
      >
        <DrawerHeader className="text-left!">
          <DrawerTitle className="flex items-center gap-2">
            <ChartNoAxesCombined className="size-4" />
            Statistiques
          </DrawerTitle>
          <DrawerDescription>
            Voici les statistiques des prix des stations de carburant.
          </DrawerDescription>
        </DrawerHeader>
        <ScrollArea
          style={{
            height: `calc(${DRAWER_SNAP_POINTS.EXPANDED * 100}svh - 8rem)`,
          }}
        >
          <div className="px-4">
            <StatsBody statistics={statistics} />
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};

export default StationListStats;
