"use client";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogClose,
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
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { DRAWER_SNAP_POINTS } from "@/lib/constants";
import { FuelStats } from "@/store/useAppStore";
import { formatPrice } from "@/lib/utils";
import { ChartNoAxesCombined } from "lucide-react";

interface StationListStatsProps {
  statistics: FuelStats;
}

interface StatRowProps {
  label: string;
  value: string;
  className?: string;
}

function StatRow({ label, value, className = 'text-slate-600' }: StatRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-bold">{label}</span>
      <span className={`font-mono font-bold ${className}`}>{value}</span>
    </div>
  );
}

function StatsBody({ statistics }: { statistics: FuelStats }) {
  return (
    <div className="flex flex-col gap-4 pr-4 pb-4">
      <div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
        Échantillon
      </div>
      <div className="flex flex-col gap-4">
        <StatRow label="Nombre de stations" value={String(statistics.count)} />
      </div>
      <Separator />
      <div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
        Plage
      </div>
      <div className="flex flex-col gap-4">
        <StatRow label="Prix minimum" value={formatPrice(statistics.min)} className="text-emerald-600" />
        <StatRow label="Prix maximum" value={formatPrice(statistics.max)} className="text-rose-600" />
      </div>
      <Separator />
      <div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
        Tendance
      </div>
      <div className="flex flex-col gap-4">
        <StatRow label="Médiane" value={formatPrice(statistics.median)} className="text-amber-600" />
        <StatRow label="Prix moyen" value={formatPrice(statistics.average)} />
      </div>
      <Separator />
      <div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
        Quartiles & percentiles
      </div>
      <div className="flex flex-col gap-4">
        <StatRow label="P10" value={formatPrice(statistics.p10)} />
        <StatRow label="P25" value={formatPrice(statistics.p25)} />
        <StatRow label="P75" value={formatPrice(statistics.p75)} />
        <StatRow label="P90" value={formatPrice(statistics.p90)} />
      </div>
      <Separator />
      <div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
        Dispersion
      </div>
      <div className="flex flex-col gap-4">
        <StatRow label="Écart interquartile (P75 − P25)" value={formatPrice(statistics.iqr)} />
        <StatRow label="Écart-type" value={formatPrice(statistics.stdDev)} />
      </div>
    </div>
  );
}

const StationListStats = ({ statistics }: StationListStatsProps) => {
  const isDesktop = useIsDesktop();

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
          <div className="flex justify-end pt-2">
            <DialogClose render={<Button variant="outline" />}>Fermer</DialogClose>
          </div>
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
