# US-01-02 : Liste des Stations

**ID:** US-01-02
**Epic:** E01 - Exploration Géographique
**Priority:** High
**Story Points:** 3
**Status:** Ready for Dev

## User Story

**En tant que** conducteur,
**Je veux** voir une liste des stations triée par distance ou prix,
**Afin de** comparer facilement les offres sans utiliser la carte.

## Acceptance Criteria

- [ ] **Mobile (Bottom Sheet)** :
    - Utiliser un "Drawer" non-modal (permettant l'interaction avec la carte).
    - État initial ("Peeking") : Hauteur réduite (~15-20%) affichant un résumé ou le Top 3 des stations les moins chères (Carousel horizontal ou liste compacte).
    - État étendu : Swipe vers le haut pour voir la liste complète.
    - Au clic sur une station (liste ou carte), le contenu du Drawer bascule sur la vue "Détail" (US-01-03).
- [ ] **Desktop (Sidebar)** :
    - Sidebar latérale toujours visible (ou repliable).
    - Affiche la liste par défaut.
    - Bascule sur le détail d'une station lors de la sélection.
- [ ] **Tri et Filtrage** :
    - Par défaut : Tri par **Prix** (Top 3 mis en avant).
    - Possibilité de changer le tri (Distance).
- [ ] **Indicateurs** :
    - Mettre en évidence les 3 stations les moins chères (Badge "Top Prix").

## Technical Notes

- **Composant UI** : Créer un composant `StationList.tsx`.
- **State Management** : Utiliser `useAppStore` pour récupérer `stations`, `userLocation`, et `selectedFuel`.
- **Calcul de Distance** :
    - Utiliser la formule de Haversine pour calculer la distance entre `userLocation` et `station.lat/lon`.
    - Créer un utilitaire `calculateDistance(lat1, lon1, lat2, lon2)` dans `src/lib/utils.ts` si ce n'est pas déjà fait.
- **Tri** :
    - Implémenter une fonction de tri dynamique dans le composant ou un sélecteur memoizé.
    - Attention aux prix null/manquants (les mettre à la fin lors du tri par prix).
- **Responsive** :
    - Sur mobile : La liste peut être dans un "Drawer" (comme Shadcn Drawer) ou sous la carte.
    - Sur desktop : La liste peut être dans une sidebar latérale.
- **Performance** : Si la liste est longue (> 50 stations), envisager la virtualisation (ex: `react-window`) ou une pagination simple, bien que pour un rayon standard cela ne devrait pas être critique.

## Dependencies

- **US-01-01** (Carte Interactive) : Pour l'accès au store et la géolocalisation.
- **Bibliothèque UI** : Shadcn UI (Card, Badge, ScrollArea).

## Definition of Done

- [ ] Le composant `StationList` est implémenté et intégré.
- [ ] Le tri par prix et distance fonctionne correctement.
- [ ] L'affichage est responsive et utilisable sur mobile.
- [ ] Tests unitaires pour la fonction de tri et de distance.
- [ ] Code review validée.
