import { cn } from "@/lib/utils";
import Image from "next/image";

interface AppLogoProps {
  showName?: boolean;
  size?: "default" | "lg";
  className?: string;
}

export function AppLogo({
  showName = true,
  size = "default",
  className,
}: AppLogoProps) {
  const isLarge = size === "lg";
  return (
    <div
      className={cn(
        "bg-background/80 flex items-center gap-2 rounded-xl shadow-lg backdrop-blur-md",
        showName ? "px-3 py-2" : "p-2",
        className,
      )}
    >
      <Image
        src="/icon.svg"
        alt="Logo FaisTonPlein"
        width={isLarge ? 32 : 24}
        height={isLarge ? 32 : 24}
        className={isLarge ? "size-8" : "size-6"}
      />
      {showName && (
        <span
          className={cn(
            "font-heading text-foreground font-bold tracking-tight",
            isLarge ? "text-xl" : "text-sm",
          )}
        >
          FaisTonPlein
        </span>
      )}
    </div>
  );
}
