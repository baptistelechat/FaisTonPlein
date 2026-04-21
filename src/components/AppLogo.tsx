import { cn } from "@/lib/utils";
import Image from "next/image";

interface AppLogoProps {
  showName?: boolean;
  className?: string;
}

export function AppLogo({ showName = true, className }: AppLogoProps) {
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
        width={24}
        height={24}
        className="size-6"
      />
      {showName && (
        <span className="font-heading text-foreground text-sm font-bold tracking-tight">
          FaisTonPlein
        </span>
      )}
    </div>
  );
}
