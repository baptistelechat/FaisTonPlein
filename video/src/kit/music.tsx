import { Audio } from "@remotion/media";
import {
  getRemotionEnvironment,
  interpolate,
  staticFile,
  useVideoConfig,
} from "remotion";
import credits from "../../audio-credits.json";
import shortlist from "../../music-shortlist.json";

interface Track {
  title: string;
  artist: string;
  sourceUrl: string;
  // Présent une fois la piste téléchargée dans public/ et créditée.
  file?: string;
  previewUrl?: string;
}

export const NO_MUSIC = "aucune";
const PREVIEW_PREFIX = "aperçu · ";

const label = (track: Track) => `${track.title} — ${track.artist}`;

// Pistes créditées (fichier local) puis candidates du shortlist (écoute à distance,
// rien n'est téléchargé) : le Studio en fait une liste déroulante pour comparer à l'oreille.
const downloaded = credits as Track[];
const candidates = (shortlist as Track[]).filter(
  (track) => !downloaded.some((d) => d.sourceUrl === track.sourceUrl),
);

const TRACKS: Record<string, Track> = Object.fromEntries([
  ...downloaded.map((track) => [label(track), track] as const),
  ...candidates.map((track) => [PREVIEW_PREFIX + label(track), track] as const),
]);

export const MUSIC_CHOICES = [NO_MUSIC, ...Object.keys(TRACKS)] as [
  string,
  ...string[],
];

export const Music: React.FC<{ choice: string; volume: number }> = ({
  choice,
  volume,
}) => {
  const { durationInFrames } = useVideoConfig();
  const track = TRACKS[choice];
  if (!track) return null;

  // Un aperçu sert à choisir, pas à publier : la piste retenue doit d'abord être
  // téléchargée et créditée dans audio-credits.json.
  if (!track.file && getRemotionEnvironment().isRendering) {
    throw new Error(
      `« ${choice} » est un aperçu : télécharge et crédite la piste avant le rendu.`,
    );
  }
  const src = track.file ? staticFile(track.file) : track.previewUrl;
  if (!src) return null;

  return (
    <Audio
      key={src}
      src={src}
      volume={(f) =>
        interpolate(
          f,
          [0, 20, durationInFrames - 30, durationInFrames],
          [0, volume, volume, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        )
      }
    />
  );
};
