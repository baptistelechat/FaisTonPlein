import { Audio } from "@remotion/media";
import { createContext, useContext } from "react";

// Bruitages UI SFX (audio CC0) : 12 packs × 78 repères, catalogue sur https://uisfx.com.
// Un repère se désigne par son nom de fichier (« toggle-on », « swipe »…).
export const SFX_PACKS = [
  "arcade",
  "cinematic",
  "dreamy",
  "glass",
  "mechanical",
  "minimal",
  "organic",
  "rubber",
  "scifi",
  "soft",
  "studio",
  "zen",
] as const;

export type SfxPack = (typeof SFX_PACKS)[number];

// Chemin relatif : le champ « exports » du paquet n'expose pas le dossier sounds/ en entier.
const sounds = require.context(
  "../../node_modules/uisfx/sounds",
  true,
  /\.mp3$/,
);

// Le pack est une prop de la vidéo : il se change dans le Studio pour comparer à l'oreille.
export const SfxPackContext = createContext<SfxPack>("soft");

// Volume bas par défaut : une musique sera posée par-dessus à la publication.
export const Sfx: React.FC<{
  cue: string;
  at: number;
  volume?: number;
}> = ({ cue, at, volume = 0.5 }) => {
  const pack = useContext(SfxPackContext);
  const key = `./${pack}/${cue}.mp3`;
  if (!sounds.keys().includes(key)) {
    throw new Error(`Bruitage inconnu : ${pack}/${cue}`);
  }
  const source = sounds(key);

  return (
    <Audio
      key={key}
      src={typeof source === "string" ? source : source.default}
      from={at}
      volume={volume}
    />
  );
};
