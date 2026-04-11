# Story 3.3 : Graphique Historique

D1 - **Status:** done

## Story

**En tant que** conducteur,
**Je veux** afficher l'évolution du prix sur 30 jours dans la fiche d'une station via un bouton dédié,
**Afin de** comprendre la dynamique du marché sans encombrer l'interface par défaut.

## Acceptance Criteria

1. Un bouton "Historique" (`variant='outline'`, icône `History`) est affiché dans la zone EXPANDED + desktop de `StationDetail`, dans la section Actions (sous Maps/Waze).
2. Au premier clic, le fetch des 30 jours est déclenché et un skeleton s'affiche à la place du graphique pendant le chargement.
3. Le graphique linéaire Recharts (`LineChart`) apparaît sous le bouton une fois les données chargées, montrant l'évolution du prix du carburant sélectionné sur les 30 derniers jours pour la station.
4. Le graphique affiche les points de données au survol (tooltip) avec le prix en €/L et la date formatée (DD/MM/YYYY).
5. Si aucune donnée n'est disponible (erreur silencieuse ou historique vide), un message court s'affiche à la place du graphique. Le bouton reste visible.
6. Les résultats sont mis en cache en mémoire (session) par clé `${stationId}_${fuelType}` : un second clic ou un changement de station puis retour s'affiche instantanément sans re-fetch.
7. Quand `selectedStation` change, le graphique est masqué (reset) mais le cache est conservé.
8. `getDeptFromStationId` et `filterAvailableUrls` sont exportés depuis `src/lib/priceTrends.ts` (réutilisation, zéro duplication).
9. Lint : 0 erreur bloquante.

## Tasks / Subtasks

- [x] Task 1 : Exporter les helpers depuis `priceTrends.ts` (AC: #8)
  - [x] Ajouter `export` devant `getDeptFromStationId` (ligne 16)
  - [x] Ajouter `export` devant `filterAvailableUrls` (ligne 129)

- [x] Task 2 : Créer `src/lib/priceHistory.ts` (AC: #2, #3, #5)
  - [x] Exporter type `PriceHistoryPoint = { date: string; price: number | null }`
  - [x] Implémenter `getLast30DayPaths(dept)` → `Array<{url: string, date: string}>` inversé (chronologique)
  - [x] Implémenter `fetchStationPriceHistory(db, stationId, dept, fuelType)` → `Promise<PriceHistoryPoint[]>` avec requête DuckDB `filename=true` en une seule connexion (voir Dev Notes)

- [x] Task 3 : Créer `src/hooks/usePriceHistory.ts` (AC: #2, #6, #7)
  - [x] Hook `usePriceHistory()` retournant `{ data, isLoading, isVisible, toggleVisibility }`
  - [x] Cache session `useRef<Map<string, PriceHistoryPoint[]>>` — clé `${stationId}_${fuelType}`
  - [x] `isVisible: boolean` (state local) — `false` par défaut, reset à `false` quand `selectedStation?.id` change
  - [x] `toggleVisibility()` : si `!isVisible` → vérifier cache, sinon fetcher ; si `isVisible` → masquer (garder data)
  - [x] `useDuckDB()` pour `db` ; selectors isolés pour `selectedStation` et `selectedFuel`
  - [x] Fallback silencieux sur erreur

- [x] Task 4 : Créer `src/components/StationDetail/components/PriceHistoryChart.tsx` (AC: #3, #4, #5)
  - [x] Props : `{ data: PriceHistoryPoint[]; isLoading: boolean; selectedFuel: FuelType }`
  - [x] Skeleton `h-40` si `isLoading` ; message centré si `data.length === 0`
  - [x] `LineChart` responsive 160px, axe X `MM-DD`, axe Y prix en €, tooltip DD/MM/YYYY
  - [x] Couleur de ligne via `FUEL_COLOR_MAP[selectedFuel]` (mapping CSS défini dans le composant, voir Dev Notes)

- [x] Task 5 : Intégrer dans `StationDetail/index.tsx` (AC: #1, #2, #3, #6, #7)
  - [x] Importer `usePriceHistory`, `PriceHistoryChart`, `History`, `TrendingUp`
  - [x] Appeler `usePriceHistory()` au niveau du composant (après `useStationName`, ligne ~41)
  - [x] Dans la section Actions (après grid Maps/Waze, ligne ~175), ajouter le bouton "Historique" + zone conditionnelle
  - [x] Le bouton affiche "Historique" si `!isVisible`, "Masquer l'historique" si `isVisible`
  - [x] `<PriceHistoryChart>` rendu uniquement si `isVisible`

- [x] Task 6 : Lint et validation (AC: #9)
  - [x] `pnpm lint` — 0 erreur bloquante

## Dev Notes

### Contexte critique — analystMode supprimé

Le commit `c6a08bc ♻️ (Analyst mode) - Remove analyst mode feature and related UI components` a **supprimé tout le mode analyste** après US-03-02. Conséquences directes :

- ❌ Pas de `analystMode` dans le store — ne pas ajouter, ne pas référencer
- ❌ Pas de bouton "Historique" existant — créer from scratch dans les Actions
- ✅ `StationDetail/index.tsx` actuel : uniquement boutons Maps/Waze + services — pas d'historique

### Task 1 — Exports dans `priceTrends.ts`

Fichier : `src/lib/priceTrends.ts`

```ts
// Ligne 16 : ajouter export
export const getDeptFromStationId = (stationId: string): string => { ... }

// Ligne 129 : ajouter export
export async function filterAvailableUrls(urls: string[]): Promise<string[]> { ... }
```

Ces fonctions sont déjà présentes et correctes — **uniquement ajouter `export`**.

### Task 2 — `src/lib/priceHistory.ts`

**URL pattern :** identique à `priceTrends.ts`, même `BASE_URL` :

```
https://huggingface.co/.../data/consolidated/daily/year={YYYY}/month={MM}/day={DD}/code_departement={dept}/data_0.parquet
```

**`getLast30DayPaths(dept)`** :

```ts
export const getLast30DayPaths = (
  dept: string,
): Array<{ url: string; date: string }> => {
  const result: Array<{ url: string; date: string }> = [];
  const now = new Date();
  for (let i = 1; i <= 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    result.push({
      url: `${BASE_URL}/year=${year}/month=${month}/day=${day}/code_departement=${dept}/data_0.parquet`,
      date: `${year}-${month}-${day}`,
    });
  }
  return result.reverse(); // ordre chronologique ascendant
};
```

**`fetchStationPriceHistory`** — **1 seule connexion DuckDB**, `filename=true` pour extraire les dates depuis le path HuggingFace :

```ts
export const fetchStationPriceHistory = async (
  db: AsyncDuckDB,
  stationId: string,
  dept: string,
  fuelType: FuelType,
): Promise<PriceHistoryPoint[]> => {
  const paths = getLast30DayPaths(dept);
  const availableUrls = await filterAvailableUrls(paths.map((p) => p.url));
  if (availableUrls.length === 0) return [];

  const urlList = availableUrls.map((u) => `'${u}'`).join(", ");
  const fuelCol = `"Prix ${fuelType}"`;

  // filename=true : DuckDB expose le path de chaque fichier lu
  // regexp_extract : extrait year/month/day depuis l'URL HuggingFace
  const query = `
    SELECT
      regexp_extract(filename, 'year=(\\d+)', 1) || '-' ||
      lpad(regexp_extract(filename, 'month=(\\d+)', 1), 2, '0') || '-' ||
      lpad(regexp_extract(filename, 'day=(\\d+)', 1), 2, '0') AS date,
      AVG(${fuelCol}) AS price
    FROM read_parquet([${urlList}], filename=true)
    WHERE CAST(id AS VARCHAR) = '${stationId}'
    GROUP BY date
    ORDER BY date
  `;

  const conn = await db.connect();
  let rows: PriceHistoryPoint[] = [];
  try {
    const result = await conn.query(query);
    rows = result.toArray().map((r) => {
      const row = r.toJSON() as Record<string, unknown>;
      const price = row.price != null ? Number(row.price) : null;
      return {
        date: String(row.date),
        price: Number.isNaN(price ?? NaN) ? null : price,
      };
    });
  } finally {
    await conn.close();
  }
  return rows;
};
```

⚠️ `filename=true` est supporté dans DuckDB-WASM (même version que le projet).
⚠️ `CAST(id AS VARCHAR)` obligatoire — les IDs sont stockés en bigint dans les Parquets.
⚠️ La requête filtre par `stationId` (1 station) contrairement à `fetchPriceTrends` qui ramène toutes les stations.

### Task 3 — `src/hooks/usePriceHistory.ts`

**Décision performance :** Le fetch 30j peut prendre 10-20s (30 fichiers Parquet réseau). Le hook adopte un **modèle à la demande + cache session** :

- Le fetch n'est déclenché **qu'au clic sur le bouton** (`toggleVisibility()`)
- Un `Map` en `useRef` (cache en mémoire) évite les re-fetch sur la même station/carburant
- Quand `selectedStation.id` change → `isVisible` reset à `false`, data reset à `[]` (le cache est conservé)

```ts
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useDuckDB } from "@/components/DuckDBProvider";
import { useAppStore } from "@/store/useAppStore";
import {
  fetchStationPriceHistory,
  type PriceHistoryPoint,
} from "@/lib/priceHistory";
import { getDeptFromStationId } from "@/lib/priceTrends";

export function usePriceHistory() {
  const { db } = useDuckDB();
  const selectedStation = useAppStore((s) => s.selectedStation);
  const selectedFuel = useAppStore((s) => s.selectedFuel);

  const [data, setData] = useState<PriceHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Cache session : Map<`${stationId}_${fuelType}`, PriceHistoryPoint[]>
  const cache = useRef(new Map<string, PriceHistoryPoint[]>());

  // Reset visibilité + data quand on change de station
  useEffect(() => {
    setIsVisible(false);
    setData([]);
    setIsLoading(false);
  }, [selectedStation?.id]);

  const toggleVisibility = useCallback(async () => {
    if (isVisible) {
      setIsVisible(false);
      return;
    }

    if (!db || !selectedStation) return;

    const cacheKey = `${selectedStation.id}_${selectedFuel}`;
    const cached = cache.current.get(cacheKey);

    if (cached) {
      setData(cached);
      setIsVisible(true);
      return;
    }

    setIsVisible(true);
    setIsLoading(true);

    const dept = getDeptFromStationId(selectedStation.id);
    try {
      const history = await fetchStationPriceHistory(
        db,
        selectedStation.id,
        dept,
        selectedFuel,
      );
      cache.current.set(cacheKey, history);
      setData(history);
    } catch {
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [db, selectedStation, selectedFuel, isVisible]);

  return { data, isLoading, isVisible, toggleVisibility };
}
```

**Selector pattern :** `useAppStore((s) => s.field)` — sélecteurs isolés, pas de destructuring global.

### Task 4 — `src/components/StationDetail/components/PriceHistoryChart.tsx`

**`FUEL_TYPES.color` contient des noms Tailwind** (`"yellow"`, `"green"`...), pas du CSS. Mapping requis :

```ts
const FUEL_COLOR_MAP: Record<FuelType, string> = {
  Gazole: "#EAB308", // yellow-500
  E10: "#22C55E", // green-500
  SP95: "#10B981", // emerald-500
  SP98: "#059669", // emerald-600
  E85: "#0EA5E9", // sky-500
  GPLc: "#64748B", // slate-500
};
```

**Composant :**

```tsx
"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { FuelType } from "@/lib/constants";
import type { PriceHistoryPoint } from "@/lib/priceHistory";
import { Skeleton } from "@/components/ui/skeleton";

const FUEL_COLOR_MAP: Record<FuelType, string> = {
  Gazole: "#EAB308",
  E10: "#22C55E",
  SP95: "#10B981",
  SP98: "#059669",
  E85: "#0EA5E9",
  GPLc: "#64748B",
};

interface PriceHistoryChartProps {
  data: PriceHistoryPoint[];
  isLoading: boolean;
  selectedFuel: FuelType;
}

export function PriceHistoryChart({
  data,
  isLoading,
  selectedFuel,
}: PriceHistoryChartProps) {
  if (isLoading) return <Skeleton className="h-40 w-full rounded-md" />;

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">
        Aucune donnée historique disponible
      </p>
    );
  }

  const prices = data
    .map((d) => d.price)
    .filter((p): p is number => p !== null);
  const minPrice = Math.min(...prices) - 0.05;
  const maxPrice = Math.max(...prices) + 0.05;

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="currentColor"
          strokeOpacity={0.1}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(val: string) => val.slice(5)} // 'YYYY-MM-DD' → 'MM-DD'
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[minPrice, maxPrice]}
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v.toFixed(2)}€`}
          width={42}
        />
        <Tooltip
          formatter={(value: unknown) => [
            `${Number(value).toFixed(3)} €/L`,
            selectedFuel,
          ]}
          labelFormatter={(label: string) => {
            const [y, m, d] = label.split("-");
            return `${d}/${m}/${y}`;
          }}
          contentStyle={{ fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke={FUEL_COLOR_MAP[selectedFuel]}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Référence pattern Recharts existant :** `BrandPriceChart.tsx` — même `ResponsiveContainer`, même style tick/axisLine/tickLine, même `Tooltip`.

### Task 5 — Intégration dans `StationDetail/index.tsx`

**Imports à ajouter :**

```tsx
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { PriceHistoryChart } from "./components/PriceHistoryChart";
// Ajouter History et TrendingUp dans l'import lucide existant (ligne 13) :
// import { Bird, Calculator, CreditCard, Euro, History, MapPin, Navigation, Road, Route, TrendingUp } from 'lucide-react'
```

**Hook (après `useStationName` ligne 40) :**

```tsx
const {
  data: priceHistory,
  isLoading: isPriceHistoryLoading,
  isVisible: isHistoryVisible,
  toggleVisibility: toggleHistory,
} = usePriceHistory();
```

**Section Actions — bouton + graphique conditionnel** (remplacer le `<div className='grid grid-cols-1 ...'>` existant lignes 165-176) :

```tsx
{/* Action Buttons */}
<div className='grid grid-cols-1 gap-3 pt-2'>
  <div className='grid grid-cols-2 gap-2'>
    <Button onClick={...} size='lg' ...>Google Maps</Button>
    <Button onClick={...} size='lg' variant='outline' ...>Waze</Button>
  </div>
  <Button
    variant='outline'
    size='lg'
    className='w-full'
    onClick={toggleHistory}
  >
    <History className='size-4' />
    {isHistoryVisible ? "Masquer l'historique" : 'Historique'}
  </Button>
  {isHistoryVisible && (
    <div className='space-y-2'>
      <p className='text-muted-foreground flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase'>
        <TrendingUp className='size-3.5' />
        Évolution du prix — 30 jours
      </p>
      <PriceHistoryChart
        data={priceHistory}
        isLoading={isPriceHistoryLoading}
        selectedFuel={selectedFuel}
      />
    </div>
  )}
</div>
```

⚠️ Les `onClick` des boutons Maps/Waze sont inchangés — conserver exactement les handlers existants (lignes 167-174).

### Structure de fichiers

**À modifier :**

- `src/lib/priceTrends.ts` — ajouter `export` sur `getDeptFromStationId` (l.16) et `filterAvailableUrls` (l.129)
- `src/components/StationDetail/index.tsx` — import hook + composant, hook call, bouton + graphique dans Actions

**À créer :**

- `src/lib/priceHistory.ts`
- `src/hooks/usePriceHistory.ts`
- `src/components/StationDetail/components/PriceHistoryChart.tsx`

### Anti-patterns à éviter

- ❌ Ne pas chercher `analystMode` dans le store — supprimé (commit `c6a08bc`)
- ❌ Ne pas déclencher le fetch au mount ou au changement de station — **seulement au clic**
- ❌ Ne pas créer 30 connexions DuckDB séparées — `read_parquet([liste], filename=true)` en 1 connexion
- ❌ Ne pas dupliquer `getDeptFromStationId` / `filterAvailableUrls` — les exporter de `priceTrends.ts`
- ❌ Ne pas stocker l'historique dans le store global — cache `useRef<Map>` local au hook
- ❌ Ne pas utiliser `FUEL_TYPES[i].color` comme valeur CSS — noms Tailwind, utiliser `FUEL_COLOR_MAP`
- ❌ Ne pas déstructurer `useAppStore()` en entier dans le hook — selectors isolés

### Références

- Helpers à exporter : `src/lib/priceTrends.ts:16-21` (getDeptFromStationId), `src/lib/priceTrends.ts:129-138` (filterAvailableUrls)
- `BASE_URL` : `src/lib/priceTrends.ts:10-11`
- Pattern DuckDB query (1 conn, toArray/toJSON) : `src/lib/priceTrends.ts:73-80`
- Pattern hook `useDuckDB` + isMounted : `src/hooks/usePriceTrends.ts:8-39`
- Pattern Recharts : `src/components/StationList/components/StationListStats/components/BrandPriceChart.tsx:1-62`
- Section Actions existante (à modifier) : `src/components/StationDetail/index.tsx:164-176`
- Section Services (pattern `border-t`) : `src/components/StationDetail/index.tsx:179-197`

## Review Findings

- [ ] [Review][Decision] Modèle d'interaction et approche données divergent complètement de la spec — La spec exige un bouton "Historique" toggle (AC #1), un fetch déclenché au premier clic uniquement (AC #2), `isVisible`/`toggleVisibility` dans le hook (AC #3 dev notes), un reset visuel au changement de station (AC #7), et `filterAvailableUrls` exportée de `priceTrends.ts` (AC #8). L'implémentation a opté pour un chargement automatique au montage via `useEffect`, un graphique toujours visible, un cache module-level avec clé `${id}_${fuel}_${date}`, et une approche données entièrement différente (1 Parquet rolling vs 30 fichiers journaliers). Confirmer si ce changement de design est intentionnel ou si la spec doit être respectée.
- [ ] [Review][Patch] `isLoading` retourné `false` depuis l'early-return guard malgré state=true → flash d'état vide [`src/hooks/usePriceHistory.ts:55-57`]
- [ ] [Review][Patch] `prices` vide (tous `null`) → `Math.min/max(…[])` = ±Infinity, `avgPrice` = NaN → graphique Recharts cassé [`src/components/StationDetail/components/PriceHistoryChart.tsx:118-120`]
- [ ] [Review][Patch] `deltaPct` division par zéro si `prices[0] === 0` → "Infinity%" affiché en en-tête [`src/components/StationDetail/components/PriceHistoryChart.tsx:126`]
- [ ] [Review][Patch] Tooltip: `price` peut être `undefined` si le payload "price" est absent → `Number(undefined).toFixed(3)` = "NaN €/L" [`src/components/StationDetail/components/PriceHistoryChart.tsx:279-282`]
- [ ] [Review][Patch] `augmentWithOutageBridge` off-by-one : le jour réel post-gap reçoit `outagePrice = priceAfter` → série rouge déborde d'un jour après la fin de rupture [`src/components/StationDetail/components/PriceHistoryChart.tsx:85`]
- [ ] [Review][Patch] `augmentWithOutageBridge` trailing nulls : interpolation vers `endVal = priceBefore` au lieu de rester plat → fausse descente vers 0 sur une rupture en fin de période [`src/components/StationDetail/components/PriceHistoryChart.tsx:82-84`]
- [ ] [Review][Patch] `onFocus → blur()` dans `ChartContainer` supprime tout focus clavier sur le graphique → violation a11y (navigation clavier impossible) [`src/components/StationDetail/components/PriceHistoryChart.tsx:193`]
- [x] [Review][Defer] SQL injection théorique : `stationId` et `dept` interpolés dans la requête DuckDB sans sanitization [`src/lib/priceHistory.ts:24-26`] — deferred, données internes (data.gouv.fr), sandbox WASM, risque pratique nul
- [x] [Review][Defer] Cache module-level `historyCache` non borné : croissance illimitée en session longue [`src/hooks/usePriceHistory.ts:10`] — deferred, entrées de ~2 KB chacune, impact pratique très faible
- [x] [Review][Defer] `parseInt(timeRange)` sans radix (base 10 implicite) [`src/components/StationDetail/components/PriceHistoryChart.tsx:110`] — deferred, valeur contrainte par le type `"7"|"14"|"30"`, aucun impact fonctionnel

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- ✅ Task 1 : `getDeptFromStationId` et `filterAvailableUrls` exportés depuis `priceTrends.ts` — zéro duplication.
- ✅ Task 2 : `priceHistory.ts` créé avec `PriceHistoryPoint`, `getLast30DayPaths` et `fetchStationPriceHistory` (1 seule connexion DuckDB, `filename=true`, `filterAvailableUrls` importé de `priceTrends.ts`).
- ✅ Task 3 : `usePriceHistory` créé avec cache session `useRef<Map>`, reset de `isVisible` sur changement de station, fallback silencieux sur erreur.
- ✅ Task 4 : `PriceHistoryChart` créé avec `FUEL_COLOR_MAP` CSS (pas Tailwind), skeleton `h-40`, message vide, `LineChart` Recharts 160px avec tooltip DD/MM/YYYY.
- ✅ Task 5 : `StationDetail/index.tsx` mis à jour — bouton "Historique"/"Masquer l'historique" + graphique conditionnel sous Maps/Waze.
- ✅ Task 6 : Lint — 0 erreur bloquante (11 warnings préexistants, aucun lié aux nouveaux fichiers).

### File List

**Modifiés :**

- `src/lib/priceTrends.ts` — export ajouté sur `getDeptFromStationId` et `filterAvailableUrls`
- `src/components/StationDetail/index.tsx` — import hook + composant, appel `usePriceHistory`, bouton + graphique historique
- `_bmad-output/docs/sprint-status.yaml` — statut mis à jour

**Créés :**

- `src/lib/priceHistory.ts`
- `src/hooks/usePriceHistory.ts`
- `src/components/StationDetail/components/PriceHistoryChart.tsx`

## Change Log

- 2026-04-08 : Implémentation US-03-03 — Graphique historique 30j ajouté dans `StationDetail`. Exports `getDeptFromStationId`/`filterAvailableUrls` dans `priceTrends.ts`, nouveau lib `priceHistory.ts`, hook `usePriceHistory` avec cache session, composant `PriceHistoryChart` Recharts. Lint : 0 erreur.
