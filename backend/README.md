# CA IMMO — Backend API (Laravel 13 + PostgreSQL)

API du **site public de demandes** et du **back office** CA IMMO.
Le frontend vit dans le dossier voisin `frontend/` (React + Vite).

## Démarrage rapide

```bash
composer install                 # (vendor/ absent après une restauration)
cp .env.example .env             # puis adapter DB_*, ADMIN_*
php artisan key:generate         # si .env neuf
php artisan migrate              # crée les tables, sans données métier inventées
php artisan db:seed              # crée le compte administrateur configuré
php artisan serve --host 0.0.0.0 --port 8000
```

Avant d'exécuter les seeders, définissez un compte administrateur unique dans `.env` :

```env
ADMIN_EMAIL=admin@votre-domaine.mg
ADMIN_PASSWORD=un-secret-long-et-unique
```

Aucun identifiant par défaut n'est fourni. Le seeder refuse un mot de passe de moins de 12 caractères et ne réinitialise pas un compte déjà présent. Ne commitez jamais le fichier `.env`.

## Jeu facultatif pour présenter au client

Sur une **base distincte**, en `APP_ENV=local`, `staging` ou `presentation` :

```bash
php artisan migrate
php artisan presentation:install
```

10 terrains, 12 clients, 8 achats, 4 visites, 4 recherches, 4 dossiers vendeurs,
6 messages et **50 PDF réels consultables**, portant « Exemple — sans valeur juridique ».
Il s'agit de données fictives, pas de pièces ou transactions authentiques.
Aucun grand bandeau n'est ajouté au site. Les projets-types de réalisations restent non publiés.

Le chargement est volontaire, relançable sans doublons, additif et refusé en production.
Les lignes existantes et les modifications apportées aux exemples sont conservées.
L'ancien reset du catalogue ne supprime plus les terrains.

Guide détaillé : [données et dossiers de présentation](../docs/presentation-backend-ca-immo.md).
Index des fichiers : [50 pièces PDF](database/seeders/fixtures/INDEX_DES_PIECES.md).

## Terrain « vérifié »

Le badge, le filtre, la case d'édition, les déductions automatiques et le champ API
sont retirés. La colonne historique `lands.verified` reste en base, inactive et masquée.
Les anciens statuts de dossiers sont adaptés à la lecture sans effacer les pièces
ou l'historique. La publication, la disponibilité et la présence d'un document
ne constituent pas une certification foncière.


## Base de données (PostgreSQL)

| Table | Rôle |
|---|---|
| `users` | administrateurs du back office (Sanctum) |
| `lands` | catalogue public (galeries/atouts en `jsonb`) |
| `realisations` | réalisations publiées (photos = liste d'URLs) |
| `clients` | fiches créées/rapprochées automatiquement (email ou téléphone) |
| `requests` | demandes du site : `interet`, `visite`, `recherche`, `vente` |
| `messages` | messages de contact |
| `searches` | recherches immobilières personnalisées |
| `land_files` | dossiers de terrains proposés à la vente |
| `reference_counters` | génération atomique des références métier |
| `presentation_records` | clés stables des seuls exemples installés volontairement |
| `personal_access_tokens` | jetons Sanctum |

## Endpoints — site public (sans authentification)

| Méthode | URL | Description |
|---|---|---|
| GET | `/api/v1/lands` | Terrains publiés, sans coordonnées des acheteurs ni liens privés |
| GET | `/api/v1/lands/{id}` | Fiche terrain |
| GET | `/api/v1/realisations` | Réalisations publiées |
| POST | `/api/v1/requests` | **Demande achat / visite** (throttlée 12/min) |
| POST | `/api/v1/searches` | Recherche sur mesure → écran « Recherches » (REC-) |
| POST | `/api/v1/land-files` | Dépôt de terrain → écran « Dossiers de vente » (VEN-) |
| POST | `/api/v1/messages` | Message de contact → écran « Messages » |

**POST /api/v1/requests** — corps (camelCase, comme le frontend) :

```json
{
  "kind": "interet",            // interet | visite
  "fullName": "Jean Rakoto",    // requis
  "phone": "034 00 111 22",     // requis
  "email": "jean@exemple.mg",   // facultatif
  "landId": "1",                // facultatif (fiches terrain)
  "message": "…",               // texte formaté par le formulaire
  "budget": "…", "visitDate": "…", "visitTime": "…", "paymentMode": "…",
  "profession": "…", "duration": "…", "downPaymentAmount": "…"
}
```

Réponse : `{ "ref": "ACH-260930", "message": "…" }` — la référence est
générée côté serveur (`ACH|VIS|REC|VEN-YYMMDD`, suffixe `-2`, `-3`… si
plusieurs demandes le même jour).

## Endpoints — back office (jeton Sanctum)

| Méthode | URL | Description |
|---|---|---|
| POST | `/api/v1/admin/login` | `{email, password}` → `{token, user}` |
| GET | `/api/v1/admin/me` | Utilisateur du jeton |
| POST | `/api/v1/admin/logout` | Révoque le jeton |
| GET | `/api/v1/admin/stats` | Compteurs du tableau de bord |
| GET/PATCH/DELETE | `/api/v1/admin/requests` | Demandes (`?kind=`, `?status=`) |
| GET/PATCH/DELETE | `/api/v1/admin/clients` | Fiches clients |
| GET/PATCH/DELETE | `/api/v1/admin/messages` | Messages |
| CRUD | `/api/v1/admin/lands` | Catalogue |
| CRUD | `/api/v1/admin/realisations` | Réalisations |

Tous les appels protégés exigent `Authorization: Bearer <token>`, l'ability
Sanctum `admin` et `Accept: application/json`. Les jetons expirent après
`SANCTUM_TOKEN_EXPIRATION` minutes (480 par défaut) et les anciennes sessions
sont révoquées lors d'une nouvelle connexion.

## Fichiers

- Les médias explicitement destinés au catalogue et aux réalisations sont
  enregistrés sur le disque `public`.
- Les pièces CRM, documents fonciers et pièces d'identité sont enregistrés sur
  le disque privé et servis uniquement par `/api/v1/admin/files/{path}` après
  authentification Sanctum.
- Les extensions, types MIME, tailles et nombres de fichiers sont contrôlés côté serveur.
- Après une mise à niveau d'une ancienne installation, exécutez
  `php artisan files:secure-legacy` pour déplacer les anciens dépôts vendeurs
  de `storage/app/public` vers le disque privé.

## CORS

En développement, le frontend Vite **proxifie** `/api` vers
`http://127.0.0.1:8000` (aucun CORS nécessaire). En production,
renseignez `FRONTEND_URL=https://votre-site.mg` dans `.env`. L'application
refuse de démarrer en production si cette origine vaut `*` ou si `APP_DEBUG`
est activé.

## Contrôles qualité

```bash
php artisan test
vendor/bin/pint --test
cd ../frontend && npm ci && npm run lint && npm run build
```

Le workflow `.github/workflows/ci.yml` exécute automatiquement ces contrôles
avec PostgreSQL 18 à chaque push et pull request.

## Arborescence

```
app/Http/Controllers/Api/V1/Public/   # lectures + demandes du site
app/Http/Controllers/Api/V1/Admin/    # back office (Sanctum)
app/Models/                           # Land, Realisation, Client, SiteRequest…
database/migrations/                  # schéma PostgreSQL
database/seeders/                     # admin, catalogue (data/lands.json), réalisations
routes/api.php                        # toutes les routes /api/v1
```
