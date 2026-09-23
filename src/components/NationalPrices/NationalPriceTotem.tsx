"use client";

import { AppLogo } from "@/components/AppLogo";
import { useNationalPrices } from "@/hooks/useNationalPrices";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { NationalPriceCard } from "./NationalPriceCard";

// Totem à la manière des stations-service : les 6 moyennes nationales en colonne,
// pour se situer d'un coup d'œil par rapport aux prix locaux.
export function NationalPriceTotem({ className }: { className?: string }) {
  const national = useNationalPrices();
  const selectedFuel = useAppStore((s) => s.selectedFuel);

  return (
    <aside
      aria-label="Prix moyens nationaux"
      className={cn(
        "bg-background/80 flex w-56 flex-col gap-1.5 rounded-xl p-2 shadow-lg backdrop-blur-md",
        className,
      )}
    >
      {/* Enseigne en tête de totem, comme le logo au sommet d'un pylône de station */}
      <AppLogo
        size="lg"
        className="justify-center bg-transparent shadow-none backdrop-blur-none"
      />

      {national && (
        <>
          {national.prices.map((p) => (
            <NationalPriceCard
              key={p.fuel}
              {...p}
              isSelected={p.fuel === selectedFuel}
            />
          ))}

          <div className="px-1 pb-0.5 text-center leading-tight">
            <p className="text-muted-foreground text-xs font-semibold">
              Moyenne en France
            </p>
            {national.spanDays != null && (
              <p className="text-muted-foreground/80 text-[10px] font-semibold">
                Évolution sur {national.spanDays} jours
              </p>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
