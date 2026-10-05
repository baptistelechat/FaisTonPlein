import { Composition } from "remotion";
import { StationChoisie } from "./videos/station-choisie";
import { calculateMetadata, shortSchema } from "./videos/station-choisie/data";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="station-choisie"
      component={StationChoisie}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1920}
      schema={shortSchema}
      calculateMetadata={calculateMetadata}
      defaultProps={{
        sfxPack: "studio" as const,
        music: "Funky rythm — Yonael",
        musicVolume: 0.15,
        local: {
          city: "Toulouse",
          date: "5 oct. 2026",
          fuel: "Gazole" as const,
          radiusKm: 10,
          center: [43.6047, 1.4442],
          count: 48,
          min: 2.25,
          max: 2.59,
          p25: 2.375,
          p75: 2.434,
          stations: [{
            lat: 43.619,
            lon: 1.468,
            price: 2.417,
          }, {
            lat: 43.598,
            lon: 1.486,
            price: 2.499,
          }, {
            lat: 43.609,
            lon: 1.397,
            price: 2.395,
          }, {
            lat: 43.64,
            lon: 1.429,
            price: 2.385,
          }, {
            lat: 43.656,
            lon: 1.422,
            price: 2.59,
          }, {
            lat: 43.553,
            lon: 1.404,
            price: 2.25,
          }, {
            lat: 43.565,
            lon: 1.519,
            price: 2.375,
          }, {
            lat: 43.649,
            lon: 1.506,
            price: 2.499,
          }, {
            lat: 43.5751,
            lon: 1.456,
            price: 2.439,
          }, {
            lat: 43.647,
            lon: 1.368,
            price: 2.395,
          }],
        },
        detour: {
          tankLiters: 50,
          consumption: 6.5,
          far: {
            address: "Allée des Champs Pinsons",
            city: "Saint-Orens",
            price: 2.375,
            km: 7.47,
          },
          near: {
            address: "168 av. des États-Unis",
            city: "Toulouse",
            price: 2.385,
            km: 4.11,
          },
        },
        national: {
          fuel: "Gazole" as const,
          avg: 0,
          delta: 0,
          spanDays: 0,
          series: [{
            date: "",
            value: 0,
          }],
        },
      }}
    />
  );
};
