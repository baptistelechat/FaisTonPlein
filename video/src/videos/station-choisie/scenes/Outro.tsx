import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { Logo } from "../../../kit/components";
import { Sfx } from "../../../kit/sfx";
import { C, FONT } from "../../../kit/theme";

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        backgroundColor: C.background,
        backgroundImage:
          "radial-gradient(circle at 50% 35%, rgba(79,57,246,0.20), transparent 60%)",
        color: C.foreground,
        display: "flex",
        flexDirection: "column",
        fontFamily: FONT.sans,
        gap: 44,
        justifyContent: "center",
        padding: "0 80px 160px",
        textAlign: "center",
      }}
    >
      <Sfx cue="swipe" at={0} volume={0.4} />
      <Sfx cue="reward" at={30} />
      <div
        style={{
          scale: interpolate(frame, [4, 22], [0.5, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.34, 1.56, 0.64, 1),
          }),
          opacity: interpolate(frame, [4, 12], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <Logo size={240} />
      </div>
      <Interactive.Div
        name="Nom de l'app"
        style={{
          fontFamily: FONT.heading,
          fontSize: 120,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          opacity: interpolate(frame, [10, 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        FaisTonPlein
      </Interactive.Div>
      <Interactive.Div
        name="Slogan"
        style={{
          fontFamily: FONT.heading,
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          opacity: interpolate(frame, [18, 30], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [18, 34], ["0px 30px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Le prix, on ne le choisit pas.
        <br />
        <span style={{ color: C.primary }}>Sa station, si.</span>
      </Interactive.Div>
      <Interactive.Div
        name="Bouton URL"
        style={{
          backgroundColor: C.primary,
          borderRadius: 999,
          boxShadow: "0 18px 40px rgba(79,57,246,0.35)",
          color: "#ffffff",
          fontSize: 52,
          fontWeight: 700,
          marginTop: 20,
          padding: "30px 56px",
          opacity: interpolate(frame, [30, 40], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          scale: interpolate(frame, [30, 46], [0.85, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.34, 1.56, 0.64, 1),
          }),
        }}
      >
        faistonplein.vercel.app
      </Interactive.Div>
    </AbsoluteFill>
  );
};
