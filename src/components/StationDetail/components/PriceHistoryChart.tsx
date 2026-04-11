"use client";

import { ChartLine, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FUEL_TYPES, FuelColor, type FuelType } from "@/lib/constants";
import type { PriceHistoryPoint } from "@/lib/priceHistory";
import colors from "tailwindcss/colors";

interface PriceHistoryChartProps {
  data: PriceHistoryPoint[];
  isLoading: boolean;
  selectedFuel: FuelType;
  isRupture?: boolean;
}

function resolveHex(colorName: FuelColor, shade: number): string {
  const entry = (colors as unknown as Record<string, unknown>)[colorName];
  if (!entry) return "#64748b";
  if (typeof entry === "string") return entry;
  if (typeof entry === "object" && entry !== null) {
    return (entry as Record<number, string>)[shade] ?? "#64748b";
  }
  return "#64748b";
}

// Dérivé de FUEL_TYPES (source unique, comme FuelTypeSelector)
const FUEL_COLORS = Object.fromEntries(
  FUEL_TYPES.map((fuel) => [fuel.type, resolveHex(fuel.color, 500)]),
) as Record<FuelType, string>;

const TIME_RANGE_LABELS: Record<string, string> = {
  "7": "7 jours",
  "14": "14 jours",
  "30": "30 jours",
};

type TimeRange = "7" | "14" | "30";

interface AugmentedPoint extends PriceHistoryPoint {
  outagePrice: number | null;
}

function augmentWithOutageBridge(data: PriceHistoryPoint[]): AugmentedPoint[] {
  const result: AugmentedPoint[] = data.map((d) => ({
    ...d,
    outagePrice: null,
  }));
  let i = 0;
  while (i < data.length) {
    if (data[i].price === null) {
      const gapStart = i;
      while (i < data.length && data[i].price === null) i++;
      const gapEnd = i - 1;
      const priceBefore = gapStart > 0 ? data[gapStart - 1].price : null;
      const priceAfter = i < data.length ? data[i].price : null;
      const startVal = priceBefore ?? priceAfter ?? 0;
      const endVal = priceAfter ?? priceBefore ?? 0;
      if (gapStart > 0) result[gapStart - 1].outagePrice = priceBefore;
      const steps = gapEnd - gapStart + 1 + (priceAfter !== null ? 1 : 0);
      for (let j = gapStart; j <= gapEnd; j++) {
        result[j].outagePrice =
          startVal + ((j - gapStart + 1) / steps) * (endVal - startVal);
      }
    } else {
      i++;
    }
  }
  return result;
}

export function PriceHistoryChart({
  data,
  isLoading,
  selectedFuel,
  isRupture = false,
}: PriceHistoryChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30");

  if (isLoading) return <Skeleton className="h-48 w-full rounded-md" />;

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">
        Aucune donnée historique disponible
      </p>
    );
  }

  const days = parseInt(timeRange, 10);
  const filteredData =
    data.length > days ? data.slice(data.length - days) : data;
  const fuelColor = FUEL_COLORS[selectedFuel];

  const prices = filteredData
    .map((d) => d.price)
    .filter((p): p is number => p !== null);
  if (prices.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">
        Aucune donnée de prix disponible
      </p>
    );
  }
  const minPrice = Math.min(...prices) - 0.05;
  const maxPrice = Math.max(...prices) + 0.05;
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

  const deltaEuros =
    prices.length >= 2 ? prices[prices.length - 1] - prices[0] : null;
  const deltaPct =
    prices.length >= 2 && prices[0] !== 0
      ? ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100
      : null;

  const hasOutages = filteredData.some((d) => d.price === null);
  const chartData = augmentWithOutageBridge(filteredData);

  const chartConfig = {
    price: {
      label: `Prix ${selectedFuel}`,
      color: fuelColor,
    },
    outagePrice: {
      label: "Rupture",
      color: "rgb(239, 68, 68)",
    },
  } satisfies ChartConfig;

  return (
    <div className="space-y-1 select-none">
      <div className="flex items-center justify-between px-1">
        {/* Titre + delta €/L (%) + trending */}
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-bold tracking-wider uppercase">
          <ChartLine className="size-3.5 shrink-0" />
          Évolution du prix
          {!isRupture && deltaEuros !== null && deltaPct !== null && (
            <span
              className={`flex items-center gap-0.5 font-medium tracking-normal normal-case ${
                deltaPct < 0 ? "text-green-600" : "text-red-500"
              }`}
            >
              {deltaPct < 0 ? (
                <TrendingDown className="size-3.5" />
              ) : (
                <TrendingUp className="size-3.5" />
              )}
              {deltaEuros >= 0 ? "+" : ""}
              {deltaEuros.toFixed(3)} €/L
              <span className="text-muted-foreground font-normal">
                ({deltaPct >= 0 ? "+" : ""}
                {deltaPct.toFixed(1)}%)
              </span>
            </span>
          )}
        </p>

        <Select
          value={timeRange}
          onValueChange={(v) => setTimeRange(v as TimeRange)}
        >
          <SelectTrigger
            className="h-7 w-28 rounded-md text-xs"
            aria-label="Période"
          >
            {/* Affichage explicite pour éviter les quirks de SelectValue */}
            <SelectValue>{TIME_RANGE_LABELS[timeRange]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 jours</SelectItem>
            <SelectItem value="14">14 jours</SelectItem>
            <SelectItem value="30">30 jours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ChartContainer
        config={chartConfig}
        className="mt-4 h-56 w-full [&_*:focus]:[outline:none]"
      >
        <AreaChart
          key={`${selectedFuel}-${timeRange}`}
          tabIndex={-1}
          data={chartData}
          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="fillPrice" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-price)"
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor="var(--color-price)"
                stopOpacity={0.02}
              />
            </linearGradient>
            <linearGradient id="fillOutage" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-outagePrice)"
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor="var(--color-outagePrice)"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val: string) => {
              const [, m, d] = val.split("-");
              return `${d}/${m}`;
            }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v.toFixed(2)}€`}
            width={42}
          />
          <ReferenceLine
            y={avgPrice}
            stroke="currentColor"
            strokeDasharray="4 3"
            strokeWidth={1}
            strokeOpacity={0.3}
          />
          <ChartTooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const [y, m, d] = (label as string).split("-");
              const point = chartData.find((p) => p.date === label);
              const isOutage = point?.price === null;
              const priceEntry = payload.find((p) => p.dataKey === "price");
              const price = priceEntry?.value;
              if (!isOutage && price === undefined) return null;
              return (
                <div className="border-border/50 bg-background rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                  <p className="mb-1 font-medium">{`${d}/${m}/${y}`}</p>
                  {isOutage ? (
                    <div className="flex items-center gap-1.5">
                      <div className="size-2 shrink-0 rounded-xs bg-red-500" />
                      <span className="font-medium text-red-500">
                        Rupture de carburant
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div
                        className="size-2 shrink-0 rounded-xs"
                        style={{ background: fuelColor }}
                      />
                      <span className="text-muted-foreground">
                        {selectedFuel}
                      </span>
                      <span className="text-foreground ml-auto font-mono font-medium tabular-nums">
                        {Number(price).toFixed(3)} €/L
                      </span>
                    </div>
                  )}
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="var(--color-price)"
            strokeWidth={2}
            fill="url(#fillPrice)"
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />
          {hasOutages && (
            <Area
              type="monotone"
              dataKey="outagePrice"
              stroke="var(--color-outagePrice)"
              strokeWidth={2}
              strokeDasharray="5 4"
              fill="url(#fillOutage)"
              dot={false}
              activeDot={{
                r: 4,
                fill: "var(--color-outagePrice)",
                stroke: "transparent",
              }}
              connectNulls={false}
            />
          )}
          {/* Légende custom pour garantir l'ordre : prix du carburant → rupture estimée */}
          <ChartLegend
            content={({ payload }) => {
              if (!payload?.length) return null;
              const ordered = [
                payload.find((p) => p.dataKey === "price"),
                payload.find((p) => p.dataKey === "outagePrice"),
              ].filter(Boolean);
              return (
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-1">
                  {ordered.map((item) => {
                    if (!item) return null;
                    const key = item.dataKey as keyof typeof chartConfig;
                    return (
                      <div
                        key={String(item.dataKey)}
                        className="text-muted-foreground flex items-center gap-1.5 text-xs"
                      >
                        <div
                          className="size-2.5 shrink-0 rounded-xs"
                          style={{ background: String(item.color) }}
                        />
                        <span>{chartConfig[key]?.label}</span>
                      </div>
                    );
                  })}
                  <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <svg width="14" height="10" className="shrink-0">
                      <line
                        x1="0"
                        y1="5"
                        x2="14"
                        y2="5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                        strokeOpacity={0.5}
                      />
                    </svg>
                    <span>Moyenne</span>
                  </div>
                </div>
              );
            }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
