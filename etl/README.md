# Pipeline ETL - Prix des Carburants (RPi5)

Ce script télécharge les prix des carburants depuis data.gouv.fr, les convertit en Parquet partitionné par département, et les upload sur Hugging Face Hub.

## Prérequis

- Raspberry Pi 5 (ou autre serveur Linux/Windows/Mac)
- Node.js 18+ installé
- **pnpm** installé (`npm install -g pnpm`)
- Compte Hugging Face avec un Token en écriture

## Configuration Hugging Face

Avant de lancer le script, vous devez préparer votre environnement Hugging Face :

1. **Obtenir un Token d'accès (Write)** :
   - Allez dans [Settings > Access Tokens](https://huggingface.co/settings/tokens).
   - Cliquez sur "New token".
   - Nommez-le (ex: `fuel-etl-rpi`).
   - Sélectionnez le rôle **"Write"** (indispensable pour uploader les données).
   - Copiez le token (il commence par `hf_...`).

2. **Créer un Dataset** :
   - Allez sur [Create a new Dataset](https://huggingface.co/new-dataset).
   - Nom du dataset : **`prix-carburants-france`** (ou autre nom de votre choix).
   - Ce sera votre `HF_REPO` (ex: `votre-pseudo/prix-carburants-france`).

## Installation

1. Cloner le repo et aller dans le dossier `etl`:
   ```bash
   cd etl
   ```

2. Installer les dépendances avec pnpm:
   ```bash
   pnpm install
   ```

3. Configurer les variables d'environnement:
   Copier `.env.example` vers `.env` et remplir les valeurs:
   ```bash
   cp .env.example .env
   nano .env
   ```
   - `HF_TOKEN`: Votre token Hugging Face (créé ci-dessus)
   - `HF_REPO`: Le nom de votre dataset (ex: `votre-pseudo/prix-carburants-france`)
   - `CRON_SCHEDULE`: La fréquence de mise à jour (ex: `0 * * * *` pour toutes les heures)

4. Compiler le script TypeScript en JavaScript:
   ```bash
   pnpm build
   ```

## Démarrage avec PM2

PM2 permet de lancer le script en arrière-plan et de le redémarrer automatiquement au boot.

1. Installer PM2 globalement (si pas déjà fait):
   ```bash
   pnpm add -g pm2
   ```

2. Lancer le script via la configuration ecosystem:
   ```bash
   pm2 start ecosystem.config.js
   ```

3. Vérifier les logs:
   ```bash
   pm2 logs fuel-etl
   ```

4. Configurer le démarrage automatique au boot:
   ```bash
   pm2 startup
   pm2 save
   ```
   (Suivre les instructions affichées par `pm2 startup`)

## Fonctionnement

- Le script se lance immédiatement au démarrage.
- Il télécharge le fichier CSV depuis `data.economie.gouv.fr`.
- Il utilise DuckDB pour convertir le CSV en Parquet, partitionné par `code_departement`.
- Il upload le dossier `data/` sur le repo Hugging Face spécifié.
- Il consolide ensuite les données historiques (Journalier et Mensuel) pour optimiser la lecture.
- Il attend ensuite la prochaine exécution planifiée via `node-cron`.

## Consolidation des Données

Le pipeline inclut une étape de consolidation automatique :

1. **Consolidation Journalière** :
   - Chaque exécution vérifie les données du jour.
   - Fusionne les fichiers horaires en un fichier partitionné par jour : `consolidated/daily/year=YYYY/month=MM/day=DD/...`
   - Conserve la granularité fine dans `history/`.

2. **Consolidation Mensuelle** :
   - Le dernier jour du mois, fusionne les données journalières en un fichier mensuel : `consolidated/monthly/year=YYYY/month=MM/...`

Ceci permet des requêtes analytiques rapides sur des périodes plus longues sans lire des milliers de petits fichiers.

## Dépannage

- Si l'upload échoue, vérifier le token HF et les permissions du repo.
- Si DuckDB échoue, vérifier la connectivité internet (pour télécharger le CSV).
- Logs PM2: `pm2 logs fuel-etl --lines 100`
