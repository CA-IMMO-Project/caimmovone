# Renforcement CA IMMO — phase 1 et 2

## Changements appliqués

- contraintes PostgreSQL réelles entre demandes, clients, terrains, recherches et dossiers vendeurs ;
- références métier atomiques via `reference_counters` ;
- transactions automatiques sur les soumissions publiques ;
- contrôle Sanctum `abilities:admin`, expiration et révocation des anciens jetons ;
- suppression des identifiants administrateur par défaut ;
- refus d'un CORS générique et de `APP_DEBUG=true` en production ;
- stockage privé des pièces CRM, documents fonciers et pièces d'identité ;
- route de lecture privée authentifiée ;
- médias publics limités aux images explicitement destinées au catalogue/réalisations ;
- validation centralisée dans des classes `FormRequest` ;
- formats, coordonnées, tailles et nombres de fichiers contrôlés ;
- 14 tests fonctionnels ciblant l'authentification, les abilities, les demandes, les doublons, les fichiers, les références et les relations ;
- CI GitHub Actions avec PostgreSQL 18, PHP 8.3 et Node 22 ;
- dépendances frontend mises à jour (`npm audit`: 0 vulnérabilité au moment du contrôle).

## Mise à niveau locale

```bash
git apply ca-immo-hardening.patch   # inutile si vous utilisez directement le dossier corrigé

cd backend
cp .env.example .env
# Renseigner APP_KEY, DB_*, ADMIN_EMAIL, ADMIN_PASSWORD et FRONTEND_URL
composer install
php artisan key:generate            # seulement pour un nouvel environnement
php artisan migrate
php artisan files:secure-legacy       # déplace les anciens dépôts vendeurs publics
php artisan test
vendor/bin/pint --test

cd ../frontend
npm ci
npm run lint
npm run build
```

## Déploiement

Avant la migration, effectuez une sauvegarde PostgreSQL et une copie de `storage/app`.
La migration d'intégrité met à `NULL` les anciennes références orphelines avant d'ajouter les clés étrangères ; elle ne supprime pas les dossiers commerciaux.

Variables obligatoires/recommandées :

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.votre-domaine.mg
FRONTEND_URL=https://votre-domaine.mg
ADMIN_EMAIL=adresse-administrateur
ADMIN_PASSWORD=secret-unique-de-12-caracteres-minimum
SANCTUM_TOKEN_EXPIRATION=480
SANCTUM_TOKEN_PREFIX=caimmo_
```

Après déploiement :

```bash
php artisan optimize
php artisan migrate --force
php artisan storage:link
php artisan sanctum:prune-expired --hours=24
```

Planifiez `sanctum:prune-expired` quotidiennement sur le serveur.

## Limite connue

Les tests backend doivent être exécutés avec PostgreSQL : le générateur atomique utilise `INSERT ... ON CONFLICT ... RETURNING` et le schéma utilise `jsonb`. La CI fournie constitue l'environnement de référence PostgreSQL 18.
