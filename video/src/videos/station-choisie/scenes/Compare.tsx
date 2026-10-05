import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import {
  FuelBadge,
  PriceMarker,
  Shell,
  TipHeader,
} from "../../../kit/components";
import { Sfx } from "../../../kit/sfx";
import type { ShortProps } from "../data";
import { C, FONT, LEVEL, fr, priceLevel } from "../../../kit/theme";

const MAP_WIDTH = 920;
const MAP_HEIGHT = 660;
const KM_PER_DEG_LAT = 110.57;
const KM_PER_DEG_LON = 111.32;

export const Compare: React.FC<Pick<ShortProps, "local">> = ({ local }) => {
  const frame = useCurrentFrame();
  const pxPerKm = (MAP_HEIGHT / 2 - 30) / local.radiusKm;
  const [lat0, lon0] = local.center;
  const lonScale = Math.cos((lat0 * Math.PI) / 180) * KM_PER_DEG_LON;
  const gap = local.max - local.min;

  return (
    <Shell>
      <Sfx cue="swipe" at={0} volume={0.4} />
      {local.stations.map((station, i) => (
        <Sfx
          key={`${station.lat}-${station.lon}`}
          cue="press"
          at={40 + i * 5}
          volume={0.3}
        />
      ))}
      <Sfx cue="select" at={118} />
      <Sfx cue="success" at={172} />
      <TipHeader index={1}>Compare autour de toi</TipHeader>

      <div
        style={{
          backgroundColor: "#eef2f6",
          border: `2px solid ${C.border}`,
          borderRadius: 48,
          boxShadow: "0 20px 50px rgba(15,23,43,0.10)",
          height: MAP_HEIGHT,
          left: 80,
          overflow: "hidden",
          position: "absolute",
          top: 460,
          width: MAP_WIDTH,
          opacity: interpolate(frame, [10, 22], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {/* ponytail: fond de carte stylisé (pas de tuiles) ; les positions des stations, elles, sont réelles. */}
        <svg
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          style={{ position: "absolute" }}
        >
          <path
            d="M250 760 C 300 600, 380 520, 400 400 S 330 180, 420 -40"
            fill="none"
            stroke="#c7ddf2"
            strokeWidth={34}
          />
          <g fill="none" stroke="#ffffff" strokeLinecap="round">
            <ellipse cx={460} cy={330} rx={250} ry={195} strokeWidth={16} />
            <path d="M-20 300 L 940 250" strokeWidth={12} />
            <path d="M-20 560 L 940 470" strokeWidth={10} />
            <path d="M160 -20 L 300 740" strokeWidth={10} />
            <path d="M620 -20 L 560 740" strokeWidth={12} />
            <path d="M460 330 L 940 60" strokeWidth={10} />
            <path d="M460 330 L 940 700" strokeWidth={10} />
            <path d="M460 330 L -20 80" strokeWidth={10} />
          </g>
          <circle
            cx={MAP_WIDTH / 2}
            cy={MAP_HEIGHT / 2}
            r={interpolate(frame, [18, 44], [0, local.radiusKm * pxPerKm], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            })}
            fill="rgba(79,57,246,0.07)"
            stroke={C.primary}
            strokeDasharray="14 12"
            strokeWidth={4}
          />
          <circle
            cx={MAP_WIDTH / 2}
            cy={MAP_HEIGHT / 2}
            r={30 + ((frame % 40) / 40) * 30}
            fill={C.primary}
            opacity={0.3 * (1 - (frame % 40) / 40)}
          />
          <circle
            cx={MAP_WIDTH / 2}
            cy={MAP_HEIGHT / 2}
            r={16}
            fill={C.primary}
            stroke="#ffffff"
            strokeWidth={6}
          />
        </svg>

        {local.stations.map((station, i) => {
          const at = 40 + i * 5;
          const isBest = station.price === local.min;
          const isWorst = station.price === local.max;
          const spotlight = isBest || isWorst;

          return (
            <div
              key={`${station.lat}-${station.lon}`}
              style={{
                left: MAP_WIDTH / 2 + (station.lon - lon0) * lonScale * pxPerKm,
                position: "absolute",
                top:
                  MAP_HEIGHT / 2 -
                  (station.lat - lat0) * KM_PER_DEG_LAT * pxPerKm,
                translate: "-50% -100%",
                transformOrigin: "50% 100%",
                zIndex: spotlight ? 2 : 1,
                // Une fois tous les marqueurs posés, seuls les deux extrêmes restent nets.
                opacity:
                  interpolate(frame, [at, at + 6], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }) *
                  (spotlight
                    ? 1
                    : interpolate(frame, [118, 132], [1, 0.3], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      })),
                scale:
                  interpolate(frame, [at, at + 12], [0.4, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
                  }) *
                  (spotlight
                    ? interpolate(frame, [118, 134], [1, 1.3], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                        easing: Easing.bezier(0.34, 1.56, 0.64, 1),
                      })
                    : 1),
              }}
            >
              <PriceMarker
                price={station.price}
                level={priceLevel(station.price, local.p25, local.p75)}
                best={isBest && frame >= 118}
              />
            </div>
          );
        })}
      </div>

      <div
        style={{
          alignItems: "center",
          color: C.muted,
          display: "flex",
          fontSize: 34,
          fontWeight: 500,
          gap: 16,
          left: 80,
          position: "absolute",
          top: 1142,
          opacity: interpolate(frame, [30, 42], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <FuelBadge fuel={local.fuel} fontSize={30} />
        {local.count} stations · {local.radiusKm} km autour de {local.city} ·{" "}
        {local.date}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          left: 80,
          position: "absolute",
          right: 80,
          top: 1210,
        }}
      >
        <Interactive.Div
          name="Écart de prix"
          style={{
            fontFamily: FONT.heading,
            fontSize: 92,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            opacity: interpolate(frame, [128, 138], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            translate: interpolate(frame, [128, 144], ["0px 30px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          <span style={{ color: LEVEL.bad.text }}>
            {Math.round(
              interpolate(frame, [130, 160], [0, gap * 100], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic),
              }),
            )}{" "}
            centimes
          </span>{" "}
          d’écart au litre.
        </Interactive.Div>
        <Interactive.Div
          name="Économie par plein"
          style={{
            color: LEVEL.good.text,
            fontSize: 52,
            fontWeight: 700,
            opacity: interpolate(frame, [172, 184], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            translate: interpolate(frame, [172, 188], ["0px 24px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          Soit {fr(gap * 50)} € sur un plein de 50 L.
        </Interactive.Div>
      </div>
    </Shell>
  );
};
