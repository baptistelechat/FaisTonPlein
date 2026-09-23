import { HF_LATEST_BASE_URL } from "@/lib/constants";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt =
  "FaisTonPlein — prix moyens des carburants en France, mis à jour en continu";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// L'ETL republie metadata.json toutes les 2h ; 30 min suffit à rester frais
// sans régénérer l'image à chaque scrape.
export const revalidate = 1800;

const FUEL_ORDER = ["Gazole", "E10", "SP95", "SP98", "E85", "GPLc"] as const;
type Fuel = (typeof FUEL_ORDER)[number];

// Satori n'interprète pas oklch(), et Tailwind v4 ne publie plus que ça.
// Ces hex sont les équivalents sRGB exacts de resolveHex(fuel.color, 500) et (…, 600)
// — les deux shades qu'utilise FuelTypeSelector pour la pastille et le fond sélectionné.
// `ink` vient d'un contrôle de contraste : blanc sur slate-600 (7,6:1), sombre partout
// ailleurs, car yellow-600 + blanc tombe à 2,9:1.
const FUEL_HEX: Record<Fuel, { badge: string; ink: string }> = {
  Gazole: { badge: "#d08700", ink: "#0a0a0a" },
  E10: { badge: "#00a63e", ink: "#0a0a0a" },
  SP95: { badge: "#009966", ink: "#0a0a0a" },
  SP98: { badge: "#009966", ink: "#0a0a0a" },
  E85: { badge: "#0084d1", ink: "#0a0a0a" },
  GPLc: { badge: "#45556c", ink: "#f8fafc" },
};

const UP = "#ff2056"; // rose-500 — une hausse de prix est une mauvaise nouvelle
const DOWN = "#00bc7d"; // emerald-500
const FLAT = "#a1a1aa"; // zinc-400 — prix stable, ni bonne ni mauvaise nouvelle

const DAY_MS = 86_400_000;
const TARGET_DAYS = 21; // fenêtre visée pour l'évolution
const MIN_DAYS = 7; // en dessous, le delta ne veut rien dire : on n'affiche rien

interface Metadata {
  total_stations?: number;
  fuel_stats?: Partial<Record<Fuel, { avg: number | null; stations: number }>>;
  fuel_history?: { date: string; [fuel: string]: string | number }[];
}

const daysAgo = (date: string) =>
  Math.round((Date.now() - new Date(`${date}T00:00:00Z`).getTime()) / DAY_MS);

const formatPrice = (n: number) => n.toFixed(3);

// 3 décimales, comme les prix : un écart de 0,003 € reste une information.
const formatDelta = (d: number) =>
  `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(3).replace(".", ",")}`;

// En dessous, l'arrondi à 3 décimales donne "0,000" : c'est un équilibre, pas une hausse.
const FLAT_THRESHOLD = 0.0005;
const isFlat = (d: number) => Math.abs(d) < FLAT_THRESHOLD;

// Intl peut manquer de locale selon le runtime : espace fine posée à la main.
const groupThousands = (n: number) =>
  String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

// readFile et pas fetch(new URL(..., import.meta.url)) : Turbopack ne sait pas
// résoudre un file:// ("not implemented... yet...") et le build échoue au prerender.
// L'inclusion des .woff dans le bundle serverless est garantie par
// outputFileTracingIncludes (next.config.ts).
const loadFont = (file: string) =>
  readFile(join(process.cwd(), "src", "app", "_og-fonts", file));

// Définis au niveau module : react-doctor signale (à juste titre en général)
// qu'un composant imbriqué est recréé à chaque render. Ici Satori ne rend qu'une
// fois, mais aucun des trois ne capture de variable locale — autant les sortir.
const Logo = ({ s }: { s: number }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 512 512"
    style={{ borderRadius: s * 0.26 }}
  >
    <rect width="512" height="512" rx="108" fill="#4f46e5" />
    <g
      transform="translate(106,106) scale(12.5)"
      stroke="#f8fafc"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0v-6.998a2 2 0 0 0-.59-1.42L18 5" />
      <path d="M14 21V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16" />
      <path d="M2 21h13" />
      <path d="M3 9h11" />
    </g>
  </svg>
);

const Arrow = ({ up }: { up: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke={up ? UP : DOWN}
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={up ? "M7 17 17 7M9 7h8v8" : "M7 7 17 17M17 9v8h-8"} />
  </svg>
);

const Tile = ({
  fuel,
  avg,
  delta,
}: {
  fuel: Fuel;
  avg: number | null;
  delta: number | null;
}) => (
  <div
    style={{
      backgroundColor: "#111114",
      border: "1px solid rgba(250,250,250,0.1)",
      borderRadius: 18,
      display: "flex",
      // Satori n'applique pas le raccourci `flex: 1` comme un navigateur : sans
      // flexBasis/minWidth explicites, les tuiles se chevauchent au lieu de se partager
      // la largeur.
      flexGrow: 1,
      flexBasis: 0,
      minWidth: 0,
      flexDirection: "column",
      padding: 20,
    }}
  >
    <div
      style={{
        alignItems: "center",
        backgroundColor: FUEL_HEX[fuel].badge,
        borderRadius: 7,
        color: FUEL_HEX[fuel].ink,
        display: "flex",
        fontFamily: "Manrope",
        fontSize: 20,
        justifyContent: "center",
        letterSpacing: "0.03em",
        padding: "6px 0",
        width: 118,
      }}
    >
      {fuel.toUpperCase()}
    </div>
    <div
      style={{
        alignItems: "center",
        display: "flex",
        gap: 14,
        marginTop: 14,
      }}
    >
      <div
        style={{
          color: "#fafafa",
          display: "flex",
          fontFamily: "ShareTechMono",
          fontSize: 50,
        }}
      >
        {avg == null ? "—" : formatPrice(avg)}
      </div>
      {delta == null ? null : isFlat(delta) ? (
        <div
          style={{
            alignItems: "center",
            backgroundColor: "rgba(250,250,250,0.07)",
            borderRadius: 999,
            color: FLAT,
            display: "flex",
            fontFamily: "Manrope",
            fontSize: 20,
            padding: "5px 14px",
          }}
        >
          =
        </div>
      ) : (
        <div
          style={{
            alignItems: "center",
            backgroundColor:
              delta > 0 ? "rgba(255,32,86,0.15)" : "rgba(0,188,125,0.18)",
            borderRadius: 999,
            color: delta > 0 ? UP : DOWN,
            display: "flex",
            fontFamily: "Manrope",
            fontSize: 20,
            gap: 5,
            padding: "5px 12px",
          }}
        >
          <Arrow up={delta > 0} />
          {formatDelta(delta)}
        </div>
      )}
    </div>
  </div>
);

export default async function Image() {
  const [mono, sans, display] = await Promise.all([
    loadFont("share-tech-mono-latin-400-normal.woff"),
    loadFont("manrope-latin-700-normal.woff"),
    loadFont("space-grotesk-latin-700-normal.woff"),
  ]);

  let meta: Metadata = {};
  try {
    const res = await fetch(`${HF_LATEST_BASE_URL}/metadata.json`, {
      next: { revalidate },
    });
    if (res.ok) meta = (await res.json()) as Metadata;
  } catch {
    // On dégrade proprement plus bas plutôt que de casser le partage du lien.
  }

  const history = Array.isArray(meta.fuel_history) ? meta.fuel_history : [];

  // Point de référence : le plus proche de 21 jours parmi ceux d'au moins 7 jours.
  // Tant que l'historique est trop jeune, aucune flèche n'est affichée.
  const reference =
    history
      .filter((p) => daysAgo(p.date) >= MIN_DAYS)
      .sort(
        (a, b) =>
          Math.abs(daysAgo(a.date) - TARGET_DAYS) -
          Math.abs(daysAgo(b.date) - TARGET_DAYS),
      )[0] ?? null;
  const spanDays = reference ? daysAgo(reference.date) : 0;

  const tiles = FUEL_ORDER.map((fuel) => {
    const avg = meta.fuel_stats?.[fuel]?.avg ?? null;
    const past = reference?.[fuel];
    // null = pas de point de référence (pastille absente).
    // ~0 = prix stable, rendu par un "=" neutre plutôt qu'une flèche trompeuse.
    const delta = avg != null && typeof past === "number" ? avg - past : null;
    return { fuel, avg, delta };
  }).filter((t) => t.avg != null);

  const subtitle = reference
    ? `· prix moyens · évolution sur ${spanDays} jours`
    : "· prix moyens des 6 carburants";


  return new ImageResponse(
    <div
      style={{
        backgroundColor: "#09090b",
        backgroundImage:
          "radial-gradient(circle at 50% 0%, rgba(79,70,229,0.22), transparent 60%)",
        color: "#fafafa",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "center",
        padding: "76px 72px",
        width: "100%",
      }}
    >
      <div style={{ alignItems: "center", display: "flex", gap: 16 }}>
        <Logo s={54} />
        <div
          style={{
            display: "flex",
            fontFamily: "SpaceGrotesk",
            fontSize: 40,
            letterSpacing: "-0.02em",
          }}
        >
          FaisTonPlein
        </div>
        <div
          style={{
            color: "#71717a",
            display: "flex",
            fontFamily: "Manrope",
            fontSize: 25,
            marginLeft: 8,
          }}
        >
          {subtitle}
        </div>
      </div>

      {tiles.length === 0 ? (
        <div
          style={{
            display: "flex",
            fontFamily: "SpaceGrotesk",
            fontSize: 56,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            marginTop: 48,
            maxWidth: 940,
          }}
        >
          Trouvez la station-service la moins chère près de chez vous.
        </div>
      ) : (
        // Un div wrapper et pas un Fragment : Satori aplatit mal les Fragments et
        // les deux rangées se retrouvaient fusionnées en une seule ligne.
        <div
          style={{ display: "flex", flexDirection: "column", marginTop: 28 }}
        >
          <div style={{ display: "flex", gap: 18 }}>
            {tiles.slice(0, 3).map((t) => (
              <Tile key={t.fuel} {...t} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 18 }}>
            {tiles.slice(3, 6).map((t) => (
              <Tile key={t.fuel} {...t} />
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          color: "#71717a",
          display: "flex",
          fontFamily: "Manrope",
          fontSize: 25,
          marginTop: 26,
        }}
      >
        {meta.total_stations
          ? `${groupThousands(meta.total_stations)} stations comparées en temps réel, partout en France.`
          : "Comparez les prix des carburants en temps réel, partout en France."}
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "ShareTechMono", data: mono, weight: 400, style: "normal" },
        { name: "Manrope", data: sans, weight: 700, style: "normal" },
        { name: "SpaceGrotesk", data: display, weight: 700, style: "normal" },
      ],
    },
  );
}
