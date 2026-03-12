"use client";

import { DesktopLayout } from "@/components/DesktopLayout";
import { MobileLayout } from "@/components/MobileLayout";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Toaster } from "sonner";

export default function Home() {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <main className="bg-background relative flex h-dvh w-full flex-col overflow-hidden">
      <Toaster position="bottom-center" richColors />
      {isDesktop ? <DesktopLayout /> : <MobileLayout />}
    </main>
  );
}
