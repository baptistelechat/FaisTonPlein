# FaisTonPlein — Contexte Projet

## Présentation

Application web pour localiser les stations-service et comparer les prix des carburants en temps réel en France. L'utilisateur peut trouver la station la moins chère ou la plus proche, avec une carte interactive et une liste triable.

**Stack :**

- **Frontend :** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, Zustand, Zod
- **Carte :** MapLibre GL + react-map-gl (clustering via supercluster)
- **Données :** DuckDB-WASM (requêtes SQL directement dans le navigateur via Web Worker)
- **Source de données :** Fichiers Parquet partitionnés par département, hébergés sur Hugging Face, générés par un ETL Node.js/TypeScript (dossier `etl/`)
- **UI components :** Lucide React (icônes), Sonner (toasts), Vaul (drawer mobile)

## Architecture des données

Le pipeline ETL (`etl/src/`) télécharge le CSV de data.gouv.fr, le transforme en Parquet via DuckDB, et l'upload sur Hugging Face.

Le frontend charge les Parquet via DuckDB-WASM dans un Web Worker (`DuckDBProvider.tsx`), mappe les données brutes en objets `Station` via `src/lib/mappers.ts`, et les stocke dans le store Zustand (`src/store/useAppStore.ts`).

**Modèle** **`Station`** **:**

```ts
type Station = {
  id: string
  name: string
  lat: number
  lon: number
  address: string
  services: string[]   // ex: ["Automate CB 24/24", "DAB", ...]
  prices: FuelPrice[]
  is24h: boolean       // OR de 'Automate 24-24 (oui/non)' === 'Oui' et services.includes('Automate CB 24/24')
}
```

**Carburants supportés :** `Gazole`, `E10`, `SP95`, `SP98`, `E85`, `GPLc`

## Structure clé

```
src/
  components/
    StationDetail.tsx     — Vue détail d'une station (drawer mobile + sidebar desktop)
    StationList/          — Liste des stations triable (prix / distance)
    InteractiveMap.tsx    — Carte MapLibre avec clustering
    FuelTypeSelector.tsx  — Sélecteur de carburant
    MobileLayout.tsx      — Layout mobile (Drawer vaul)
    DesktopLayout.tsx     — Layout desktop (sidebar)
    DuckDBProvider.tsx    — Init DuckDB-WASM + chargement données
    FuelDataLoader.tsx    — Chargement des données par département
  lib/
    mappers.ts            — RawStationData → Station (parsing JSON services, prix, is24h)
    constants.ts          — FUEL_TYPES, DRAWER_SNAP_POINTS
    utils.ts              — getBestStationsForFuel, helpers
  store/
    useAppStore.ts        — Store Zustand global (stations, stats, selectedStation, etc.)
etl/
  src/
    transform.ts          — Téléchargement CSV + écriture Parquet (latest + history)
    pipeline.ts           — Orchestration ETL
_bmad-output/
  docs/
    sprint-status.yaml    — Statut de toutes les stories / epics
    stories/              — Fichiers de stories détaillées par epic
    epics-stories.md      — Vue d'ensemble des epics et user stories
```

<br />

## Directives

### Pas de tests unitaires

Ne pas écrire, proposer ou mentionner de tests unitaires sur ce projet. Les stories qui mentionnent des tests dans leur Definition of Done sont à ignorer sur ce point.

### Commandes utiles

```bash
pnpm dev        # Démarre Next.js + GrepAI watcher
pnpm build      # Build de production
pnpm lint       # ESLint (utiliser rtk lint pour output compact)
```

