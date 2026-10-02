# CA IMMO — Backend API (Laravel 13 + PostgreSQL)

API du **site public de demandes** et du **back office** CA IMMO.
Le frontend vit dans le dossier voisin `frontend/` (React + Vite).

## Démarrage rapide

```bash
composer install                 # (vendor/ absent après une restauration)
cp .env.example .env             # puis adapter DB_*, ADMIN_*
php artisan key:generate         # si .env neuf
php artisan migrate --seed       # crée les tables + le catalogue initial
php artisan serve --host 0.0.0.0 --port 8000
```

Compte administrateur créé par le seeder (à changer en production) :

| Email | Mot de passe |
|---|---|
| `admin@caimmo.mg` | `caimmo2026` |

> Pilotable par variables d'environnement : `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

## Base de données (PostgreSQL)

| Table | Rôle |
|---|---|
| `users` | administrateurs du back office (Sanctum) |
| `lands` | catalogue public (galeries/atouts en `jsonb`) |
| `realisations` | réalisations publiées (photos = liste d'URLs) |
| `clients` | fiches créées/rapprochées automatiquement (email ou téléphone) |
| `requests` | demandes du site : `interet`, `visite`, `recherche`, `vente` |
| `messages` | messages de contact |
| `personal_access_tokens` | jetons Sanctum |

## Endpoints — site public (sans authentification)

| Méthode | URL | Description |
|---|---|---|
| GET | `/api/v1/lands` | Catalogue complet |
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

Tous les appels protégés exigent `Authorization: Bearer <token>` et
`Accept: application/json`.

## CORS

En développement, le frontend Vite **proxifie** `/api` vers
`http://127.0.0.1:8000` (aucun CORS nécessaire). En production,
renseignez `FRONTEND_URL=https://votre-site.mg` dans `.env`.

## Arborescence

```
app/Http/Controllers/Api/V1/Public/   # lectures + demandes du site
app/Http/Controllers/Api/V1/Admin/    # back office (Sanctum)
app/Models/                           # Land, Realisation, Client, SiteRequest…
database/migrations/                  # schéma PostgreSQL
database/seeders/                     # admin, catalogue (data/lands.json), réalisations
routes/api.php                        # toutes les routes /api/v1
```
