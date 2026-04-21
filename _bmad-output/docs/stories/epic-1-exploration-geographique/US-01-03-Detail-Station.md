# US-01-03 : Détail d'une Station

**ID:** US-01-03
**Epic:** E01 - Exploration Géographique
**Priority:** Must Have
**Story Points:** 3
**Status:** Review

## User Story

**En tant que** conducteur,
**Je veux** accéder aux détails complets d'une station,
**Afin de** connaître son adresse, ses services et les prix de tous les carburants.

## Acceptance Criteria

- [x] **Vue Détail accessible** :
  - Sur mobile : le Drawer bascule sur la vue détail au clic d'une station (liste ou marqueur carte).
  - Sur desktop : la Sidebar latérale affiche les détails au clic d'une station.
  - Un bouton "Retour" permet de revenir à la liste.
- [x] **Adresse complète** :
  - L'adresse de la station est affichée (rue, ville).
- [x] **Liens de navigation GPS externe** :
  - Bouton "Y Aller" avec navigation vers **Google Maps**.
  - Bouton "Y Aller" avec navigation vers **Waze** (ou menu de choix).
- [x] **Prix de tous les carburants disponibles** :
  - Grille affichant chaque carburant de la station avec son prix.
  - Le carburant sélectionné est mis en avant (bordure + fond coloré).
  - Comparaison visuelle avec le prix médian local (badge `+/- x.xxxe`).
- [x] **Services disponibles** :
  - Liste des services (ex: Gonflage, Boutique, DAB...) sous forme de badges.
  - Section masquée si aucun service disponible.
- [x] **Indicateurs de qualité** :
  - Badge "Meilleur prix" si la station est la moins chère pour le carburant sélectionné.
  - Badge "Plus proche" si la station est la plus proche de l'utilisateur.

## Technical Notes

- **Composant existant** : `src/components/StationDetail.tsx` — la majorité de la vue est déjà implémentée.
- **Ce qui reste à faire** :
  - Ajouter un lien de navigation vers **Waze** en plus de Google Maps.
    - URL Waze : `https://waze.com/ul?ll={lat},{lon}&navigate=yes`
    - Proposer les deux options (Google Maps + Waze) via 2 boutons distincts ou un menu de choix.
  - La navigation GPS est actuellement Google Maps uniquement (`handleNavigate()`).
- **Horaires** : Le badge "Ouvert 24/7" est actuellement codé en dur. Si les données de schedule ne sont pas disponibles dans le modèle `Station`, laisser tel quel ou supprimer le badge.
  - Le modèle `Station` (`src/store/useAppStore.ts`) ne contient pas de champ `schedule`. Vérifier si les données Parquet contiennent ces informations.
- **Bouton Historique** : Actuellement `disabled={true}` — prévu pour US-03-03 (Graphique Historique). Ne pas activer pour cette story.
- **Store** : Utiliser `useAppStore` — `selectedStation`, `selectedFuel`, `stats`, `bestPriceStationId`, `bestDistanceStationId`.
- **Layout integration** :
  - Mobile : `MobileLayout.tsx` via `Drawer` + `DrawerContent`
  - Desktop : `DesktopLayout.tsx` via sidebar (à vérifier)

## Dependencies

- **US-01-01** (Carte Interactive) : Pour la sélection d'une station via marqueur.
- **US-01-02** (Liste des Stations) : Pour la sélection d'une station via la liste.
- **Bibliothèque UI** : Shadcn UI (Badge, Button, ScrollArea), Lucide React (icônes).

## Definition of Done

- [x] Le composant `StationDetail` est implémenté et intégré (mobile + desktop).
- [x] Les prix de tous les carburants disponibles sont affichés avec comparaison médiane.
- [x] La liste des services est affichée.
- [x] La navigation GPS externe inclut au moins **Google Maps et Waze**.
- [x] Code review validée.
