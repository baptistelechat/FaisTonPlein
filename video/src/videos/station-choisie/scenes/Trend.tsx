import { formatDelta, isFlat } from "@/lib/nationalPrices";
import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { FuelBadge, Icon, Shell, TipHeader } from "../../../kit/components";
import { Sfx } from "../../../kit/sfx";
import type { ShortProps } from "../data";
import { C, FONT, LEVEL, fr } from "../../../kit/theme";

const CHART_WIDTH = 840;
const CHART_HEIGHT = 380;
const DAY_MS = 86_400_000;
// En dessous d'un demi-centime sur 7 jours, on ne parle ni de hausse ni de baisse.
const RECENT_THRESHOLD = 0.005;

const time = (date: string) => new Date(`${date}T00:00:00Z`).getTime();

const shortDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

const Rule: React.FC<{
  icon: "trendingUp" | "trendingDown";
  color: string;
  active: boolean;
  at: number;
  children: React.ReactNode;
}> = ({ icon, color, active, at, children }) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        alignItems: "center",
        backgroundColor: active ? C.card : "transparent",
        border: `3px solid ${active ? color : "transparent"}`,
        borderRadius: 30,
        boxShadow: active ? "0 14px 34px rgba(15,23,43,0.10)" : "none",
        display: "flex",
        fontSize: 50,
        fontWeight: 700,
        gap: 24,
        padding: "26px 32px",
        opacity:
          interpolate(frame, [at, at + 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }) * (active ? 1 : 0.45),
        translate: interpolate(frame, [at, at + 16], ["0px 30px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      }}
    >
      <Icon name={icon} size={64} color={color} strokeWidth={2.6} />
      <span>{children}</span>
    </div>
  );
};

export const Trend: React.FC<Pick<ShortProps, "national">> = ({ national }) => {
  const frame = useCurrentFrame();
  if (!national || national.series.length < 2) return null;

  const { series } = national;
  const first = series[0];
  const last = series[series.length - 1];
  const values = series.map((p) => p.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const range = high - low || 1;

  const points = series.map((p) => ({
    ...p,
    x:
      ((time(p.date) - time(first.date)) /
        (time(last.date) - time(first.date))) *
      CHART_WIDTH,
    y: 70 + (1 - (p.value - low) / range) * (CHART_HEIGHT - 100),
  }));
  const line = points.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  const peak = points.reduce((a, b) => (b.value > a.value ? b : a));
  const end = points[points.length - 1];
  const showPeak = peak !== end && peak !== points[0];

  // Tendance récente : dernier point contre le plus récent vieux d'au moins 7 jours.
  const weekAgo = [...series]
    .reverse()
    .find((p) => time(last.date) - time(p.date) >= 7 * DAY_MS);
  const recent = weekAgo ? last.value - weekAgo.value : 0;
  const direction =
    recent > RECENT_THRESHOLD
      ? "up"
      : recent < -RECENT_THRESHOLD
        ? "down"
        : null;

  const draw = interpolate(frame, [30, 110], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const delta = national.delta;
  const deltaTone =
    delta == null || isFlat(delta)
      ? { text: C.muted, bg: "#f1f5f9" }
      : delta > 0
        ? { text: LEVEL.bad.text, bg: LEVEL.bad.bg }
        : { text: LEVEL.good.text, bg: LEVEL.good.bg };

  return (
    <Shell>
      <Sfx cue="swipe" at={0} volume={0.4} />
      <Sfx cue="warning" at={112} volume={0.35} />
      <Sfx cue="toggle-on" at={130} />
      <Sfx cue="toggle-on" at={142} />
      <TipHeader index={3}>Choisis ton moment</TipHeader>

      <div
        style={{
          backgroundColor: C.card,
          border: `2px solid ${C.border}`,
          borderRadius: 48,
          boxShadow: "0 20px 50px rgba(15,23,43,0.10)",
          display: "flex",
          flexDirection: "column",
          gap: 26,
          left: 80,
          padding: 40,
          position: "absolute",
          right: 80,
          top: 460,
          opacity: interpolate(frame, [10, 22], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ alignItems: "center", display: "flex", gap: 16 }}>
              <FuelBadge fuel={national.fuel} fontSize={34} />
              <span style={{ color: C.muted, fontSize: 34, fontWeight: 500 }}>
                moyenne France
              </span>
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 96, lineHeight: 1 }}>
              {fr(national.avg, 3)}
              <span style={{ color: C.muted, fontSize: 40 }}> €/L</span>
            </div>
          </div>
          {delta == null ? null : (
            <div
              style={{
                alignItems: "flex-end",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                opacity: interpolate(frame, [112, 124], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              <div
                style={{
                  backgroundColor: deltaTone.bg,
                  borderRadius: 999,
                  color: deltaTone.text,
                  fontFamily: FONT.mono,
                  fontSize: 50,
                  lineHeight: 1,
                  padding: "14px 26px",
                }}
              >
                {formatDelta(delta)} €
              </div>
              <span style={{ color: C.muted, fontSize: 30, fontWeight: 500 }}>
                en {national.spanDays} jours
              </span>
            </div>
          )}
        </div>

        <svg
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.primary} stopOpacity={0.22} />
              <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
            </linearGradient>
            <clipPath id="trend-reveal">
              <rect width={CHART_WIDTH * draw} height={CHART_HEIGHT} />
            </clipPath>
          </defs>
          <line
            x1={0}
            x2={CHART_WIDTH}
            y1={CHART_HEIGHT}
            y2={CHART_HEIGHT}
            stroke={C.border}
            strokeWidth={3}
          />
          <g clipPath="url(#trend-reveal)">
            <path
              d={`${line} L${CHART_WIDTH} ${CHART_HEIGHT} L0 ${CHART_HEIGHT} Z`}
              fill="url(#trend-area)"
            />
            <path
              d={line}
              fill="none"
              stroke={C.primary}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={8}
            />
          </g>
          {showPeak ? (
            <g
              opacity={interpolate(frame, [112, 122], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}
            >
              <circle
                cx={peak.x}
                cy={peak.y}
                r={14}
                fill={LEVEL.bad.border}
                stroke="#ffffff"
                strokeWidth={6}
              />
              <text
                x={peak.x}
                y={peak.y - 30}
                fill={LEVEL.bad.text}
                fontFamily={FONT.sans}
                fontSize={32}
                fontWeight={700}
                textAnchor="middle"
              >
                pic · {shortDate(peak.date)}
              </text>
            </g>
          ) : null}
          <circle
            cx={end.x}
            cy={end.y}
            r={14}
            fill={C.primary}
            stroke="#ffffff"
            strokeWidth={6}
            opacity={draw === 1 ? 1 : 0}
          />
        </svg>

        <div
          style={{
            color: C.muted,
            display: "flex",
            fontSize: 28,
            fontWeight: 500,
            justifyContent: "space-between",
          }}
        >
          <span>{shortDate(first.date)}</span>
          <span>{shortDate(last.date)}</span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          left: 80,
          position: "absolute",
          right: 80,
          top: 1196,
        }}
      >
        <Rule
          icon="trendingDown"
          color={LEVEL.good.border}
          active={direction !== "up"}
          at={130}
        >
          Ça baisse ? Attends un peu.
        </Rule>
        <Rule
          icon="trendingUp"
          color={LEVEL.bad.border}
          active={direction !== "down"}
          at={142}
        >
          Ça monte ? Fais le plein.
        </Rule>
      </div>

      <Interactive.Div
        name="Tendance du moment"
        style={{
          color: C.muted,
          fontSize: 34,
          fontWeight: 500,
          left: 80,
          position: "absolute",
          top: 1496,
          opacity: interpolate(frame, [160, 172], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {direction === "down"
          ? "En ce moment : ça redescend."
          : direction === "up"
            ? "En ce moment : ça monte."
            : "En ce moment : c’est stable."}
      </Interactive.Div>
    </Shell>
  );
};
