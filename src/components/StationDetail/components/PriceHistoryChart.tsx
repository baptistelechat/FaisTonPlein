"use client";

import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { FuelType } from "@/lib/constants";
import type { PriceHistoryPoint } from "@/lib/priceHistory";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

interface PriceHistoryChartProps {
  data: PriceHistoryPoint[];
  isLoading: boolean;
  selectedFuel: FuelType;
}

const chartConfig = {
  price: {
    label: "Prix",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function PriceHistoryChart({
  data,
  isLoading,
  selectedFuel,
}: PriceHistoryChartProps) {
  if (isLoading) return <Skeleton className="h-40 w-full rounded-md" />;

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">
        Aucune donnée historique disponible
      </p>
    );
  }

  const prices = data
    .map((d) => d.price)
    .filter((p): p is number => p !== null);
  const minPrice = Math.min(...prices) - 0.05;
  const maxPrice = Math.max(...prices) + 0.05;

  return (
    <ChartContainer config={chartConfig} className="h-40 w-full">
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(val: string) => val.slice(5)}
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
        <ChartTooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const [y, m, d] = (label as string).split("-");
            const price = payload[0]?.value;
            return (
              <div className="border-border/50 bg-background rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                <p className="mb-1 font-medium">{`${d}/${m}/${y}`}</p>
                <div className="flex items-center gap-1.5">
                  <div className="size-2 shrink-0 rounded-xs bg-(--color-price)" />
                  <span className="text-muted-foreground">{selectedFuel}</span>
                  <span className="text-foreground ml-auto font-mono font-medium tabular-nums">
                    {Number(price).toFixed(3)} €/L
                  </span>
                </div>
              </div>
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke="var(--color-price)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
