"use client";

import { DesktopLayout } from "@/components/DesktopLayout";
import { MobileLayout } from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useAppStore } from "@/store/useAppStore";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Toaster } from "sonner";

export default function Home() {
  const isDesktop = useIsDesktop();
  const isApiAdresseUnavailable = useAppStore((s) => s.isApiAdresseUnavailable);

  return (
    <main className="bg-background relative flex h-dvh w-full flex-col overflow-hidden">
      <Toaster position="bottom-center" richColors />
      {isDesktop ? <DesktopLayout /> : <MobileLayout />}

      {isApiAdresseUnavailable && (
        <div className="bg-background/50 fixed inset-0 z-9999 flex flex-col items-center justify-center gap-4 backdrop-blur-md">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <div className="flex flex-col items-center gap-1 text-center">
            <h2 className="text-lg font-bold">
              Petit souci technique de notre côté…
            </h2>
            <p className="text-muted-foreground max-w-xs text-sm">
              Un service externe est temporairement en maintenance. Merci pour
              votre patience, revenez dans quelques instants.
            </p>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
        </div>
      )}
    </main>
  );
}
