# Epics & User Stories: FaisTonPlein

**Date :** 09/03/2026
**Auteur :** Baptiste (Product Manager)
**Statut :** Draft
**Version :** 1.0
**Source :** [PRD](../planning/prd-faistonplein.md)

---

## E00 - Fondations Techniques

**Objectif :** Mettre en place l'architecture de base et le pipeline de données.

### US-00-01 : Pipeline ETL (Data.gouv -> HuggingFace)

**En tant que** développeur,
**Je veux** automatiser la récupération, la transformation et la publication des données,
**Afin de** fournir des fichiers Parquet optimisés et à jour à l'application.

**Critères d'Acceptation :**

- [x] Script Node.js/TypeScript pour télécharger le CSV depuis data.gouv.fr.
- [x] Conversion des données en format Parquet (avec compression).
- [x] Partitionnement des fichiers par département.
- [x] Upload automatique vers un Dataset Hugging Face.
- [x] Exécution planifiée (GitHub Actions) ou manuelle.

### US-00-02 : Intégration Client DuckDB-WASM

**En tant que** développeur,
**Je veux** intégrer DuckDB-WASM dans l'application Next.js,
**Afin de** pouvoir requêter les fichiers Parquet directement dans le navigateur.

**Critères d'Acceptation :**

- [x] Initialisation de DuckDB-WASM dans un Web Worker.
- [x] Chargement d'un fichier Parquet (ex: département test) depuis Hugging Face.
- [x] Exécution d'une requête SQL simple (SELECT \* FROM prices LIMIT 10) avec affichage des résultats.

### US-00-03 : Consolidation des Données Historiques

**En tant que** data engineer,
**Je veux** consolider les fichiers de données historiques,
**Afin de** maintenir des performances de lecture optimales pour l'analyse sans perdre la granularité fine (jour/mois/année).

**Critères d'Acceptation :**

- [x] Création d'un script de consolidation journalier/mensuelle (Batch).
- [x] Le script fusionne les petits fichiers (par heure) en un fichier optimisé.
- [x] **Important** : Les fichiers sources (par heure) sont CONSERVÉS pour garder l'historique précis.
- [x] Structure cible : `consolidated/YYYY/MM/DD/code_departement=XX/data_0.parquet` / `consolidated/YYYY/MM/code_departement=XX/data_0.parquet` / `consolidated/YYYY/code_departement=XX/data_0.parquet` ou sinon directemnt dans la structure de `history`
- [x] Planification via CRON (ex: 1er du mois).

### US-00-04 : Récupération Historique (XML -> Parquet)

**En tant que** data engineer,
**Je veux** récupérer et intégrer les données historiques (annuelles et quotidiennes) depuis prix-carburants.gouv.fr,
**Afin de** constituer une base de données complète pour l'analyse des tendances sur le long terme. Ce sera un script a part que je lance une fois et que je ne relance plus jamais. Il faut trier les données dans la structure de dossier actuelle `history`

**Critères d'Acceptation :**

- [x] Script de téléchargement des archives annuelles (2007-2025) (XML dans ZIP).
- [x] Script de téléchargement des flux quotidiens (30 derniers jours) avec déduplication (ne pas écraser/dupliquer les jours déjà acquis).
- [x] Parsing des fichiers XML pour extraire les données (stations, prix, ruptures).
- [x] Conversion et intégration dans le pipeline existant (Parquet + HuggingFace).
- [x] Gestion des cas limites (fichiers corrompus, jours manquants).

---

## E01 - Exploration Géographique

**Objectif :** Permettre à l'utilisateur de visualiser et trouver les stations services autour de lui.

### US-01-01 : Carte Interactive

**En tant que** conducteur,
**Je veux** voir une carte centrée sur ma position avec les stations environnantes,
**Afin de** visualiser rapidement les options disponibles.

**Critères d'Acceptation :**

- [x] La carte s'affiche et se centre sur la géolocalisation de l'utilisateur (si autorisée).
- [x] Les stations sont représentées par des marqueurs.
- [x] Le zoom et le déplacement sur la carte sont fluides.
- [x] Au clic sur un marqueur, un résumé de la station s'affiche.

### US-01-02 : Liste des Stations

**En tant que** conducteur,
**Je veux** voir une liste des stations triée par distance ou prix,
**Afin de** comparer facilement les offres sans utiliser la carte.

**Critères d'Acceptation :**

- [x] Affichage d'une liste sous la carte (ou via un toggle).
- [x] Chaque élément affiche : Nom, Distance, Prix du carburant sélectionné.
- [x] Possibilité de trier par Distance ou Prix.

### US-01-03 : Détail d'une Station

**En tant que** conducteur,
**Je veux** accéder aux détails complets d'une station,
**Afin de** connaître son adresse, ses services et les prix de tous les carburants.

**Critères d'Acceptation :**

- [x] Page ou modale dédiée au détail.
- [x] Affichage de l'adresse complète avec lien vers GPS externe (Waze/Maps).
- [x] Liste des prix pour tous les carburants disponibles.
- [x] Liste des services (ex: Gonflage, Boutique).

### US-01-04 : Filtre Carburant

**En tant que** conducteur,
**Je veux** filtrer les stations par type de carburant (E10, SP98, Diesel...),
**Afin de** ne voir que celles qui proposent ce dont j'ai besoin.

**Critères d'Acceptation :**

- [x] Sélecteur de carburant accessible en haut de l'écran.
- [x] La carte et la liste se mettent à jour instantanément.
- [x] Le choix est sauvegardé pour les prochaines sessions.

---

## E02 - Comparaison Économique

**Objectif :** Fournir une analyse économique pertinente pour aider à la décision.

### US-02-01 : Prix à Jour et Fraîcheur

**En tant que** conducteur,
**Je veux** voir les prix avec une indication de leur fraîcheur,
**Afin de** ne pas me déplacer pour un prix obsolète.

**Critères d'Acceptation :**

- [x] Affichage de la date de dernière mise à jour des données.
- [x] Code couleur (Vert = < 24h, Orange = < 3j, Rouge = > 3j).

### US-02-02 : Calcul du Coût du Plein

**En tant que** conducteur économe,
**Je veux** saisir la capacité de mon réservoir,
**Afin de** voir le coût total estimé du plein plutôt que le prix au litre.

**Critères d'Acceptation :**

- [x] Input pour saisir la capacité (en Litres) dans les paramètres.
- [x] Affichage du coût total (ex: "85€") en évidence.
- [x] Le calcul se met à jour si le prix change.

### US-02-03 : Tri Intelligent (Prix + Distance)

**En tant que** conducteur pragmatique,
**Je veux** trier les stations par "coût réel" incluant la distance pour y aller,
**Afin de** savoir si l'économie vaut le déplacement.

**Critères d'Acceptation :**

- [x] Badge "Coût réel" visible uniquement si un véhicule est configuré et une position de référence est disponible.
- [x] Formule : `effectiveCost = price × fillAmount + price × distance × (consumption / 100)`.
- [x] Affichage du coût de trajet sous l'estimation de plein dans `StationCard` quand le tri est actif.

### US-02-04 : Distances Routières Réelles (OSRM + Isodistance)

**En tant que** conducteur,
**Je veux** choisir entre des distances à vol d'oiseau ou des distances routières réelles,
**Afin d'** avoir un affichage et des comparaisons adaptés à mes préférences.

**Critères d'Acceptation :**

- [x] Toggle `Route réelle` / `Vol d'oiseau` dans les settings (préférence persistée, défaut : route réelle).
- [x] Mode route : distances OSRM `/table` dans la liste + polygone isodistance IGN sur la carte.
- [x] Mode vol d'oiseau : Haversine dans la liste + cercle sur la carte (comportement actuel).
- [x] Fallback silencieux vers Haversine/cercle si les APIs sont indisponibles.
- [x] Indicateur discret `~` sur les distances Haversine temporaires en mode route.

---

## E03 - Intelligence & Analyse

**Objectif :** Comprendre les tendances du marché.

### US-03-01 : Indicateur de Tendance

**En tant que** conducteur,
**Je veux** savoir si le prix est en hausse ou en baisse,
**Afin de** décider si je dois faire le plein maintenant ou attendre.

**Critères d'Acceptation :**

- [x] Flèche (Hausse/Baisse/Stable) à côté du prix.
- [x] Basé sur la moyenne locale des 7 derniers jours.

### US-03-02 : Mode Analyste

**En tant que** "Data Nerd",
**Je veux** activer un mode avancé,
**Afin de** visualiser des données supplémentaires sans surcharger l'interface par défaut.

**Critères d'Acceptation :**

- [x] Toggle "Mode Analyste" dans les paramètres.
- [x] L'activation affiche les graphiques et stats avancées.

### US-03-03 : Graphique Historique

**En tant que** analyste,
**Je veux** voir l'évolution du prix sur 30 jours,
**Afin de** comprendre la dynamique du marché.

**Critères d'Acceptation :**

- [x] Graphique linéaire interactif (Recharts).
- [x] Affichage des points de données au survol.

---

## E04 - Résilience (Offline)

**Objectif :** Garantir l'accès aux données en toutes circonstances.

### US-04-01 : Cache Départemental

**En tant que** système,
**Je veux** télécharger et mettre en cache les données du département de l'utilisateur,
**Afin de** permettre un fonctionnement fluide et offline.

**Critères d'Acceptation :**

- [x] Téléchargement automatique (ou proposé) au premier lancement.
- [x] Stockage local (IndexedDB via DuckDB).
- [x] Indicateur de progression du téléchargement.

### US-04-02 : Consultation Offline

**En tant que** conducteur en zone blanche,
**Je veux** pouvoir consulter les stations et prix déjà chargés,
**Afin de** trouver de l'essence même sans réseau.

**Critères d'Acceptation :**

- [x] L'application se lance sans réseau.
- [x] Accès complet à la carte et liste (données en cache).
- [x] Indicateur "Mode Hors Ligne".

---

## E05 - Observabilité & Santé de l'Application

**Objectif :** Permettre à Baptiste de savoir en temps réel si l'application et ses données sont saines, et de détecter les erreurs silencieuses qui affectent les utilisateurs sans qu'ils les signalent.

**Stack :** PostHog Cloud EU (sans cookie, RGPD-safe) + Uptime Kuma (existant, étendu)

**Contraintes :**

- Cookieless — aucun cookie déposé
- EU-hosted — données hébergées dans l'Union Européenne
- Pas de bannière de consentement requise
- Session Replay PostHog désactivé (risque RGPD)
- 1 seul outil complémentaire à Uptime Kuma

### US-05-01 : Route de Santé ETL (`/api/health`)

**En tant que** développeur,
**Je veux** exposer une route `/api/health` sur l'application Next.js,
**Afin de** permettre à Uptime Kuma de vérifier non seulement que l'app répond, mais que les données ETL sont fraîches et cohérentes.

**Critères d'Acceptation :**

- [ ] Route GET `/api/health` créée dans Next.js (Route Handler).
- [ ] La réponse retourne un JSON avec : `{ status, lastETLUpdate, stationsCount, errorRateLast30min, timestamp }`.
- [ ] `status` vaut `"healthy"` si `lastETLUpdate < 2h`, sinon `"degraded"`.
- [ ] `lastETLUpdate` est récupéré depuis les métadonnées du dernier fichier Parquet chargé (ou localStorage si disponible côté client — à arbitrer côté serveur).
- [ ] `stationsCount` reflète le nombre de stations actuellement en mémoire / disponibles.
- [ ] La route répond en < 200ms (pas de requête DuckDB lourde).
- [ ] Uptime Kuma est configuré pour monitorer cette URL avec une alerte si `status === "degraded"` ou si la route est injoignable.
- [ ] La route est accessible publiquement (pas d'authentification) mais ne retourne aucune donnée personnelle.

### US-05-02 : Intégration PostHog Cloud EU

**En tant que** développeur,
**Je veux** intégrer PostHog Cloud EU dans l'application Next.js,
**Afin de** disposer d'une plateforme centrale pour l'analytics, le tracking d'erreurs et les Core Web Vitals, sans cookie et conforme RGPD.

**Critères d'Acceptation :**

- [ ] Compte PostHog créé sur la région EU (eu.posthog.com).
- [ ] Package `posthog-js` installé et initialisé dans un Provider Next.js (`PostHogProvider`).
- [ ] Configuration `posthog.init` avec : `persistence: 'memory'` (pas de cookie ni localStorage pour l'identité), `autocapture: false` (contrôle total des events), `disable_session_recording: true` (session replay désactivé).
- [ ] Le Provider est monté côté client uniquement (`'use client'`) et wrappé autour du layout sans bloquer le SSR.
- [ ] Aucun cookie n'est déposé dans le navigateur suite à l'initialisation (vérifiable via DevTools → Application → Cookies).
- [ ] Les données arrivent dans le dashboard PostHog EU (vérification d'au moins 1 session enregistrée en dev).
- [ ] La clé API PostHog est stockée dans une variable d'environnement `NEXT_PUBLIC_POSTHOG_KEY` (jamais en dur dans le code).
- [ ] Le script PostHog ne dégrade pas le LCP ni le TTI (vérification via Lighthouse avant/après).

### US-05-03 : Tracking des Erreurs Silencieuses

**En tant que** développeur,
**Je veux** capturer automatiquement les erreurs JavaScript silencieuses (DuckDB-WASM, Web Worker, runtime),
**Afin de** rendre visibles les pannes qui touchent des utilisateurs sans qu'ils les signalent.

**Critères d'Acceptation :**

- [ ] Un `ErrorBoundary` React global capture les erreurs de rendu et les envoie à PostHog via `posthog.captureException()`.
- [ ] Les erreurs non catchées (`window.onerror`, `unhandledrejection`) sont interceptées et envoyées à PostHog.
- [ ] Les erreurs DuckDB-WASM sont catchées dans le Web Worker et postées au thread principal via `postMessage`, puis envoyées à PostHog avec le contexte `{ errorType: 'duckdb', department, query }`.
- [ ] Les erreurs de chargement des fichiers Parquet (fetch Hugging Face échoué) sont capturées avec le contexte `{ department, url, httpStatus }`.
- [ ] Chaque erreur capturée inclut : `errorType`, `message`, `browser`, `os`, `deviceType` (mobile/desktop).
- [ ] Aucune donnée personnelle (IP, user-agent complet, position) n'est incluse dans les erreurs envoyées.
- [ ] Dans le dashboard PostHog, un filtre "Error tracking" permet de voir les erreurs groupées par type et fréquence.

---

## E06 - Analytics Comportemental & Conformité RGPD

**Objectif :** Baptiste comprend ce que font réellement les utilisateurs (conversion, modes de tri, abandons, profil réseau, PWA vs web), et les utilisateurs français peuvent consulter et faire confiance aux pratiques de l'application.

**Prérequis :** E05 terminé (PostHog installé et opérationnel)

### US-06-01 : Événements de Conversion (Navigation Lancée)

**En tant que** développeur,
**Je veux** tracker le clic sur les boutons "Ouvrir dans Google Maps" et "Ouvrir dans Waze",
**Afin de** mesurer le taux de conversion réel de l'application (l'utilisateur a trouvé sa station et se prépare à y aller).

**Critères d'Acceptation :**

- [ ] Un event PostHog `navigation_launched` est envoyé lors de chaque clic sur les boutons de navigation.
- [ ] L'event inclut les propriétés : `destination` (`"google_maps"` ou `"waze"`), `fuelType` (carburant sélectionné au moment du clic), `sortMode` (mode de tri actif), `sessionDurationMs` (durée de la session au moment du clic).
- [ ] L'event ne contient aucune donnée de position GPS ni identifiant de station (adresse textuelle uniquement si nécessaire).
- [ ] Le dashboard PostHog affiche le taux de sessions ayant déclenché au moins un `navigation_launched`.
- [ ] Un funnel PostHog est configuré : `session_start` → `station_detail_viewed` → `navigation_launched`.

### US-06-02 : Événements de Comportement Utilisateur

**En tant que** développeur,
**Je veux** tracker les choix de mode de tri, de carburant, la source de session et l'état de géolocalisation,
**Afin de** comprendre quelles fonctionnalités sont réellement utilisées et prioriser les évolutions produit.

**Critères d'Acceptation :**

- [ ] Event `mode_selected` envoyé à chaque changement de mode de tri, avec la propriété `mode` (`"cheapest"` | `"nearest"` | `"cost_per_trip"`).
- [ ] Event `fuel_selected` envoyé à chaque changement de carburant, avec la propriété `fuelType` (`"Gazole"` | `"E10"` | `"SP95"` | etc.).
- [ ] Event `session_start` enrichi avec la propriété `session_source` : `"pwa"` si `window.matchMedia('(display-mode: standalone)').matches`, sinon `"browser"`.
- [ ] Event `session_start` enrichi avec `geoloc_status` : `"granted"` | `"denied"` | `"not_requested"` selon l'état de la permission géolocalisation.
- [ ] Event `session_start` enrichi avec `network_quality` : valeur de `navigator.connection?.effectiveType` (`"4g"` | `"3g"` | `"2g"` | `"slow-2g"` | `"unknown"`).
- [ ] Aucun des events ne contient de coordonnées GPS, d'adresse IP ou de donnée permettant d'identifier l'utilisateur.
- [ ] Les events sont visibles et filtrables dans le dashboard PostHog.

### US-06-03 : Beacon API — Fin de Session

**En tant que** développeur,
**Je veux** envoyer un event `session_ended` au moment où l'utilisateur quitte la page,
**Afin de** distinguer les sessions "succès" (navigation lancée) des abandons, même en cas de fermeture brutale.

**Critères d'Acceptation :**

- [ ] Un handler `visibilitychange` (+ `beforeunload` en fallback) envoie l'event via `navigator.sendBeacon()` à la fermeture de la page.
- [ ] L'event `session_ended` inclut : `navigationLaunched` (boolean), `lastMode` (mode actif), `lastFuelType` (carburant actif), `sessionDurationMs`, `stationDetailOpened` (boolean).
- [ ] `navigator.sendBeacon()` est utilisé en priorité (fonctionne même si la page se ferme) ; fallback sur `fetch` si non disponible.
- [ ] L'event arrive bien dans PostHog même si l'utilisateur ferme l'onglet immédiatement après un clic navigation (testé manuellement).
- [ ] Dans PostHog, il est possible de filtrer les sessions `navigationLaunched: false` pour identifier les abandons purs.

### US-06-04 : Page Confidentialité & Transparence RGPD

**En tant qu'** utilisateur de FaisTonPlein,
**Je veux** accéder à une page expliquant clairement quelles données sont collectées, par quel outil et pourquoi,
**Afin de** comprendre et faire confiance aux pratiques de l'application.

**Critères d'Acceptation :**

- [ ] Une page `/confidentialite` est créée en tant que Server Component Next.js (accessible sans JavaScript activé).
- [ ] La page explique : (1) qu'aucune donnée personnelle n'est collectée, (2) que PostHog Cloud EU est l'outil utilisé, (3) quels événements anonymes sont trackés et leur finalité, (4) qu'aucun cookie n'est déposé, (5) comment contacter Baptiste pour toute question.
- [ ] Un lien vers `/confidentialite` est présent dans le footer ou le menu de l'application.
- [ ] La page est rédigée en français, en langage clair et accessible (pas de jargon juridique).
- [ ] La page mentionne explicitement que les données sont hébergées dans l'Union Européenne (PostHog EU).
