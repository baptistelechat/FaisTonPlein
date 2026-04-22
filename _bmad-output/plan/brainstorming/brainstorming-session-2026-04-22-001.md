---
stepsCompleted: [1, 2, 3]
inputDocuments: []
session_topic: "Système d'analytics et d'observabilité pour FaisTonPlein"
session_goals: "Identifier tout ce qui est pertinent à tracker/observer (comportement utilisateur, erreurs, performance, abandons, taux de rebond), choisir les outils adaptés, concevoir une stack RGPD-compliant pour une app française"
selected_approach: "ai-recommended"
techniques_used: ["Question Storming", "Role Playing", "Six Thinking Hats"]
ideas_generated:
  [
    "navigation_launched event",
    "ETL /api/health route",
    "PostHog Cloud EU",
    "Beacon API session_ended",
    "network quality capture",
    "PWA vs web tracking",
    "page CGU/transparence",
  ]
context_file: ""
---

## Session Overview

**Topic :** Système d'analytics et d'observabilité pour FaisTonPlein
**Goals :** Identifier tout ce qui est pertinent à tracker/observer (comportement utilisateur, erreurs, performance, abandons, taux de rebond), choisir les outils adaptés, concevoir une stack RGPD-compliant pour une app française

### Contexte projet

- App de localisation de stations-service et comparaison des prix carburant en France
- Stack : Next.js 16, React 19, Tailwind CSS 4, MapLibre GL, DuckDB-WASM
- Déjà en place : Uptime Kuma sur Raspberry Pi pour monitoring des services externes
- Contrainte majeure : RGPD (app à destination des utilisateurs français)

### Session Setup

_Session initiée le 2026-04-22 — Facilitation BMAD Brainstorming_

---

## Phase 1 — Question Storming

> Règle : questions uniquement, zéro réponse. ~55 questions générées.

### Parcours utilisateur

- Est-ce que l'utilisateur a trouvé une station lors de sa visite ?
- En combien de temps est-il arrivé à un résultat utile ?
- A-t-il changé de carburant sélectionné en cours de route ?
- **Quel mode de tri l'utilisateur utilise-t-il ?** (Moins chère / Plus proche / Coût du trajet) — et lequel génère le plus d'engagement post-résultat ?
- Y a-t-il des utilisateurs qui switchent entre les modes dans la même session ?
- A-t-il ouvert le détail d'une station avant de partir ?
- A-t-il fait plusieurs recherches dans la même session (hésitation ?) ou une seule ?

### Géolocalisation & carte

- A-t-il accordé la géolocalisation ou refusé ?
- S'il a refusé, est-il quand même resté sur l'app ?
- A-t-il zoomé/déplacé la carte manuellement ou fait confiance à la position auto ?
- Y a-t-il des zones géographiques où les utilisateurs abandonnent plus ?

### Abandons & friction

- À quel moment précis l'utilisateur quitte-t-il ? (avant chargement ? pendant ? après résultat ?)
- Y a-t-il un seuil de temps d'attente au-delà duquel il décroche ?
- Est-ce qu'il revient après être parti ? (session multi-visite)
- Quelles actions n'ont jamais été cliquées ? (fonctionnalités mortes)

### Erreurs

- Quelles erreurs JavaScript arrivent en prod sans que personne le sache ?
- Les fichiers Parquet se chargent-ils toujours ? Quel est le taux d'échec DuckDB-WASM ?
- Y a-t-il des erreurs silencieuses côté Web Worker ?
- Quels appels Hugging Face échouent et à quelle fréquence ?

### Device & acquisition

- Quel % des utilisateurs est sur mobile vs desktop ?
- L'app est-elle utilisée en déplacement (sur le chemin) ou depuis chez soi (planification) ?
- Y a-t-il des navigateurs ou OS où ça plante plus souvent ?
- **Quelle est la source d'acquisition ?** (Google organique, lien direct, partage, PWA installée, autre)
- Y a-t-il une corrélation entre la source et le taux de conversion / d'abandon ?

### RGPD (clarification Baptiste : pas de compte utilisateur, données anonymes)

- Peut-on utiliser des outils analytics sans bannière de consentement si tout est anonymisé et sans cookie ?
- Comment s'assurer que l'outil choisi ne fingerprint pas l'utilisateur à son insu ?
- Doit-on quand même avoir une politique de confidentialité documentant ce qu'on collecte ?
- Si on utilise un service tiers pour les analytics, où sont hébergées les données ? (hors EU = problème)
- Est-ce qu'un utilisateur a un droit à l'effacement sur des données anonymes ?

### Performance & données

- Quel est le temps de chargement réel perçu (FCP, TTI) ?
- Combien d'utilisateurs partent pendant l'initialisation DuckDB-WASM ?
- Y a-t-il des départements / fichiers Parquet qui se chargent systématiquement plus lentement ?
- Quel est le poids total téléchargé lors d'une session type ?
- Y a-t-il un Core Web Vitals (LCP, CLS, INP) qui plombe le SEO sans qu'on le sache ?

### Rétention & habitudes

- L'app est-elle utilisée régulièrement ou surtout en one-shot ?
- Y a-t-il un effet saisonnalité ?
- Combien d'utilisateurs ont installé la PWA ?
- Y a-t-il des pics d'usage (heure de pointe, weekend) ?

### Monitoring étendu (au-delà d'Uptime Kuma)

- Uptime Kuma dit "le service répond" — mais répond-il avec les bonnes données ?
- Y a-t-il des dégradations silencieuses ? (service up mais lent, données périmées)
- Sait-on si l'ETL s'est bien exécuté ? Quand les données ont-elles été mises à jour ?
- Si Hugging Face est en dégradation (pas down, juste lent), le détecte-t-on ?

---

## Phase 2 — Role Playing

> 5 personas incarnés pour révéler des besoins de tracking invisibles depuis une vue "développeur".

### 🏎️ Persona 1 — Julien, automobiliste pressé (mobile, 4G moyenne, 30% batterie)

**Parcours vécu :** Ouvre l'app en route → attend le chargement → clique "Plus proche" → ouvre le détail → lance Waze → ferme l'app.

**Besoins de tracking révélés :**

- `navigation_launched` (Google Maps ou Waze) = **événement de conversion ultime**, proxy fiable du succès utilisateur. Permet de construire le funnel complet : visite → résultat → détail → navigation.
- Ratio Google Maps vs Waze → profil utilisateur secondaire
- Stations souvent ouvertes en détail mais jamais lancées en navigation → signal de friction (prix ? adresse ?)
- **Time-to-first-result** : métrique de survie pour cet utilisateur pressé
- **Network quality** via `navigator.connection.effectiveType` : si 60% des users sont en 3G, argument data-driven pour retravailler le chargement DuckDB-WASM
- Distinguer "session courte = succès" vs "session courte = abandon" → le clic navigation résout cette ambiguïté
- Taux de géoloc accordée/refusée et comportement post-refus

**Précision Baptiste :** 2 boutons de navigation existants (Google Maps + Waze) → tracking déjà structuré côté UI, il suffit d'ajouter l'event.

---

### 🔁 Persona 2 — Sophie, infirmière libérale (power user, PWA, 400 km/semaine)

**Parcours vécu :** Ouvre depuis la PWA installée → va directement en E10 → cherche si les prix ont changé depuis hier → compare 2 stations → ferme.

**Besoins de tracking révélés :**

- **PWA vs web** : distinguer les sessions selon le mode de lancement (`display-mode: standalone` vs navigateur) → décision data-driven sur l'investissement PWA
- **Changement de préférences en session** : utilisateur qui modifie son mode ou carburant = signal d'hésitation ou de découverte
- Pics d'usage horaires → justifier un pré-chargement ou une mise en cache plus agressive

**Précision Baptiste :** Fraîcheur déjà affichée dans l'UI (indicateur sur liste/carte + date MAJ par station). localStorage déjà utilisé pour : carburant favori, profil véhicule (berline, citadine, hybride…), préférence distance, mode préféré.

---

### 💀 Persona 3 — Marc, retraité en Bretagne (vieux Samsung Galaxy A12, Android 10, Chrome 108)

**Parcours vécu :** Ouvre l'app → 8 secondes de blanc → message d'erreur incompréhensible → ferme. Il ne reviendra jamais.

**Besoins de tracking révélés :**

- **Erreurs JS silencieuses** : Marc est invisible aujourd'hui, son erreur n'est reçue nulle part
- Vieux devices / navigateurs : DuckDB-WASM a des prérequis (WebAssembly, SharedArrayBuffer) → quels navigateurs explosent sans fallback ?
- **Erreurs par segment device/OS/browser** : les erreurs sont-elles concentrées sur un profil technique précis ?
- **Core Web Vitals par device** : LCP d'un Galaxy A12 vs iPhone 15 sont probablement très différents
- Zones géographiques avec plus d'abandons → départements avec fichiers Parquet lents ou mal couverts

---

### 🛡️ Persona 4 — Isabelle, avocate RGPD (audit externe)

**Ce qu'elle vérifie :** Où partent les données ? Y a-t-il des cookies ? Quelle est la documentation ?

**Besoins révélés :**

- Outils US (Vercel Analytics, Google Analytics) = transfert hors EU → illégal sans garanties adéquates
- IP loguée côté Vercel/Next.js = donnée personnelle même si non intentionnelle
- "Anonyme" ≠ "sans cookie" : certains outils posent des cookies même pour analytics anonymes
- La géolocalisation (même approximative via IP) = donnée sensible
- **Obligation de documentation** : même sans donnée personnelle, un registre des traitements est recommandé
- **Page CGU/transparence obligatoire** (confirmé par Baptiste) : expliquer comment, avec quoi et pourquoi on tracke, même pour des données anonymes

**Bonne nouvelle confirmée :** Sans cookie, sans PII, avec un outil EU-hosted → pas de bannière de consentement obligatoire.

---

### 🔧 Persona 5 — Baptiste dev en prod à 23h (notification Uptime Kuma : "Hugging Face degraded")

**Ce qu'il veut savoir immédiatement :** Combien d'utilisateurs sont impactés ? Depuis quand ? Quel est l'impact réel ?

**Besoins révélés :**

- Uptime Kuma dit "dégradé" mais pas "combien d'utilisateurs voient une erreur" → pont manquant entre monitoring infra et impact métier
- **Route `/api/health`** custom : vérifie la fraîcheur des données Parquet + taux d'erreur récent → Uptime Kuma surveille cette route au lieu d'un simple ping
- Corrélation incident infra / comportement utilisateur : si Hugging Face ralentit, le taux d'abandon augmente-t-il immédiatement ?
- **Alertes sur métriques métier** : pas juste "service down" mais "taux de conversion < 20% depuis 15 min → anomalie"
- Logs structurés JSON côté Next.js → indispensable pour diagnostiquer sans debugger en prod

---

## Phase 3 — Six Thinking Hats

> Synthèse structurée des 3 phases. Chaque chapeau impose un mode de pensée unique.

### 🤍 Chapeau Blanc — Les faits

**Ce qu'on sait avec certitude :**

| Fait                                                                          | Source                    |
| ----------------------------------------------------------------------------- | ------------------------- |
| App Next.js hébergée sur Vercel                                               | Confirmé                  |
| Uptime Kuma en place sur Raspberry Pi                                         | En production             |
| localStorage : carburant, véhicule, mode, distance                            | Code existant             |
| Freshness indicator + historique prix affichés dans l'UI                      | Code existant             |
| 2 boutons navigation : Google Maps + Waze                                     | Code existant             |
| Pas de compte utilisateur → données anonymes par design                       | Architecture              |
| RGPD : sans cookie ni PII → pas de bannière obligatoire                       | Droit EU                  |
| Self-hosting externe impossible sans exposer le RPI (pas de Tailscale public) | Contrainte infra Baptiste |

**Angles morts totaux aujourd'hui :**

- Nb d'utilisateurs actifs réels
- % sessions terminées par un lancement de navigation
- Nb d'erreurs JS en prod
- Time-to-first-result moyen
- Ratio mobile vs desktop
- Statut de l'ETL (dernière exécution réussie ?)

---

### 💛 Chapeau Jaune — Les bénéfices

- `navigation_launched` = métrique de conversion zero-effort, révèle immédiatement si l'app "fonctionne"
- PWA tracking = décision data-driven sur un chantier potentiellement coûteux
- Error tracking = rendre Marc visible, aujourd'hui il représente probablement des centaines d'utilisateurs silencieux
- Mode préféré (coût/trajet vs moins cher vs plus proche) = prioriser le dev des features selon l'usage réel
- Network quality = argument béton pour justifier une optimisation DuckDB-WASM si 60% des users sont en 3G
- `/api/health` + Uptime Kuma = monitoring ETL sans outil supplémentaire
- Page CGU/transparence = confiance utilisateur + conformité RGPD proactive

---

### 🖤 Chapeau Noir — Les risques et contraintes

**Contrainte self-hosting :** Le RPI n'est pas exposable publiquement (sécurité, pas de Tailscale public). Toute solution self-hosted est donc inaccessible depuis Vercel ou depuis un navigateur externe → **le cloud est obligatoire pour les outils de tracking**.

**Pourquoi 1 seul outil cloud est difficile :**

| Besoin                                | Couvert par Plausible/Umami    | Couvert par PostHog              |
| ------------------------------------- | ------------------------------ | -------------------------------- |
| Analytics comportemental              | ✅                             | ✅                               |
| Custom events (navigation, mode, PWA) | ✅                             | ✅                               |
| Error tracking JS                     | ❌                             | ✅                               |
| Core Web Vitals                       | ⚠️ Partiel                     | ✅                               |
| Self-hostable sans exposition réseau  | ❌ impossible dans ce contexte | ❌ idem                          |
| EU-hosted cloud                       | ✅                             | ✅                               |
| Sans cookie, RGPD-safe                | ✅                             | ✅ (si session replay désactivé) |
| Gratuit à faible volume               | ✅ Plausible ~9€/mois          | ✅ jusqu'à 1M events             |

**Conclusion chapeau noir :** PostHog Cloud EU est la seule option réaliste qui couvre analytics + error tracking en 1 seul outil, dans les contraintes réseau de Baptiste.

---

### 💚 Chapeau Vert — Idées créatives

- **Route `/api/health`** : endpoint Next.js qui expose `{ lastETLUpdate, errorRateLast30min, stationsCount }` → Uptime Kuma surveille cette URL, alerte si `lastUpdate > 48h`. Zéro outil supplémentaire pour le monitoring ETL.
- **Beacon API** `navigator.sendBeacon()` : envoyer un event `session_ended` avec le dernier état (mode, carburant, navigation lancée ou non) même si l'utilisateur ferme brutalement la page
- **Heatmap géographique anonyme** : agréger les sessions par département → carte de chaleur des usages sans donnée personnelle
- **Page `/status` publique** générée par Uptime Kuma → transparence totale utilisateurs
- **Alert métier Uptime Kuma** sur la route `/api/health` → pont infra ↔ métier sans outil dédié

---

### 🔴 Chapeau Rouge — L'intuition

- 😤 **Frustration prioritaire :** les erreurs silencieuses (Marc). C'est le besoin le plus urgent émotionnellement.
- 🤩 **Excitation :** le clic Maps/Waze comme conversion. Élégant, simple, immédiatement utile.
- 😰 **Inquiétude :** l'ETL. Si les données sont périmées, toute la valeur de l'app s'effondre silencieusement.
- 🙏 **Soulagement :** contrainte RGPD plus légère que prévu + PostHog résout la contrainte "1 outil".
- ✍️ **Ajout Baptiste :** même si les données sont anonymes, une page CGU/FAQ/À propos est importante pour la confiance et la transparence. C'est un engagement moral autant que légal.

---

### 🔵 Chapeau Bleu — Décision & plan

**Stack retenue : PostHog Cloud EU + Uptime Kuma amélioré**

```
Uptime Kuma (existant, RPI)
├── Monitors services externes (existant)
└── + Monitor /api/health → freshness ETL + error rate métier

PostHog Cloud EU (1 outil à ajouter, cloud EU, sans cookie, RGPD-safe)
├── Analytics : sessions, bounce rate, sources d'acquisition, device/browser
├── Custom events : navigation_launched (Maps/Waze), mode_selected, fuel_selected, pwa_vs_web, geoloc_granted
├── Error tracking : erreurs JS, DuckDB-WASM, Web Worker
└── Performance : Core Web Vitals, time-to-first-result

Next.js (existant, Vercel)
└── Route /api/health → { lastETLUpdate, errorRate, stationsCount }

Page /confidentialite (à créer)
└── CGU / FAQ / À propos → expliquer les données collectées, l'outil utilisé, la finalité
```

**Priorité d'implémentation :**

| Priorité | Action                                        | Impact                                   | Effort estimé |
| -------- | --------------------------------------------- | ---------------------------------------- | ------------- |
| 🔴 P0    | Route `/api/health` + monitor Uptime Kuma     | Monitoring ETL immédiat                  | 30 min        |
| 🔴 P0    | PostHog + event `navigation_launched`         | Métrique de conversion #1                | 1h            |
| 🟠 P1    | Events : mode, carburant, PWA/web, géoloc     | Comprendre les usages réels              | 2h            |
| 🟠 P1    | Error tracking PostHog (DuckDB + Web Worker)  | Rendre les erreurs silencieuses visibles | 2h            |
| 🟡 P2    | Network quality capture à l'entrée de session | Profil utilisateur type                  | 1h            |
| 🟡 P2    | Beacon API `session_ended`                    | Distinguer abandon vs succès proprement  | 2h            |
| 🟢 P3    | Page `/confidentialite`                       | Conformité RGPD + confiance utilisateur  | 2h            |
| 🟢 P3    | Page `/status` publique Uptime Kuma           | Transparence                             | 30 min        |
