import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { PriceMarker, Shell } from "../../../kit/components";
import { Sfx } from "../../../kit/sfx";
import type { ShortProps } from "../data";
import { C, FONT } from "../../../kit/theme";

export const Hook: React.FC<Pick<ShortProps, "local">> = ({ local }) => {
  const frame = useCurrentFrame();

  return (
    <Shell>
      <Sfx cue="select" at={44} />
      <Sfx cue="press" at={58} volume={0.35} />
      <Sfx cue="press" at={63} volume={0.35} />
      <Sfx cue="press" at={68} volume={0.35} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 56,
          left: 80,
          position: "absolute",
          right: 80,
          top: 470,
        }}
      >
        {/* Lisible dès la première image : c'est elle qui sert de vignette. */}
        <Interactive.Div
          name="Accroche — constat"
          style={{
            fontFamily: FONT.heading,
            fontSize: 112,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            opacity: interpolate(frame, [42, 54], [1, 0.35], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            translate: interpolate(frame, [0, 14], ["0px 50px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          Le prix de l’essence, on ne le choisit pas.
        </Interactive.Div>
        <Interactive.Div
          name="Accroche — chute"
          style={{
            color: C.primary,
            fontFamily: FONT.heading,
            fontSize: 150,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            transformOrigin: "left center",
            opacity: interpolate(frame, [44, 52], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            scale: interpolate(frame, [44, 62], [0.8, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.34, 1.56, 0.64, 1),
              output: "perceptual-scale",
            }),
          }}
        >
          Sa station, si.
        </Interactive.Div>
      </div>

      <div
        style={{
          alignItems: "center",
          display: "flex",
          gap: 34,
          left: 80,
          position: "absolute",
          top: 1290,
        }}
      >
        {[
          { price: local.max, level: "bad" as const, at: 58 },
          { price: local.stations[0].price, level: "neutral" as const, at: 63 },
          { price: local.min, level: "good" as const, at: 68 },
        ].map(({ price, level, at }) => (
          <div
            key={level}
            style={{
              opacity: interpolate(frame, [at, at + 6], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              scale: interpolate(frame, [at, at + 12], [0.6, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.34, 1.56, 0.64, 1),
              }),
            }}
          >
            <PriceMarker
              price={price}
              level={level}
              best={level === "good"}
              fontSize={48}
            />
          </div>
        ))}
      </div>
    </Shell>
  );
};
