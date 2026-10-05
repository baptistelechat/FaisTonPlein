import { calculateEffectiveCost } from "@/lib/utils";
import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { Icon, Shell, TipHeader } from "../../../kit/components";
import { Sfx } from "../../../kit/sfx";
import type { DetourStation, ShortProps } from "../data";
import {
  C,
  FONT,
  LEVEL,
  fr,
  priceLevel,
  type PriceLevel,
} from "../../../kit/theme";

// Carte station de la liste (StationList/StationCard) en tri « coût réel » :
// plein, trajet, total — calculés par la même fonction que l'app.
const StationCard: React.FC<{
  station: DetourStation;
  level: PriceLevel;
  tankLiters: number;
  consumption: number;
  top: number;
  enterAt: number;
  winner: boolean;
}> = ({ station, level, tankLiters, consumption, top, enterAt, winner }) => {
  const frame = useCurrentFrame();
  const cost = calculateEffectiveCost({
    pricePerLiter: station.price,
    distanceKm: station.km,
    fillAmount: tankLiters,
    consumption,
  });
  const highlight = interpolate(frame, [170, 184], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <div
      style={{
        backgroundColor: C.card,
        border: `3px solid ${winner && highlight > 0 ? C.best : C.border}`,
        borderRadius: 36,
        boxShadow: `0 16px 40px rgba(15,23,43,${0.08 + (winner ? highlight * 0.1 : 0)})`,
        display: "flex",
        gap: 24,
        justifyContent: "space-between",
        left: 80,
        padding: "36px 40px",
        position: "absolute",
        right: 80,
        top,
        opacity:
          interpolate(frame, [enterAt, enterAt + 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }) * (winner ? 1 : 1 - highlight * 0.45),
        scale: winner ? String(1 + highlight * 0.03) : "1",
        translate: interpolate(
          frame,
          [enterAt, enterAt + 16],
          ["0px 50px", "0px 0px"],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          },
        ),
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          minWidth: 0,
        }}
      >
        <div style={{ fontSize: 42, fontWeight: 700, lineHeight: 1.15 }}>
          {station.address}
        </div>
        <div
          style={{
            alignItems: "center",
            color: C.primary,
            display: "flex",
            fontSize: 38,
            fontWeight: 700,
            gap: 10,
          }}
        >
          <Icon name="navigation" size={34} />
          {fr(station.km, 1)} km
          <span style={{ color: C.muted, fontWeight: 500 }}>
            · {station.city}
          </span>
        </div>
        {winner ? (
          <div
            style={{
              alignItems: "center",
              color: "#a65f00", // yellow-700 : lisible sur fond blanc
              display: "flex",
              fontSize: 36,
              fontWeight: 700,
              gap: 10,
              marginTop: 6,
              opacity: highlight,
            }}
          >
            <Icon
              name="calculator"
              size={36}
              color={C.best}
              strokeWidth={2.4}
            />
            Meilleur coût réel
          </div>
        ) : null}
      </div>

      <div
        style={{
          alignItems: "flex-end",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          gap: 8,
        }}
      >
        <div
          style={{
            color: LEVEL[level].text,
            fontFamily: FONT.mono,
            fontSize: 76,
            lineHeight: 1,
          }}
        >
          {fr(station.price, 3)}
          <span style={{ color: C.muted, fontSize: 32 }}> €/L</span>
        </div>
        <div
          style={{
            color: C.muted,
            fontSize: 34,
            fontWeight: 500,
            marginTop: 10,
            opacity: interpolate(frame, [78, 88], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Plein complet : {fr(cost.fillCost)} €
        </div>
        <div
          style={{
            color: C.muted,
            fontSize: 34,
            fontWeight: 500,
            opacity: interpolate(frame, [104, 114], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          + Trajet : {fr(cost.travelCost)} €
        </div>
        <div
          style={{
            borderTop: `2px solid ${C.border}`,
            fontSize: 46,
            fontWeight: 700,
            paddingTop: 8,
            opacity: interpolate(frame, [132, 142], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          = {fr(cost.total)} € total
        </div>
      </div>
    </div>
  );
};

export const Detour: React.FC<Pick<ShortProps, "local" | "detour">> = ({
  local,
  detour,
}) => {
  const frame = useCurrentFrame();

  return (
    <Shell>
      <Sfx cue="swipe" at={0} volume={0.4} />
      <Sfx cue="check" at={78} />
      <Sfx cue="check" at={104} />
      <Sfx cue="check" at={132} />
      <Sfx cue="complete" at={170} />
      <TipHeader index={2}>Compte le détour</TipHeader>

      <StationCard
        station={detour.far}
        level={priceLevel(detour.far.price, local.p25, local.p75)}
        tankLiters={detour.tankLiters}
        consumption={detour.consumption}
        top={470}
        enterAt={16}
        winner={false}
      />
      <StationCard
        station={detour.near}
        level={priceLevel(detour.near.price, local.p25, local.p75)}
        tankLiters={detour.tankLiters}
        consumption={detour.consumption}
        top={830}
        enterAt={24}
        winner
      />

      <div
        style={{
          color: C.muted,
          fontSize: 32,
          fontWeight: 500,
          left: 80,
          position: "absolute",
          top: 1196,
          opacity: interpolate(frame, [78, 90], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Berline · plein de {detour.tankLiters} L · {fr(detour.consumption, 1)}{" "}
        L/100 km
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          left: 80,
          position: "absolute",
          right: 80,
          top: 1262,
        }}
      >
        <Interactive.Div
          name="Constat détour"
          style={{
            fontFamily: FONT.heading,
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            opacity: interpolate(frame, [184, 194], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            translate: interpolate(frame, [184, 200], ["0px 30px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          Le prix au litre{" "}
          <span style={{ color: LEVEL.bad.text }}>ne dit pas tout.</span>
        </Interactive.Div>
      </div>
    </Shell>
  );
};
