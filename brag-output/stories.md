# Stories Instagram — FaisTonPlein

Une vidéo de la série = une séquence de 3 ou 4 écrans en story : une accroche interactive, la vidéo, une relance avec le lien. Le sticker interactif fait participer avant la vidéo, et la vidéo apporte la réponse.

## Assets

| Fichier                        | Usage                                                                 |
| ------------------------------ | --------------------------------------------------------------------- |
| `story-bg/fond-story-logo.png` | Fond des écrans fixes : halos de la série, logo et nom en haut        |
| `story-bg/fond-story.png`      | Même fond sans logo                                                   |
| `<nn>-<angle>.mp4`             | La vidéo, à publier telle quelle (moins de 60 s, un seul écran story) |
| `<nn>-<angle>.jpg`             | Vignette, pour un écran récap ou un repartage                         |
| `work/shots/*.png`             | Captures de l'app, pour un écran « preuve » ou un tuto                |

Les fonds se régénèrent avec `node story-bg.cjs` dans `work/`.

**Mise en page des écrans fixes** : texte d'accroche dans la zone indigo sous le logo, sticker dans la moitié basse, rien dans les 250 px du haut (barre de progression et profil) ni dans les 340 px du bas (champ de réponse). Titre en Space Grotesk, texte en Manrope, rouge prix `#ff637e`, vert prix `#00d492`, ambre `#ffba00`.

**Lien** : le sticker lien de chaque séquence pointe vers le « Lien story » de la vidéo dans `share-copy.txt` (UTM `utm_content=<nn>-<angle>`).

## 01 — Lancement

| #   | Écran                                                                       | Sticker       |
| --- | --------------------------------------------------------------------------- | ------------- |
| 1   | Fond logo : « Même ville, même gazole. Combien d'écart sur un plein ? »     | 🧠 Quiz 5 € / 21 € (bonne réponse) / 40 € |
| 2   | Vidéo `01-lancement.mp4` (réponse : 21 € sur 50 L, Lyon, 5 oct. 2026)       | —             |
| 3   | Fond logo : « Le prix de l'essence, on ne le choisit pas. Sa station, si. » | 🔗 Lien       |

## 02 — Bureau

| #   | Écran                                                         | Sticker                                   |
| --- | ------------------------------------------------------------- | ----------------------------------------- |
| 1   | Fond logo : « Vous comparez les prix plutôt sur… »            | 📊 Sondage « Téléphone » / « Ordinateur » |
| 2   | Vidéo `02-bureau.mp4`                                         | —                                         |
| 3   | Fond logo : « Carte, liste, historique : tout sur un écran. » | 🔗 Lien                                   |

## 03 — Coût réel

| #   | Écran                                                                         | Sticker                                                              |
| --- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | Fond logo : « Le 2e meilleur prix (2,249 €/L) est à 14,5 km. Vous y allez ? » | 📊 Sondage « Oui, ça vaut le coup » / « Non, trop loin »             |
| 2   | Vidéo `03-cout-reel.mp4` (la réponse : trajet compris, elle sort du podium)   | —                                                                    |
| 3   | Fond logo : « Plein + trajet : c'est ce total-là que vous payez. »            | 🔗 Lien + 🎚️ Curseur 🚗 « Faire un détour pour quelques centimes, ça vous tente ? » |

Chiffres : E. Leclerc Chaponnay, Gazole, 20 km autour de Lyon, 5 oct. 2026.

## 04 — Historique

| #   | Écran                                                                       | Sticker                                                          |
| --- | --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | Fond logo : « Le gazole a pris 2 centimes en 20 jours. Vous faites quoi ? » | 📊 Sondage « Le plein maintenant » / « J'attends que ça baisse » |
| 2   | Vidéo `04-historique.mp4`                                                   | —                                                                |
| 3   | Fond logo + capture de la courbe 30 jours (`work/shots/h2-chart.png`)                   | ❓ Question « Quelle station on regarde pour vous ? » + 🔗 Lien  |

Les réponses au sticker Question fournissent des villes et des stations pour les stories suivantes. Chiffre : + 0,019 €/L, moyenne nationale, 5 oct. 2026.

## 05 — Carburants

| #   | Écran                                                               | Sticker                                           |
| --- | ------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | Fond logo : « Vous roulez à quoi ? »                                | 📊 Sondage Gazole / SP95-E10 / SP98 / E85-GPLc    |
| 2   | Fond logo : « Le litre d'E85 en moyenne en France, à votre avis ? » | 🧠 Quiz 0,904 € (bonne réponse) / 1,45 € / 1,90 € |
| 3   | Vidéo `05-carburants.mp4`                                           | 🔗 Lien                                           |

Le sondage de l'écran 1 indique aussi quels carburants intéressent l'audience. Chiffres : moyennes nationales data.gouv.fr, 5 oct. 2026 (SP98 2,276 €/L, E85 0,904 €/L).

## 06 — Installable

| #   | Écran                                                                            | Sticker                        |
| --- | -------------------------------------------------------------------------------- | ------------------------------ |
| 1   | Fond logo : « Installer une appli pour s'en servir une fois, ça vous agace ? » | 🎚️ Curseur 😩                  |
| 2   | Vidéo `06-installable.mp4`                                                       | —                              |
| 3   | Fond logo + capture iPhone : Partager → « Sur l'écran d'accueil »                | —                              |
| 4   | Fond logo + capture du bouton « Installer » de l'app (`work/shots/i0-install-button.png`)                               | 🔗 Lien « Installer en 1 tap » |

Les écrans 3 et 4 séparent iOS et Android parce que l'installation d'une web app n'y passe pas par le même geste. Les captures du menu Partager d'iOS sont à faire sur un vrai iPhone.

## Après la série

- 📌 **Highlight « La série »** : épingler les séquences dans l'ordre, elles servent de mode d'emploi sur le profil.
- 🗳️ **Story récap** : fond logo, 4 vignettes `.jpg`, sondage « Quelle fonctionnalité vous sert le plus ? ».
- 📍 **Sticker lieu** (Lyon) sur les séquences qui affichent des prix lyonnais.
