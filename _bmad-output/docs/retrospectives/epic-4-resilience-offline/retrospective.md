# Rétrospective : Epic 4 - Résilience (Offline)

**Date :** 21/04/2026
**Facilitateur :** Baptiste (Scrum Master)
**Participants :** Baptiste (Product Manager / Developer)
**Statut :** Terminé

---

## 1. Contexte & Objectifs

**Objectif de l'Epic :** Garantir l'accès aux données en toutes circonstances — cache départemental transparent et consultation hors ligne.

### Tâches Réalisées

- [x] **US-04-01 : Cache Départemental** — Cache IndexedDB transparent, 2h de validité, téléchargement en arrière-plan pour tous les depts de `departmentsToLoad`, progression discrète par dept dans les Réglages, bouton "Tout vider"
- [~] **US-04-02 : Consultation Offline** — Volontairement écartée : le mode offline n'apporte pas de valeur réelle à l'use case de l'application (consultation ponctuelle, pas de zones blanches critiques)

### Décision de scope

US-04-02 est délibérément hors scope de cette rétrospective. La story reste en `backlog` comme option future, non comme dette.

### Scores de Revue

| Story                        | Architecture | Code Quality | UI/UX  | Performance |
| :--------------------------- | :----------: | :----------: | :----: | :---------: |
| US-04-01 Cache Départemental |    ✅ 5/5    |    ✅ 4/5    | ✅ 5/5 |   ✅ 4/5    |

---

## 2. Ce qui s'est bien passé (What went well)

### Décision architecturale documentée avant le code

L'action item Epic 3 ("valider l'approche technique avant d'implémenter") a été appliquée : les Dev Notes de US-04-01 incluent un tableau comparatif IndexedDB vs OPFS avec justification explicite. La décision était prise et documentée avant toute implémentation.

### Contexte multi-département correctement géré

Le cache couvre l'ensemble de `departmentsToLoad` (1 à ~5 depts selon le rayon), pas seulement `selectedDepartment`. Le cas limite d'une ville frontière couvrant plusieurs départements est explicitement documenté et géré.

### Discrétion UX totale

Aucun toast pendant `cacheInBackground`. La progression est visible uniquement dans les Réglages, et uniquement pour les depts effectivement chargés. L'utilisateur ne perçoit aucun bruit.

### Enhancement rolling cache 30j intégré

Un rolling cache avec invalidation basée sur la date UTC a été ajouté au-delà de la spec (fenêtre 2h simple). Enhancement cohérent, intégré proprement, accepté en review.

### Review process solide

4 patches appliqués (P1–P7), dont des corrections non triviales :

- `conn.close()` dans les blocs `finally` (path cache ET path HF)
- Singleton promise pour `openCacheDB()` — évite d'ouvrir N connexions IDB en parallèle
- Guard `isNaN(total) || total <= 0` avant lecture chunk-by-chunk
- `reader.cancel()` sur erreur mid-stream

4 items deferred (W1–W4) honnêtement documentés avec leur risque estimé.

### Lint & Build propres

0 erreur lint, 0 erreur TypeScript. Build Vercel-compatible validé.

---

## 3. Ce qui a été difficile (What didn't go well)

### Monitoring ETL : carryover pour la 5ème fois

L'item "Monitoring ETL" est reporté depuis l'Epic 0 (mars 2026). Il n'a été adressé dans aucun epic. À ce stade, le report continu dilue la crédibilité des action items de rétro.

### Dépendance `recharts` non installée (bug pré-existant)

`recharts` était déclaré dans `package.json` mais absent du `node_modules`. Découvert lors du build de US-04-01. Corrigé par `pnpm install`, mais révèle l'absence de health-check en début de story.

### W2 — Téléchargements sans AbortController (dette active)

Si l'utilisateur change de zone pendant un téléchargement en arrière-plan, `cacheInBackground` peut appeler `registerFileBuffer` après le démontage du composant. Risque réel en utilisation normale (changement rapide de rayon). Les autres items deferred (W1, W3, W4) sont des edge cases théoriques.

---

## 4. Suivi des Actions de l'Epic 3

| Action                                         | Résultat                                                    | Statut |
| ---------------------------------------------- | ----------------------------------------------------------- | ------ |
| Valider approche technique avant d'implémenter | Table IndexedDB vs OPFS dans Dev Notes, décision documentée | ✅     |
| Fermer patches de review dans story file       | Tous les Review Findings ont des `[x]` dans le story file   | ✅     |
| Monitoring ETL (carryover Epic 0)              | Toujours non adressé                                        | ❌     |

---

## 5. Actions & Améliorations (Action Items)

### Décision immédiate obligatoire

- [ ] **Trancher le Monitoring ETL** — cet item est reporté depuis l'Epic 0 (5 epics). Décision binaire avant toute planification future : soit planifier un spike dédié, soit archiver définitivement comme "won't fix". Ne pas reporter une 6ème fois.

### Dette technique

- [ ] **W2 — AbortController dans `useDeptCache.ts`** _(priorité haute)_ — Ajouter un `AbortController` dans `cacheInBackground` pour annuler le `fetch` si le composant est démonté. Évite `registerFileBuffer` orphelin après nettoyage.
  - Fichier : `src/hooks/useDeptCache.ts:35`
  - Trigger : remontée de composant rapide / changement de zone pendant téléchargement

### Accords d'équipe

- **Règle des 3 epics :** Tout action item non adressé sur 3 epics consécutifs fait l'objet d'une décision explicite (adresser ou clore). Le report silencieux n'est plus acceptable.
- **Health-check deps en début de story :** Si les dépendances du projet ont pu évoluer entre stories, vérifier `pnpm install` avant de démarrer l'implémentation.

---

## 6. Conclusion

L'Epic 4 livre sa story principale avec une qualité technique élevée : cache transparent, architecture documentée, review sérieuse. La décision d'écarté US-04-02 est saine et assumée — le mode offline ne correspond pas au modèle d'usage réel de l'application.

Le principal enseignement de cet epic n'est pas dans le code mais dans le process : **un action item qui se reporte sans décision formelle finit par devenir du bruit**. Le monitoring ETL doit être tranché, pas reporté.

L'architecture de cache mise en place (IndexedDB + Zustand métadonnées + DuckDB `registerFileBuffer`) est solide et réutilisable pour tout besoin futur de persistance locale.
