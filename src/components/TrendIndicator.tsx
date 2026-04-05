"use client";

import { TrendDirection } from "@/lib/priceTrends";
import { cn } from "@/lib/utils";
import { LoaderCircle, Scale, TrendingDown, TrendingUp } from "lucide-react";

export function TrendIndicator({
  direction,
  isLoading = false,
  className,
}: {
  direction: TrendDirection | null;
  isLoading?: boolean;
  className?: string;
}) {
  if (isLoading) {
    return (
      <LoaderCircle
        className={cn(
          "text-muted-foreground size-3.5 shrink-0 animate-spin",
          className,
        )}
      />
    );
  }

  if (!direction) return null;

  const Icon =
    direction === "up"
      ? TrendingUp
      : direction === "down"
        ? TrendingDown
        : Scale;
  const color =
    direction === "up"
      ? "text-rose-500"
      : direction === "down"
        ? "text-emerald-500"
        : "text-amber-500";

  return <Icon className={cn("size-3.5", color, className)} />;
}
