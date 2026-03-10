***

stepsCompleted:

- 1
- 2
- 3
  inputDocuments: \[]
  session\_topic: 'Projet FaisTonPlein : Comparateur de prix du carburant communautaire et open source'
  session\_goals: 'Valider l''architecture technique (Next.js + HF), explorer les fonctionnalités communautaires et l''UX'
  selected\_approach: 'Séquentiel : Reverse Brainstorming -> SCAMPER -> Role Playing'
  techniques\_used:
- Reverse Brainstorming
- SCAMPER
- Role Playing
  ideas\_generated: \[]
  context\_file: ''

***

# Résultats de la Session de Brainstorming

**Facilitateur:** Baptiste
**Date:** 2026-03-09

## Contexte du Projet

**Nom :** FaisTonPlein
**Objectif :** Créer un site web communautaire et open source pour comparer les prix du carburant en France (SP95, E10, Diesel, GPL…) et suivre leur évolution historique.
**Public cible :** Conducteurs souhaitant optimiser leurs pleins.
**Données :** prix-carburants.gouv.fr (Open Data), stockées sur Hugging Face (Parquet).
**Stack :** TypeScript, Next.js, Shadcn UI, mapcn.
**Architecture :** Scripts d'ingestion -> Parquet (HF) -> Next.js API -> Dashboard.
**Contraintes :** Pas de VPS, Open Source, Optimisation stockage.

## Technique 1 : Reverse Brainstorming (L'Anti-Projet)

**Objectif :** Identifier les risques majeurs en imaginant comment faire échouer le projet.
**Question centrale :** "Comment s'assurer que personne n'utilise FaisTonPlein et que le site plante tout le temps ?"

### 🚨 Risques Identifiés & Solutions Proposées

| 🛑 Risque (L'Échec)                                                                                                | ✅ Solution (La Parade)                                                                                                                                                                                                                                                                                                                                                                   |
| :----------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **L'Enfer du Chargement :** Charger 100% du dataset à chaque visite, explosant la bande passante et la RAM client. | **Partitionnement Intelligent :** Découper les données Parquet par département/région ou par date (ex: `2023-10-IDF.parquet`). Utiliser **DuckDB-WASM** côté client pour requêter le Parquet sans tout charger, ou une API intermédiaire légère. **Alternative Stockage :** Explorer Supabase (tiers gratuit généreux) ou Turso (SQLite on Edge) si HF est trop lent pour le temps réel. |
| **Le Silence Radio :** Le script de mise à jour plante et personne ne le sait. Les prix ont 3 semaines de retard.  | **Monitoring Actif :** Bot Telegram/Discord/Slack qui notifie en cas d'échec du script d'ingestion (GitHub Actions failure). ou plus simple dans un premier temps : Dashboard de santé visible ("Dernière mise à jour : il y a 2h").                                                                                                                                                     |
| **L'Usine à Gaz UX :** Une interface dense illisible pour M. Tout-le-monde, faisant fuir les utilisateurs pressés. | **Double Interface (Progressive Disclosure) :** 1. **Mode "Express" (Défaut) :** "Où est le moins cher autour de moi ?" (Carte simple, Top 3 stations). 2. **Mode "Analyste" (Toggle) :** Graphiques historiques, tendances, écart-types, filtres avancés pour les "nerds de la data".                                                                                                   |
| **Le Mur Communautaire :** Exiger un compte GitHub ou des procédures complexes pour le feedback.                   | **Feedback Friction-Zéro :** Formulaire **Tally** intégré pour signaler bugs/idées sans compte. Présence sur réseaux sociaux (Twitter/BlueSky/LinkedIn) pour créer une communauté et relayer les "bons plans" ou tendances.                                                                                                                                                              |

## Technique 2 : SCAMPER (Innovation Fonctionnelle)

**Objectif :** Transformer et améliorer les fonctionnalités de base.
**Mots-clés :** Substituer, Combiner, Adapter, Modifier, Produire un autre usage, Éliminer, Renverser.

### 💡 Idées SCAMPER Sélectionnées

| Lettre | Concept              | Idée Retenue pour FaisTonPlein                                                                                                                                                                  |
| :----- | :------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S**  | **Substituer**       | **Coût du Plein Personnalisé :** Afficher le prix au litre et proposer egalement le coût total pour SON véhicule (ex: "50€ pour votre Clio"). Possibilité de configurer la taille du réservoir. |
| **A**  | **Adapter**          | **Gamification & Classements :** Afficher les "Bons élèves" (stations les moins chères) et les "Mauvais élèves" par ville/département. Notion de "Streak" pour les stations consistently cheap. |
| **M**  | **Modifier**         | **Agrégateur d'Avis (V2) :** Intégrer les avis Google Maps ou autres pour ajouter la dimension "Service/Qualité" au prix (propreté, services...).                                               |
| **P**  | **Put to other use** | **Mode Pro (V2) :** Gestion des cartes carburant pro et réductions spécifiques flottes.                                                                                                         |
| **E**  | **Éliminer**         | **Interface Mobile Focus :** Éliminer le superflu sur mobile pour un zoom automatique "Local" autour de soi + Boussole "La moins chère à 300m".                                                 |
| **R**  | **Renverser**        | **Indicateur de Tendance :** "Faut-il faire le plein maintenant ?" -> Afficher une flèche de tendance (Hausse/Baisse/Stable) sur 3 jours plutôt qu'un conseil d'investissement risqué.          |

## Technique 3 : Role Playing (Empathie Utilisateur)

**Objectif :** Valider l'UX pour chaque profil utilisateur clé.

### 🎭 Parcours Utilisateurs Définis

#### 1. Samia, L'Urgentiste 🏎️
*   **Besoin :** "Je suis en réserve, il me faut de l'essence TOUT DE SUITE."
*   **Parcours Idéal :**
    *   Arrive sur le site -> Géolocalisation immédiate.
    *   Voit **2 boutons/options clairs** : "Les moins chères" vs "Les plus proches".
    *   La carte affiche uniquement les stations ouvertes maintenant.
    *   1 clic -> Ouverture GPS (Waze/Google Maps).

#### 2. Jean-Pierre, L'Économe 💰
*   **Besoin :** "Je veux payer le moins cher possible, quitte à faire un petit détour."
*   **Parcours Idéal :**
    *   Visualise les pompes à 5-10km autour de lui.
    *   **Indicateur visuel immédiat** (code couleur vert/rouge) : Cette station est-elle moins chère que la moyenne du département ?
    *   Voit le coût total de son plein ("Gagner 3€ sur ce plein").

#### 3. Alex, Le Data-Nerd 📊
*   **Besoin :** "Je veux comprendre les tendances et voir la data."
*   **Parcours Idéal :**
    *   Vue par défaut simple (KPIs).
    *   Accès via un bouton/toggle à un **"Mode Analyste"**.
    *   Accès aux graphiques d'évolution, historiques, heatmaps régionales.
    *   Possibilité de filtrer par périodes (semaine, mois, année).

---

## 🚀 Prochaines Étapes Recommandées

1.  **Architecture :** Valider le prototype "Parquet sur HF + DuckDB-WASM" vs "Supabase Free Tier" pour la performance.
2.  **Maquette UX :** Créer un wireframe du "Double Mode" (Express vs Analyste).
3.  **Data Pipeline :** Coder le script d'ingestion initial des données Open Data gouv.
