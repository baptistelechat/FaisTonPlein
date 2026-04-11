"use client";

import { Badge } from "@/components/ui/badge";
import { RADIUS_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Calculator, Clock, Euro, Route } from "lucide-react";
import StationListSettings from "./StationListSettings";

interface StationListHeaderProps {
  listSortBy: "price" | "distance" | "real-cost";
  setListSortBy: (s: "price" | "distance" | "real-cost") => void;
  canUseRealCost: boolean;
  searchRadius: number;
  setSearchRadius: (r: number) => void;
  majLabel: string | null;
  isDataStale: boolean;
}

export function StationListHeader({
  listSortBy,
  setListSortBy,
  canUseRealCost,
  searchRadius,
  setSearchRadius,
  majLabel,
  isDataStale,
}: StationListHeaderProps) {
  return (
    <div className="flex flex-col gap-2 p-4 pb-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">
          {listSortBy === "price"
            ? "Les plus économiques"
            : listSortBy === "real-cost"
              ? "Meilleur rapport coût/trajet"
              : "Autour de moi"}
        </h2>
        {majLabel && (
          <span
            className={cn(
              "flex items-center gap-1 text-[11px]",
              isDataStale ? "text-red-700" : "text-muted-foreground",
            )}
          >
            <Clock className="size-3" />
            {`Mise à jour : ${majLabel}`}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 pr-3">
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={listSortBy === "distance" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setListSortBy("distance")}
            >
              <Route className="size-4" />
              Distance
            </Badge>
            <Badge
              variant={listSortBy === "price" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setListSortBy("price")}
            >
              <Euro className="size-4" />
              Prix
            </Badge>
            {canUseRealCost && (
              <Badge
                variant={listSortBy === "real-cost" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setListSortBy("real-cost")}
              >
                <Calculator className="size-4" />
                Coût/trajet
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {RADIUS_OPTIONS.map((option) => (
              <Badge
                key={option.value}
                variant={searchRadius === option.value ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSearchRadius(option.value)}
              >
                {option.label}
              </Badge>
            ))}
          </div>
        </div>
        <StationListSettings />
      </div>
    </div>
  );
}
