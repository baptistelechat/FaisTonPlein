import { cn } from "@/lib/utils";

interface PulseMarkerProps {
  color?: string;
  pingColor?: string;
  tooltip?: string;
}

export function PulseMarker({
  color = "bg-indigo-600",
  pingColor = "bg-indigo-500",
  tooltip,
}: PulseMarkerProps) {
  return (
    <div className="group relative flex size-6 items-center justify-center">
      <span
        className={cn(
          "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 duration-1000",
          pingColor,
        )}
      ></span>
      <div
        className={cn(
          "relative inline-flex h-4 w-4 rounded-full border-[3px] border-white shadow-lg ring-1 ring-black/10",
          color,
        )}
      ></div>
      {tooltip && (
        <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-black/80 px-2 py-1 text-[10px] font-bold whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
          {tooltip}
        </div>
      )}
    </div>
  );
}
