import type { ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { C, FONT, LEVEL, fr, type PriceLevel } from "./theme";

// Tracés Lucide, les mêmes icônes que l'app (lucide-react n'est pas installé ici).
const ICONS = {
  fuel: [
    "M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0v-6.998a2 2 0 0 0-.59-1.42L18 5",
    "M14 21V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16",
    "M2 21h13",
    "M3 9h11",
  ],
  euro: [
    "M4 10h12",
    "M4 14h9",
    "M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2",
  ],
  calculator: [
    "M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z",
    "M8 6h8",
    "M16 14v4",
    "M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01",
  ],
  navigation: ["M3 11 22 2 13 21 11 13 3 11z"],
  trendingUp: ["M16 7h6v6", "m22 7-8.5 8.5-5-5L2 17"],
  trendingDown: ["M16 17h6v-6", "m22 17-8.5-8.5-5 5L2 7"],
};

export const Icon: React.FC<{
  name: keyof typeof ICONS;
  size: number;
  color?: string;
  strokeWidth?: number;
}> = ({ name, size, color = "currentColor", strokeWidth = 2 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    {ICONS[name].map((d) => (
      <path key={d} d={d} />
    ))}
  </svg>
);

export const Logo: React.FC<{ size: number }> = ({ size }) => (
  <div
    style={{
      alignItems: "center",
      backgroundColor: C.primary,
      borderRadius: size * 0.21,
      display: "flex",
      flexShrink: 0,
      height: size,
      justifyContent: "center",
      width: size,
    }}
  >
    <Icon name="fuel" size={size * 0.58} color="#f8fafc" strokeWidth={1.5} />
  </div>
);

// Fond clair de l'app + pastille de marque (AppLogo) en haut, comme sur la carte.
export const Shell: React.FC<{ children: ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      backgroundColor: C.background,
      backgroundImage:
        "radial-gradient(circle at 50% 0%, rgba(79,57,246,0.16), transparent 55%)",
      color: C.foreground,
      fontFamily: FONT.sans,
    }}
  >
    <div
      style={{
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.85)",
        borderRadius: 28,
        boxShadow: "0 10px 30px rgba(15,23,43,0.10)",
        display: "flex",
        gap: 18,
        left: 80,
        padding: "16px 26px 16px 16px",
        position: "absolute",
        top: 110,
      }}
    >
      <Logo size={64} />
      <span
        style={{
          fontFamily: FONT.heading,
          fontSize: 40,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        FaisTonPlein
      </span>
    </div>
    {children}
  </AbsoluteFill>
);

export const TipHeader: React.FC<{ index: number; children: ReactNode }> = ({
  index,
  children,
}) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 22,
        left: 80,
        position: "absolute",
        right: 80,
        top: 250,
      }}
    >
      <Interactive.Div
        name="Numéro d'astuce"
        style={{
          alignSelf: "flex-start",
          backgroundColor: C.primary,
          borderRadius: 999,
          color: "#ffffff",
          fontFamily: FONT.heading,
          fontSize: 34,
          fontWeight: 700,
          letterSpacing: "0.06em",
          padding: "10px 26px",
          opacity: interpolate(frame, [0, 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        ASTUCE {index}/3
      </Interactive.Div>
      <Interactive.Div
        name="Titre de l'astuce"
        style={{
          fontFamily: FONT.heading,
          fontSize: 88,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1.05,
          opacity: interpolate(frame, [4, 16], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [4, 22], ["0px 40px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        {children}
      </Interactive.Div>
    </div>
  );
};

export const FuelBadge: React.FC<{ fuel: string; fontSize: number }> = ({
  fuel,
  fontSize,
}) => (
  <span
    style={{
      backgroundColor: "#d08700", // yellow-600, teinte du Gazole dans FuelBadge
      borderRadius: fontSize * 0.3,
      color: "#ffffff",
      fontFamily: FONT.heading,
      fontSize,
      fontWeight: 700,
      lineHeight: 1,
      padding: `${fontSize * 0.3}px ${fontSize * 0.5}px`,
    }}
  >
    {fuel}
  </span>
);

// Marqueur de prix de la carte (InteractiveMap/PriceMarker), agrandi pour la vidéo.
export const PriceMarker: React.FC<{
  price: number;
  level: PriceLevel;
  best?: boolean;
  fontSize?: number;
}> = ({ price, level, best = false, fontSize = 34 }) => {
  const frame = useCurrentFrame();
  const tone = LEVEL[level];
  const ping = (frame % 30) / 30;

  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {best ? (
        <div
          style={{
            backgroundColor: C.best,
            borderRadius: 999,
            height: fontSize * 2.4,
            opacity: 0.75 * (1 - ping),
            position: "absolute",
            scale: String(1 + ping * 1.4),
            width: fontSize * 2.4,
          }}
        />
      ) : null}
      <div
        style={{
          alignItems: "center",
          backgroundColor: tone.bg,
          border: `3px solid ${tone.border}`,
          borderRadius: fontSize * 0.4,
          boxShadow: "0 6px 16px rgba(15,23,43,0.14)",
          color: tone.text,
          display: "flex",
          gap: fontSize * 0.22,
          padding: `${fontSize * 0.26}px ${fontSize * 0.4}px`,
          position: "relative",
        }}
      >
        <Icon
          name={best ? "euro" : "fuel"}
          size={fontSize * 0.85}
          strokeWidth={2.4}
        />
        <span style={{ fontFamily: FONT.mono, fontSize, lineHeight: 1 }}>
          {fr(price, 3)}
        </span>
        <div
          style={{
            backgroundColor: tone.bg,
            borderBottom: `3px solid ${tone.border}`,
            borderRight: `3px solid ${tone.border}`,
            bottom: -fontSize * 0.24,
            height: fontSize * 0.36,
            left: "50%",
            position: "absolute",
            rotate: "45deg",
            translate: "-50% 0",
            width: fontSize * 0.36,
          }}
        />
      </div>
    </div>
  );
};
