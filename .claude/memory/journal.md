---
register: journal
---

## 2026-09-10

Reprise du projet FaisTonPlein après une pause depuis avril 2026 (dernier commit sur la branche `analytics` en date du 22/04). Recap de l'existant : les Epics 0 à 4 sont terminés (fondations ETL/DuckDB, exploration géographique, comparaison économique, intelligence & analyse, résilience offline). Epic 5 (Observabilité & Santé) et Epic 6 (Analytics comportemental & RGPD) sont en `backlog` — seule une session de brainstorming a eu lieu, aucun code écrit. Stack analytics retenue : PostHog Cloud EU + route `/api/health` surveillée par Uptime Kuma.

Décision prise : garder `sprint-status.yaml` et BMAD le temps de terminer Epic 5 et 6, puis retirer BMAD complètement et archiver `_bmad-output/` dans `docs/archive/` pour ne rien perdre. Mise en place de `.claude/memory/` (ce registre) comme infrastructure de continuité inter-session, jamais implémentée jusqu'ici sur ce projet — objectif : reprendre en main le projet avec le fonctionnement actuel de Baptiste.

**Entrées clés :**

- [BDR-003](decisions/BDR-003.md) — stack analytics PostHog Cloud EU + Uptime Kuma
- [BDR-004](decisions/BDR-004.md) — abandon progressif de BMAD après clôture Epic 5/6
- [ZBLK-001](archive/blockers/ZBLK-001.md) — monitoring ETL, objet direct de l'Epic 5

---

Epic 5 (Observabilité & Santé) et Epic 6 (Analytics comportemental & RGPD) implémentés de bout en bout en autonomie, code-complete. Côté Epic 5 : route `/api/health` (fraîcheur ETL, taux d'erreur, nombre de stations), provider PostHog EU, error tracking silencieux via `posthog.captureException`. Côté Epic 6 : 23 events comportementaux couvrant toute l'app (session, navigation, filtres, réglages, géoloc, recherche, PWA, historique des prix), page `/confidentialite` RGPD, dashboard PostHog complet (26 tiles, 7 sections) construit entièrement via l'API REST puis le MCP officiel PostHog plutôt que par manipulation manuelle du navigateur.

Deux bugs de production réellement bloquants trouvés et corrigés en cours de route, tous deux invisibles en usage normal : le COEP `require-corp` (ajouté pour DuckDB-WASM) bloquait silencieusement tout envoi vers PostHog, et une collision de noms d'events avec le projet ifecho (projet PostHog partagé) faussait le dashboard sans erreur visible. Les deux sont documentés comme blocages ([ZBLK-004](archive/blockers/ZBLK-004.md), [ZBLK-005](archive/blockers/ZBLK-005.md)) en plus des patterns déjà extraits ([LRN-005](learnings/LRN-005.md), [LRN-006](learnings/LRN-006.md)).

Seul point encore ouvert : le déploiement effectif de la branche `analytics` (push + Vercel + réactivation du monitor Uptime Kuma), qui nécessite l'autorisation de Baptiste — hors scope de cette session. Session clôturée avec `/changelog` (une seule ligne ajoutée : page confidentialité, le reste de l'instrumentation analytics étant invisible côté utilisateur), `/gen-commit` (rien à committer, tout le code était déjà commité en étapes) et ce rituel `/memory-close`.

**Entrées clés :**

- [ZBLK-004](archive/blockers/ZBLK-004.md) — bug COEP bloquant PostHog en silence
- [ZBLK-005](archive/blockers/ZBLK-005.md) — collision d'events avec ifecho faussant le dashboard

---

Diagnostic et fix des faux positifs Uptime Kuma sur `/api/health`, remontés par Baptiste via une capture Telegram. Deux causes cumulées trouvées : un seuil de staleness égal à la fréquence du cron ETL combiné au cache Next 5min de la route (flapping Down/Up en ~5min), et l'instance RPi self-hosted (`pm2: faistonplein`) 24 commits en retard — antérieure même à la création de la route, d'où le 404 initial. Le fix (déjà écrit dans le working tree, jamais commité) a été vérifié (lint/build OK) puis pushé sur `main` (`67d1886`). Le RPi a ensuite été resynchronisé : `git pull`, upgrade pnpm global 8.15.1 → 10.30.3 (lockfile local en `9.0`, incompatible avec l'ancien pnpm), `pnpm install`, `pnpm build`, `pm2 restart` — `/api/health` vérifié `200 healthy` en direct. Découverte annexe : ce process RPi tourne en réalité `next dev --experimental-https`, pas un build de prod.

`BLK-001` (monitoring ETL, reporté depuis Epic 0) marqué résolu et archivé en [ZBLK-001](archive/blockers/ZBLK-001.md). Trois patterns extraits ([LRN-008](learnings/LRN-008.md), [LRN-009](learnings/LRN-009.md), [LRN-010](learnings/LRN-010.md)) et une décision ([BDR-007](decisions/BDR-007.md)) — tous gardés en local à la demande de Baptiste plutôt que promus en mémoire globale, malgré leur portée générique.

**Entrées clés :**

- [ZBLK-001](archive/blockers/ZBLK-001.md) — monitoring ETL, enfin résolu
- [LRN-007](learnings/LRN-007.md) — diagnostic complet du double faux positif
- [BDR-007](decisions/BDR-007.md) — upgrade pnpm global RPi plutôt que régénérer le lockfile

## 2026-09-23

Baptiste constate que son dashboard PostHog est resté entièrement vide depuis le déploiement des Epics 5/6, treize jours plus tôt. Le rituel de démarrage a immédiatement remonté les deux blocages PostHog de cette session-là — le COEP `require-corp` et la collision d'events avec ifecho — mais les deux ont été écartés par vérification directe : le header servi en production est bien `credentialless`, et la propriété `app: "faistonplein"` est bien attachée aux events.

La vraie cause était ailleurs et plus bête : le projet Vercel `fais-ton-plein` n'avait **aucune** variable d'environnement définie. Next.js n'inlinant les `NEXT_PUBLIC_*` qu'au build et seulement si elles existent alors, `process.env.NEXT_PUBLIC_POSTHOG_KEY` était resté une lecture dynamique valant `undefined` côté client — le guard `enabled` de `PostHogProvider.tsx` renvoyait donc `false` et `posthog.init()` n'a jamais été appelé. Aucune erreur, aucun warning : une panne parfaitement silencieuse de plus sur cette intégration.

La chaîne de diagnostic s'est révélée plus efficace en partant du moins coûteux : une requête HogQL groupée par `app` / `$host` a montré que les 66 seuls events existants dataient tous du 10 septembre et venaient de `localhost:310x`, donc qu'aucun event n'avait jamais quitté la production. La recherche de `phc_` dans les chunks servis l'a confirmé côté bundle, et la lecture du chunk compilé a fourni la preuve décisive : le nom de la variable y figurait encore en clair, alors que le `NODE_ENV === "production"` du même guard avait bien été remplacé par sa valeur — l'inlining fonctionnait, seule cette variable manquait.

Fix appliqué par Baptiste dans le dashboard Vercel, avec deux points tranchés au passage. Le warning « might expose sensitive information » de Vercel sur `NEXT_PUBLIC_POSTHOG_KEY` est un faux positif — heuristique sur le nom, alors que la clé `phc_` est publique par conception. Et le scope a été restreint à **Production seule** plutôt que le `Preview, Production` proposé par défaut, parce que les builds Preview de Vercel tournent eux aussi avec `NODE_ENV=production` et auraient donc envoyé leurs events dans les données réelles, sans que le filtre `$host` de [BDR-006](decisions/BDR-006.md) — limité à `localhost` — ne les arrête.

Vérification du fix en trois niveaux après redeploy, en se méfiant de tout indicateur indirect : clé présente dans le bundle, requête réelle vers `https://eu.i.posthog.com/e/` observée via l'API `performance`, puis events `session_start` et `geoloc_result` confirmés en HogQL avec la bonne propriété `app`. À noter qu'un premier test a échoué à tort parce que `window.posthog` restait `undefined` — faux négatif, `posthog-js` importé en ESM n'expose pas ce global, contrairement au snippet HTML.

Deux observations relevées en fin de parcours sans être investiguées : `session_ended` apparaît en double sans `session_start` associé ([BLK-007](blockers/BLK-007.md), laissé ouvert), et la production répond sur deux hosts distincts, le domaine canonique et l'URL propre à chaque déploiement. [ZBLK-004](archive/blockers/ZBLK-004.md) et [ZBLK-005](archive/blockers/ZBLK-005.md) ont par ailleurs été archivés au passage, leur statut étant résolu depuis le 10 septembre. Les quatre patterns extraits ont cette fois été promus en mémoire globale — contrairement à la session précédente — parce qu'ils relèvent du Next/Vercel générique et ne dépendent en rien de ce projet.

**Entrées clés :**

- [ZBLK-006](archive/blockers/ZBLK-006.md) — env var absente de Vercel, treize jours d'analytics muette
- [BDR-008](decisions/BDR-008.md) — env vars PostHog restreintes à Production
- [BLK-007](blockers/BLK-007.md) — double comptage `session_ended`, à confirmer sur du volume

---

Deuxième session de la journée, sur un tout autre sujet : le prix du carburant repart à la hausse en France, et Baptiste veut profiter de ce moment pour faire connaître le projet. Point de départ volontairement ouvert — « comment créer un carrousel ou des visuels pour les réseaux sociaux » — mais l'audit du projet a montré qu'il manquait d'abord une chose plus élémentaire : aucune image de partage. Chaque lien collé sur X, LinkedIn ou WhatsApp affichait un rectangle vide, et `twitter.card` était resté sur `summary`, la vignette carrée minuscule. Le carrousel pouvait attendre, la porte d'entrée non.

Cinq itérations de moodboard ont été nécessaires pour converger, chacune corrigeant une erreur de ma part. La v1 proposait six templates ogimagecn ; la v2, des hybrides Stat×Logo et Stat×Product ; la v3 a introduit l'idée de Baptiste — reprendre la forme des **totems de station-service**, l'objet que tout automobiliste sait lire sans explication et qui affiche nativement plusieurs carburants, ce qui réglait au passage le fait que se focaliser sur le Gazole écarte les conducteurs E10, E85 ou GPL. Baptiste m'a repris deux fois avec raison : j'avais d'abord inventé des codes couleur « carburant » à partir de ses photos au lieu d'utiliser ceux du projet, puis, après avoir trouvé la bonne source (`FUEL_TYPES` + `resolveHex(color, 500)`), j'avais quand même dévié en écartant SP95 et SP98 d'une nuance alors que le projet les traite identiquement.

L'implémentation a buté sur trois pièges, tous documentés. Le build cassait sur le chargement des polices, avec un message de Turbopack trompeur qui parlait de `fetch` alors que rien ne partait sur le réseau ([ZBLK-008](archive/blockers/ZBLK-008.md)). Puis l'image sortait valide, aux bonnes dimensions, mais totalement illisible : Satori aplatit mal les Fragments React et n'applique pas `flex: 1` ([ZBLK-009](archive/blockers/ZBLK-009.md)) — un échec parfaitement silencieux, que lint, build et contrôle des dimensions laissaient passer. Le troisième, moins visible, tenait à Tailwind v4 qui ne publie plus qu'en `oklch` et a rebasé ses hex par rapport à la v3.

Le point le plus instructif de la session est méthodologique. J'avais validé le layout dans un navigateur, mesures à l'appui, et j'aurais livré une image cassée sans un build de vérification lancé avec des données mockées. C'est cette vérification qui a aussi révélé que les vrais prix étaient très loin de mes placeholders (2,406 € de gazole contre 1,842 € simulé) et qu'un cas limite existait : une variation nulle s'affichait en flèche rouge de hausse, désormais rendue par un `=` neutre.

Reste la décision produit, tranchée par Baptiste et mieux formulée par lui que par moi : l'og:image devait être dynamique, parce que « on partage l'app et aussi les prix du moment ». Le totem cesse d'être une illustration pour devenir le contenu. L'ETL publie donc maintenant les moyennes nationales et un historique glissant dans `metadata.json`, et un script d'amorçage a reconstruit 27 jours depuis `rolling/30days` pour que les flèches d'évolution soient disponibles immédiatement plutôt qu'après une semaine d'attente.

**Entrées clés :**

- [BDR-009](decisions/BDR-009.md) — og:image dynamique comme canal de diffusion de la donnée
- [ZBLK-009](archive/blockers/ZBLK-009.md) — l'échec silencieux de Satori, invisible à tous les contrôles automatiques

---

Troisième session de la journée, enchaînée directement sur la précédente : Baptiste demande de vérifier l'og:image en production via un outil de debug social — et elle affiche le fallback (« Trouvez la station-service la moins chère... ») au lieu des 6 tuiles. Diagnostic en deux temps. D'abord la donnée : `metadata.json` publié sur Hugging Face ne contenait ni `fuel_stats` ni `fuel_history`, seulement les 4 champs de base — le run ETL qui l'avait produit tournait forcément avec le code d'avant [BDR-009](decisions/BDR-009.md). Confirmé par `git log` côté RPi : 13 jours de retard, bloqué sur le commit du 10 septembre, exactement le pattern déjà documenté par [LRN-009](learnings/LRN-009.md).

Déploiement RPi classique en apparence — `git pull` (fast-forward propre, 36 fichiers) puis `pm2 restart` — mais un contrôle de vérification a révélé un second niveau de staleness indépendant du premier : `etl/dist/` est gitignoré et datait du 17 avril, donc le pull n'avait rien changé au code réellement exécuté par pm2. Rebuild (`pnpm build`) puis nouveau restart ([ZBLK-010](archive/blockers/ZBLK-010.md)). Un run manuel déclenché ensuite pour vérifier a confirmé `fuel_stats` correctement publié — mais a révélé un effet de bord inattendu : `fuel_history` était retombé à 1 seul jour. Le run intermédiaire du 12h00 (code périmé) avait écrasé d'un coup les 27 jours amorcés le matin même, en réécrivant tout `metadata.json` sans ce champ. `bootstrap-og-history.ts --upload` relancé pour restaurer l'historique en ~1 minute.

Baptiste a ensuite demandé si ce scénario pouvait se reproduire, sachant qu'il ne vérifie pas l'og:image au quotidien. Réponse tranchée en distinguant clairement ce qui est robuste (les tuiles de prix, recalculées à chaque run depuis le CSV brut) de ce qui est fragile (les flèches d'évolution, dépendantes d'une lecture réussie du `metadata.json` du run précédent). Sur validation de Baptiste, fix codé : `transform.ts` distingue désormais « historique absent/illisible » de « historique vide mais légitime » et ne déclenche la reconstruction automatique depuis `rolling/30days` que dans le premier cas — `bootstrap-og-history.ts` simplifié pour réutiliser la même fonction plutôt que dupliquer la logique ([BDR-011](decisions/BDR-011.md)).

**Entrées clés :**

- [ZBLK-010](archive/blockers/ZBLK-010.md) — le second niveau de staleness (dist/ compilé) qui a failli faire déclarer le déploiement terminé à tort
- [BDR-011](decisions/BDR-011.md) — le fallback qui referme la fragilité de fuel_history

---

Session courte de nettoyage : Baptiste demande de retirer GrepAI, qu'il n'utilise plus ([BDR-012](decisions/BDR-012.md)). Le script `dev` lançait `grepai watch` en parallèle de Next.js via `concurrently`, avec un message d'avertissement Ollama quand il était éteint. Retrait complet : script `dev` réduit à `next dev`, dépendance `concurrently` supprimée avec resynchronisation du lockfile, entrée `.grepai/` retirée du `.gitignore`, doc `CLAUDE.md` mise à jour. La suppression du dossier `.grepai/` local a été faite par Baptiste lui-même, ma commande composée ayant été refusée puis son `rm -rf` ayant échoué sous PowerShell (`Remove-Item -Recurse -Force`).

Au moment de la clôture, `git add -A` a stagé deux fichiers applicatifs sans rapport (`fuelColors.ts`, `nationalPrices.ts`), apparus entre-temps : du travail en cours d'une autre session. Ils ont été retirés du staging avant le commit (`1e74ce8`, poussé) et le pattern est capitalisé en global (voir GLRN-300 en mémoire globale). Le blocker [ZBLK-010](archive/blockers/ZBLK-010.md), résolu, a été archivé au passage.

**Entrées clés :**

- [BDR-012](decisions/BDR-012.md) — retrait de GrepAI

---

Nouvelle session de la journée, centrée sur une fonctionnalité produit : un panneau visible en continu qui affiche les prix moyens nationaux, à la manière d'un totem de station-service, pour se comparer à la moyenne française. Point de départ voulu par Baptiste : reprendre la donnée de l'og:image ([BDR-009](decisions/BDR-009.md)) et passer sa structure en colonne, avec sur mobile uniquement le carburant sélectionné.

Le calcul des moyennes et des évolutions a été extrait de `opengraph-image.tsx` vers `src/lib/nationalPrices.ts`, si bien que la carte de partage et le totem partagent la même logique. Le totem se nourrit de `metadata.json` via un hook autonome, sans dépendre de la géolocalisation ([BDR-013](decisions/BDR-013.md)). La première version reprenait le design sombre de l'og:image, et Baptiste l'a immédiatement recadrée : « tu n'as pas repris le style de l'app ». S'ensuit une série d'itérations où le totem a été reconstruit à partir de la carte prix du détail station puis affiné : unité `€/L` alignée sur `StationCard` ([LRN-011](learnings/LRN-011.md)), pastille de carburant pleine et colorée intégrée aussi dans le détail des stations, rayon réduit, prix à droite du titre avec l'évolution dessous, icône de tendance retirée, logo de l'app en tête de totem avec un sous-titre en pied, et bouton d'installation replacé sous le totem. Le chip mobile a été testé puis retiré, jugé trop encombrant ([BDR-013](decisions/BDR-013.md)). La pastille commune a imposé de passer à la teinte 600 pour garder un contraste correct avec le texte blanc, et de centraliser `resolveHex`, présent en trois exemplaires ([BDR-014](decisions/BDR-014.md)).

Vérification : le rendu a été contrôlé en navigateur avec les vraies données. Les captures d'un viewport émulé étant illisibles, les vérifications se sont faites par mesures DOM (voir GLRN-302 en mémoire globale), et l'og:image refactorée a été revérifiée à l'image car sa logique avait changé. Commit `0a95972` (non poussé).

**Entrées clés :**

- [BDR-013](decisions/BDR-013.md) — totem desktop seul, logique partagée avec l'og:image
- [BDR-014](decisions/BDR-014.md) — FuelBadge unique et resolveHex centralisé

---

Suite de session sur le totem : il recouvrait la barre de recherche sur les fenêtres desktop étroites. Première approche construite puis abandonnée : une barre horizontale minimaliste en bas de carte (`NationalPriceTotemBar`), basculée via une container query `@5xl`, repositionnée à gauche après avoir constaté qu'elle chevauchait les contrôles de carte. Baptiste a ensuite préféré une autre approche : le header réserve la place du totem à droite (`@2xl:pr-66`), la barre de recherche se rétrécit et reste toujours visible, et le totem se masque sous 672px de largeur de carte ([BDR-015](decisions/BDR-015.md)). La barre horizontale a été supprimée. Vérifié en navigateur à 1000 et 1100px, lint et build verts, commit `47fbeca` (non poussé) avec une entrée `Fixed` au changelog. Le pattern container query est capitalisé en local ([LRN-012](learnings/LRN-012.md)), Baptiste ayant demandé de tout garder en local.

**Entrées clés :**

- [BDR-015](decisions/BDR-015.md) — header qui réserve la place du totem, masqué sous `@2xl`
- [LRN-012](learnings/LRN-012.md) — container query plutôt que media query pour un overlay à largeur variable
