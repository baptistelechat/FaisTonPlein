# Product Brief : FaisTonPlein

**Date :** 09/03/2026
**Auteur :** Baptiste (via Business Analyst & BMAD)
**Statut :** Draft
**Version :** 1.0

---

## 1. Executive Summary

**FaisTonPlein** est une application web communautaire et open source (PWA) permettant aux conducteurs français de comparer les prix du carburant en temps réel et d'analyser l'historique des prix pour optimiser leur budget.

Contrairement aux solutions existantes focalisées uniquement sur la géolocalisation instantanée ("Où est la pompe la moins chère ?"), FaisTonPlein se positionne comme un outil d'**Intelligence Économique Personnelle**, offrant des analyses de tendances, un fonctionnement hors-ligne robuste, et une approche "Privacy-First" (sans publicité ni tracking).

## 2. Le Problème

### Le Constat

- Le prix du carburant est une préoccupation majeure pour le pouvoir d'achat des Français.
- Les applications actuelles (Waze, Gasoil Now) sont souvent :
  - **Inondées de publicités** et de traceurs.
  - **Limitées à l'instantané** : Impossible de savoir si le prix a baissé ou monté par rapport à hier.
  - **Inutilisables sans réseau** (zones blanches rurales).
  - **Fermées** : Données non accessibles ou opacité des algorithmes.

### L'Opportunité

Utiliser les données Open Data officielles (prix-carburants.gouv.fr) pour créer une alternative citoyenne, performante (analytique client-side), et respectueuse de la vie privée.

## 3. Public Cible (Personas)

1.  **Samia, L'Urgentiste 🏎️**
    - **Besoin :** "Je suis en réserve, il me faut de l'essence TOUT DE SUITE."
    - **Usage :** Mode Express, géolocalisation immédiate, fiabilité des infos d'ouverture.

2.  **Jean-Pierre, L'Économe 💰**
    - **Besoin :** "Je veux payer le moins cher possible, quitte à faire un petit détour de 5km."
    - **Usage :** Comparaison des coûts totaux du plein, indicateurs de compétitivité des stations.

3.  **Alex, Le Data-Nerd 📊**
    - **Besoin :** "Je veux comprendre les tendances et voir la data pour anticiper."
    - **Usage :** Mode Analyste, graphiques historiques, analyse des tendances régionales.

## 4. La Solution : FaisTonPlein

### Proposition de Valeur Unique

1.  **Double Interface (Progressive Disclosure) :** Une vue simple pour l'urgence, une vue experte pour l'analyse.
2.  **Architecture "Privacy-First" & "No-Cloud" :** Traitement des données en local (DuckDB-WASM) pour une rapidité extrême et zéro fuite de données personnelles.
3.  **Mode "Survie" (Offline-First) :** Fonctionne parfaitement sans réseau une fois les données locales chargées.
4.  **Gamification de l'Économie :** Visualisation concrète des économies réalisées ("Vous avez économisé 7€ sur ce plein").

### Architecture Technique (High-Level)

- **Ingestion (Backend-less) :** Script autonome (RPi5) récupérant l'Open Data -> Nettoyage -> Conversion Parquet -> Hébergement sur Hugging Face Datasets.
- **Frontend :** Next.js 15 (PWA) + Shadcn UI + Tailwind CSS 4.
- **Moteur de Données :** DuckDB-WASM (dans le navigateur) pour requêter les fichiers Parquet partitionnés.

## 5. Fonctionnalités Clés (MVP)

### Core (Indispensable)

- [x] **Géolocalisation & Carte :** Affichage des stations autour de soi (Mapbox/MapLibre).
- [x] **Comparateur de Prix :** Liste triée par prix ou distance.
- [x] **Fiche Station :** Détail des prix, carburants disponibles, horaires.
- [x] **Mode Offline :** Mise en cache des données départementales pour consultation sans réseau.

### Différenciants (Wow Effect)

- [x] **Mode Analyste :** Toggle pour afficher les graphiques d'évolution des prix sur 7/30 jours.
- [x] **Calcul du "Vrai Coût" :** Saisie de la capacité du réservoir pour afficher le prix du plein complet (ex: "85€" au lieu de "1.85€/L").
- [x] **Indicateur de Tendance :** Flèche (Hausse/Baisse) basée sur l'historique local.

## 6. Risques & Mitigation (Reverse Brainstorming)

| Risque                     | Impact   | Mitigation                                                                                                |
| :------------------------- | :------- | :-------------------------------------------------------------------------------------------------------- |
| **Lourdeur au chargement** | Critique | Partitionnement des fichiers Parquet par département + Chargement différé du moteur WASM.                 |
| **Données obsolètes**      | Élevé    | Pipeline d'ingestion robuste (GitHub Actions/RPi) avec monitoring et alerte en cas d'échec.               |
| **Complexité UX**          | Moyen    | Interface par défaut ultra-épurée (Mode Express). Les fonctions avancées sont cachées derrière un toggle. |

## 7. Critères de Succès

- **Performance :** Temps de chargement initial < 3s (malgré WASM).
- **Adoption :** 100 utilisateurs actifs le premier mois (Lancement Beta).
- **Fiabilité :** 99.9% de disponibilité des données (dépendance HF).
- **Économie :** Permettre une économie moyenne de 5€ par plein aux utilisateurs.

## 8. Roadmap Prévisionnelle

- **Phase 1 (MVP) :** Pipeline d'ingestion + PWA Lecture seule (Carte + Liste) + Mode Offline.
- **Phase 2 (Analytique) :** Intégration DuckDB complet + Mode Analyste + Graphiques.
- **Phase 3 (Communautaire) :** Signalement d'erreurs (Crowdsourcing) via Tally/API.

---

**Prochaine étape recommandée :** Création du PRD (Product Requirements Document) pour détailler les spécifications fonctionnelles du MVP.
