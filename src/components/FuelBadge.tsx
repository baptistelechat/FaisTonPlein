import { FUEL_TYPES } from "@/lib/constants";
import { resolveHex } from "@/lib/fuelColors";
import { cn } from "@/lib/utils";

// Pastille pleine, identique au carburant sélectionné dans FuelTypeSelector :
// teinte 600 + texte blanc (contraste suffisant sur toutes les teintes, y compris jaune).
export const FuelBadge = ({
  fuel,
  className,
}: {
  fuel: string;
  className?: string;
}) => {
  const color = FUEL_TYPES.find((f) => f.type === fuel)?.color ?? "slate";

  return (
    <span
      className={cn(
        "font-heading inline-flex items-center rounded-md px-2.5 py-1 text-xs leading-none font-medium text-white",
        className,
      )}
      style={{ backgroundColor: resolveHex(color, 600) }}
    >
      {fuel}
    </span>
  );
};
