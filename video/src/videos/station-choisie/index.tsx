import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Music } from "../../kit/music";
import { SfxPackContext } from "../../kit/sfx";
import type { ShortProps } from "./data";
import { Compare } from "./scenes/Compare";
import { Detour } from "./scenes/Detour";
import { Hook } from "./scenes/Hook";
import { Outro } from "./scenes/Outro";
import { Trend } from "./scenes/Trend";

// 102 + 252 + 252 + 252 + 90 − 4 fondus de 12 images = 900 images (30 s).
export const StationChoisie: React.FC<ShortProps> = ({
  sfxPack,
  music,
  musicVolume,
  local,
  detour,
  national,
}) => {
  return (
    <SfxPackContext.Provider value={sfxPack}>
      <Music choice={music} volume={musicVolume} />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={102} name="Accroche">
          <Hook local={local} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence
          durationInFrames={252}
          name="Astuce 1 — Comparer"
        >
          <Compare local={local} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence
          durationInFrames={252}
          name="Astuce 2 — Détour"
        >
          <Detour local={local} detour={detour} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence
          durationInFrames={252}
          name="Astuce 3 — Tendance"
        >
          <Trend national={national} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence durationInFrames={90} name="Outro">
          <Outro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </SfxPackContext.Provider>
  );
};
