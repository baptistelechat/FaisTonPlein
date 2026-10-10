# Brag plan — FaisTonPlein

> **Série (même DA, kit partagé dans `work/`)** — `kit.css` + `kit.js` (style, cadres téléphone/navigateur, reveal et outro communs), `audio.cjs` (instruments + compositeur : un morceau par vidéo dans l'ambiance de la série, repères par vidéo), `render.cjs <nom>`.
>
> **Ambiance sonore** — posé, confiant, un peu nocturne (`music` dans `work/theme.js`). Les morceaux des vidéos 01 à 06 y sont figés ; toute nouvelle vidéo reçoit un nouveau morceau dans cette ambiance.
> Une vidéo = un fichier `work/<nom>.html` (hook + scènes + repères). Captures de la prod : `node capture.cjs desktop|cost`.
>
> | Vidéo          | Durée  | Angle                                                                                      |
> | -------------- | ------ | ------------------------------------------------------------------------------------------ |
> | `01-lancement` | 27 s   | 21 € d'écart sur un plein → carte, tri par prix, itinéraire (mobile)                       |
> | `02-bureau`    | 28,5 s | Moyenne nationale → la caméra zoome sur la liste, l'historique 30 jours, le totem (bureau) |
> | `03-cout-reel` | 29 s   | Le 2e prix est à 14,5 km → profil véhicule, tri « Coût/trajet » (mobile)                   |
>
> Le storyboard ci-dessous est celui de la première version (21 s, `brag.mp4`).

**Format :** vertical 1080×1920, 30 fps, 21 s · **Ton :** default (punchy, propre) · **Langue :** français

## Rubrique

- **C'est quoi :** une web app qui trouve la station-service la moins chère près de chez vous, en France.
- **Pour qui :** tout conducteur qui fait le plein — il voit les prix avant de se déplacer.
- **Ce qui la distingue :** prix officiels (data.gouv.fr) rafraîchis toutes les 2 h, 6 carburants, tri par prix, itinéraire et temps de trajet inclus.
- **Claim le plus fort :** même ville, même carburant, 0,43 €/L d'écart → 21 € sur un plein de 50 L.
- **Accroche visuelle :** deux prix réels face à face (2,669 € vs 2,240 €), puis la vraie app dans un téléphone.
- **UI réelle montrée :** captures de la prod (viewport mobile, Lyon) — carte + clusters, liste « Les plus économiques », détail station avec itinéraire.
- **Légende de partage :** « Même ville, même gazole : 21 € d'écart sur un plein. »

## Angle

On ne vend pas une carte : on montre l'argent laissé sur la table, puis le geste qui le récupère (1 tap sur « Prix »).

## Chiffres (réels, relevés le 5 oct. 2026 à 14:00, Gazole, rayon 20 km autour de Lyon)

| Donnée                     | Valeur                        | Source                                         |
| -------------------------- | ----------------------------- | ---------------------------------------------- |
| Min                        | 2,240 €/L                     | barre de stats de l'app                        |
| Max                        | 2,669 €/L                     | barre de stats de l'app                        |
| Écart                      | 0,429 €/L → 21,45 € pour 50 L | calcul (50 L = préréglage « Berline / Break ») |
| Trajet vers la moins chère | 4,7 km · ~13 min              | détail station                                 |

## Storyboard

| #   | Temps       | Scène                                                                                  | Texte                                                                             | Son                                          |
| --- | ----------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | 0 – 4 s     | **Hook.** Fond sombre, deux prix réels arrivent face à face, puis l'écart sur un plein | « Même ville. Même gazole. » → 2,669 € / 2,240 € → « 21 € d'écart sur un plein. » | Nappe seule, deux notes sur les prix, montée |
| 2   | 4 – 6,5 s   | **Reveal.** Logo + nom                                                                 | « FaisTonPlein — La moins chère, près de chez vous. »                             | Impact, le beat démarre                      |
| 3   | 6,5 – 9,5 s | **Carte.** Le téléphone monte, vraie carte avec clusters ; tap sur « Prix »            | « Toutes les stations autour de vous. »                                           | Arpège, tap                                  |
| 4   | 9,5 – 13 s  | **Liste.** Le tiroir monte, la moins chère est entourée, léger zoom                    | « Triées par prix. La moins chère en premier. »                                   | Whoosh, ding                                 |
| 5   | 13 – 17 s   | **Détail.** Tap sur la carte → itinéraire tracé, zoom sur « ~13 min »                  | « Itinéraire inclus. Le meilleur prix à 13 min. »                                 | Tap, cloche                                  |
| 6   | 17 – 21 s   | **Outro.** Logo, punchline, les 6 carburants, URL                                      | « Le plein, oui. Plein tarif, non. » · faistonplein.vercel.app                    | Accord final                                 |

Total : 21 s.
