"use client";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Download } from "lucide-react";

interface InstallButtonProps {
  variant?: "icon" | "full";
}

export function InstallButton({ variant = "icon" }: InstallButtonProps) {
  const { canInstall, install } = useInstallPrompt();

  if (!canInstall) return null;

  if (variant === "full") {
    return (
      <button
        onClick={install}
        aria-label="Installer l'application FaisTonPlein"
        title="Installer l'application"
        className="group bg-primary/90 hover:bg-primary hover:shadow-primary/30 flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 shadow-lg backdrop-blur-md transition-all duration-200 hover:shadow-xl active:scale-95"
      >
        <Download className="text-primary-foreground h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5" />
        <span className="font-heading text-primary-foreground text-sm font-bold tracking-tight">
          Installer
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={install}
      aria-label="Installer l'application FaisTonPlein"
      title="Installer l'application"
      className="group bg-primary/90 hover:bg-primary hover:shadow-primary/30 flex cursor-pointer items-center justify-center rounded-xl p-2 shadow-lg backdrop-blur-md transition-all duration-200 hover:shadow-xl active:scale-95"
    >
      <Download className="text-primary-foreground h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5" />
    </button>
  );
}
