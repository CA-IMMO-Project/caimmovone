# 🏗️ Architecture — Restructuration « Feature-Driven » du site CA IMMO

> ⚠️ **Le document ci-dessous décrit la restructuration interne historique**
> (époque localStorage/CRM). Il est conservé pour la traçabilité, mais
> l'architecture ACTUELLE est résumée ici.

## 📌 Architecture actuelle (depuis la bascule vers l'API Laravel)

Le projet est désormais réparti en deux dossiers :

| Dossier | Rôle |
|---|---|
| `frontend/` | Site public de demandes + back office React (ce dépôt) |
| `backend/` | API Laravel 13 + PostgreSQL (`/api/v1`, Sanctum pour l'admin) |

### Correspondance avec le MVC Laravel

| Laravel | Frontend React | Où |
|---|---|---|
| `app/Http/Controllers` | Pages / composants | `src/features/**` |
| `app/Models` | Types / DTO | `src/types.ts` |
| **`app/Services` (appels & logique)** | **Couche services — appels au backend** | **`src/services/**`** |
| `app/Support` (helpers) | Utilitaires purs (zéro réseau) | `src/lib/**` |
| `routes/api.php` | Proxy Vite `/api` → port 8000 | `vite.config.ts` |

### La couche `src/services/` (seul point de sortie réseau)

| Fichier | Responsabilité | Endpoints |
|---|---|---|
| `apiClient.ts` | Client HTTP bas niveau (fetch, erreurs FR, base `/api/v1`) | — |
| `landService.ts` | Catalogue : chargement (cache), filtres, tri | `GET /lands`, `/lands/{id}` |
| `requestService.ts` | Demandes (achat, visite, recherche, vente) + messages | `POST /requests`, `/messages` |
| `realisationService.ts` | Réalisations publiées | `GET /realisations` |

**Règles :**
1. Seuls les fichiers de `src/services/` parlent au backend — aucun `fetch`
   ailleurs dans le code applicatif.
2. `src/lib/` ne contient plus que des helpers purs sans réseau
   (`format`, `contact`, helpers `land`, `store` du back office).
3. Pas d'espace client ni de comptes clients : le site public enregistre
   des demandes à coordonnées libres ; le back office les traite.

---

> **Périmètre historique : tout le code PUBLIC (site + espace client). Le backoffice `src/admin/` est hors périmètre et n'a pas été touché** — ni déplacé, ni modifié. Ses imports (`../types`, `../lib/store`, `../lib/format`) restent garantis par le noyau partagé.

---

## Étape 1 — Diagnostic de l'existant

| # | Problème | Preuve | Gravité |
|---|---|---|---|
| 1 | **Couplage bidirectionnel site ↔ admin** : la partie publique importait directement le CRM du backoffice | `lib/api.ts`, `pages/Account.tsx`, `pages/Realisations.tsx`, `App.tsx` importaient `admin/crm/*` | 🔴 |
| 2 | **`lib/api.ts` hybride** : lecture catalogue + écritures + effets de bord CRM (double écriture store + CRM) dans un module censé être « l'API » | `createReservation()` écrivait dans 2 systèmes | 🔴 |
| 3 | **Types éclatés** : `ReservationPayload` dans `api.ts`, `Reservation`/`RequestStatus` dans `store.ts`… et `store.ts` importait `api.ts` (dépendance montante dans le noyau) | `store.ts` ligne 3 : `from './api'` | 🔴 |
| 4 | **Composants-dieux** : `Account.tsx` 1433 lignes (données + rapprochement CRM + UI + formatage), `LandDetail.tsx` 918 lignes avec 2 formulaires imbriqués | wc -l | 🟠 |
| 5 | **Pattern dupliqué ×3** : `authOpen` + `pendingRef` + `finalize` recopié dans InterestForm, VisitForm, SearchRequest, Sell | grep `pendingRef` | 🟠 |
| 6 | **Helpers de date dupliqués** : `parseDate`/`fmtDate`/`fmtShort` définis dans `Account.tsx` alors que `lib/format.ts` existait | grep | 🟡 |
| 7 | **Code mort** : `src/espace/**` = 887 lignes jamais routées (vestige du dépôt d'origine) | aucun import dans `App.tsx` | 🟠 |
| 8 | **Config polluée** : dépendances `express`/`dotenv` inutilisées, alias `@` → racine du projet (faux, jamais utilisé), `define GEMINI_API_KEY` fantôme | grep | 🟡 |
| 9 | **Dossiers « plats » sans frontières** : `pages/`, `components/`, `data/` mélangés sans responsabilité | — | 🟠 |

**Contrainte structurelle découverte** : l'admin importe `../types`, `../lib/store`, `../lib/format` → ces 3 chemins sont **épinglés** et ne pouvaient pas bouger. L'architecture en tient compte.

---

## Étape 2 — Arborescence cible

```
src/
├── main.tsx                     # entrée (référencée par index.html) — inchangée
├── index.css                    # styles globaux — inchangé
├── types.ts                     # ⚒ ÉPINGLÉ (admin l'importe) — TOUS les types du domaine
│
├── app/                         # composition de l'application
│   └── App.tsx                  ← src/App.tsx          (routes pures uniquement)
│
├── lib/                         # NOYAU PARTAGÉ — chemins stables (site + admin)
│   ├── store.ts                 # ⚒ épinglé, inchangé (ré-exporte les types)
│   ├── format.ts                # ⚒ épinglé (+ helpers date dédupliqués)
│   ├── auth.ts                  # comptes utilisateurs (session locale)
│   ├── contact.ts               # coordonnées de l'agence
│   ├── land.ts                  # normalizeLand + favoris par compte
│   ├── api.ts                   ← PUR LECTURE catalogue (filtres, tri, zones)
│   ├── dossiers.ts              ★ NOUVEAU passerelle CRM (seul importeur de admin/**)
│   └── data/lands.ts            ← src/data/lands.ts (graine du store)
│
├── shared/                      # UI transverse sans métier
│   ├── ui.tsx                   ← src/components/ui.tsx
│   ├── NotFound.tsx             ← src/pages/NotFound.tsx
│   ├── Pagination.tsx           ← src/components/Pagination.tsx
│   └── MapVisual.tsx            ← src/components/MapVisual.tsx
│
├── layout/                      # habillage du site public
│   ├── Navbar.tsx               ← src/components/Navbar.tsx
│   └── Footer.tsx               ← src/components/Footer.tsx
│
├── features/                    # ★ une fonctionnalité = un dossier autonome
│   ├── home/Home.tsx            ← src/pages/Home.tsx
│   ├── about/About.tsx          ← src/pages/About.tsx
│   ├── auth/
│   │   ├── Auth.tsx             ← src/pages/Auth.tsx
│   │   ├── AuthModule.tsx       ← src/components/AuthModule.tsx
│   │   └── usePendingAuth.ts    ★ hook « action après connexion » (catalog, search, sell)
│   ├── catalog/                 # terrains : liste, fiche, carte
│   │   ├── Lands.tsx            ← src/pages/Lands.tsx
│   │   ├── LandDetail.tsx       ← src/pages/LandDetail.tsx (918 → 555 lignes)
│   │   ├── LandCard.tsx         ← src/components/LandCard.tsx
│   │   ├── components/InterestForm.tsx   ★ extrait de LandDetail
│   │   ├── components/VisitForm.tsx      ★ extrait de LandDetail
│   │   └── (hooks/usePendingAuth déplacé dans auth/ — voir ci-dessous)
│   ├── search/SearchRequest.tsx ← src/pages/SearchRequest.tsx
│   ├── sell/Sell.tsx            ← src/pages/Sell.tsx
│   ├── realisations/Realisations.tsx ← src/pages/Realisations.tsx
│   └── account/                 # espace client
│       ├── Account.tsx          ← src/pages/Account.tsx (1433 → 1045 lignes)
│       ├── components/kit.tsx   ★ Card, StatusBadge, StageTrack, LandMini…
│       └── hooks/useClientSpace.ts ★ toute la donnée de l'espace
│
├── admin/                       # ⛔ BACKOFFICE — INTACT (pas notre terrain)
└── (espace/ supprimé — code mort)
```

**Règles de dépendances** (à faire respecter en review) :
1. `features/*` → `lib`, `shared`, `layout` : ✅ autorisé
2. `features/A` → `features/B` : toléré uniquement vers des briques « services » (`auth/AuthModule`, `catalog/LandCard`)
3. **Tout le monde → `admin/` : ❌ INTERDIT**, sauf `lib/dossiers.ts` (passerelle unique) et `app/App.tsx` (routage)
4. `lib/*` → `features/*` : ❌ interdit (le noyau ne connaît pas les fonctionnalités)

---

## Étape 3 — Plan de déplacement (tel qu'exécuté, rejouable dans Cursor)

```bash
# Dossiers
mkdir -p src/app src/layout src/shared src/lib/data \
  src/features/{home,about,auth,search,sell,realisations} \
  src/features/catalog/{components,hooks} \
  src/features/account/{components,hooks}

# Déplacements (git mv = historique préservé)
git mv src/App.tsx                       src/app/App.tsx
git mv src/components/Navbar.tsx         src/layout/Navbar.tsx
git mv src/components/Footer.tsx         src/layout/Footer.tsx
git mv src/components/ui.tsx             src/shared/ui.tsx
git mv src/components/Pagination.tsx     src/shared/Pagination.tsx
git mv src/components/MapVisual.tsx      src/shared/MapVisual.tsx
git mv src/pages/NotFound.tsx            src/shared/NotFound.tsx
git mv src/pages/Home.tsx                src/features/home/Home.tsx
git mv src/pages/About.tsx               src/features/about/About.tsx
git mv src/pages/Auth.tsx                src/features/auth/Auth.tsx
git mv src/components/AuthModule.tsx     src/features/auth/AuthModule.tsx
git mv src/pages/Lands.tsx               src/features/catalog/Lands.tsx
git mv src/pages/LandDetail.tsx          src/features/catalog/LandDetail.tsx
git mv src/components/LandCard.tsx       src/features/catalog/LandCard.tsx
git mv src/pages/SearchRequest.tsx       src/features/search/SearchRequest.tsx
git mv src/pages/Sell.tsx                src/features/sell/Sell.tsx
git mv src/pages/Realisations.tsx        src/features/realisations/Realisations.tsx
git mv src/pages/Account.tsx             src/features/account/Account.tsx
git mv src/data/lands.ts                 src/lib/data/lands.ts

# Code mort (887 lignes jamais routées)
git rm -r src/espace
```

Suivi de la correction des imports (mécanique, vérifiée par `tsc --noEmit` → **0 erreur**) :
`main.tsx` → `./app/App` ; `store.ts` → `./data/lands` ; les fichiers de `features/<f>/` passent en `../../lib/…`, `../../shared/…`, `../../types` ; `App.tsx` référence les features et `../admin/…`.

---

## Étape 4 — Refactorings des fichiers critiques

### 4.1 `lib/dossiers.ts` — la passerelle CRM (tue le couplage)

Avant : 4 fichiers du site public importaient `admin/crm/*`. Après : **un seul**.

```ts
// lib/dossiers.ts — SEUL module hors admin autorisé à importer src/admin/**
import { createBuyRequestFromSite, getBuyRequests } from '../admin/crm/model';
import { createSearch, findOrCreateClient, getRealisations, getSearches } from '../admin/crm/people';

export function getClientDossiers(user: AuthUser): BuyRequest[] { … }   // rapprochement compte ↔ CRM
export function getClientSearches(user: AuthUser): SpecificSearch[] { … }
export function createReservation(payload: ReservationPayload): void { … } // store local + dossier CRM
export function submitSpecificSearch(fields: SearchFields): void { … }
export function getPublishedRealisations(): Realisation[] { … }
export function nextRequestRef(prefix: 'ACH'|'VIS'|'REC'|'VEN'): string { … }
```

> Le jour où le backoffice devient une vraie API REST, **seul ce fichier change**.

### 4.2 `lib/api.ts` — ne fait plus qu'une chose (91 lignes)

Lecture catalogue uniquement : `fetchLands` (filtres/tri), `fetchLand`, `fetchRegions`, `fetchZones`. Les écritures sont parties dans `dossiers.ts`, les types dans `types.ts`.

### 4.3 `types.ts` — point unique de définition

`ReservationPayload` (avant dans `api.ts`), `Reservation`/`RequestStatus` (avant dans `store.ts`), `RequestKind`… tout est regroupé et documenté. `store.ts` se contente de ré-exporter. Le noyau n'a plus de dépendance montante.

### 4.4 `Account.tsx` — 1433 → 1045 + 2 modules spécialisés

- **`hooks/useClientSpace.ts` (252 l.)** : bucket des demandes, dossiers CRM, dédoublonnage legacy, visites fusionnées, notifications, compteurs, favoris → *la page n'est plus qu'affichage*
- **`components/kit.tsx` (183 l.)** : le langage visuel backoffice (Card, StatusBadge, StageTrack, LandMini, boutons navy/or)
- Bonus types : suppression des casts `land as { featured?: boolean }` (le champ existe dans `Land`)

### 4.5 `LandDetail.tsx` — 918 → 555 lignes + 3 modules

- **`components/InterestForm.tsx` (262 l.)** et **`components/VisitForm.tsx` (92 l.)** extraits
- **`hooks/usePendingAuth.ts` (38 l.)** : factorise le pattern dupliqué « action réservée aux connectés »

```ts
const { user, guard, authModalProps } = usePendingAuth<ReservationPayload>();
// …
guard(payload, finalize);          // connecté → part immédiatement ; sinon → modale
<AuthModal {...authModalProps(finalize)} />  // reprend l'action après connexion
```
*(SearchRequest et Sell peuvent adopter ce hook à leur prochaine modification.)*

### 4.6 `lib/format.ts` — helpers de date uniques

`parseDate`, `fmtDate`, `fmtShort`, `fmtMonthShort`, `fmtTime` — les copies locales d'`Account.tsx` sont supprimées.

### 4.7 Configuration

- `package.json` : `- express`, `- dotenv` (jamais importés)
- `vite.config.ts` : suppression de l'alias `@` (pointait vers la racine, jamais utilisé) et du `define GEMINI_API_KEY` fantôme

---

## Vérifications finales

| Contrôle | Résultat |
|---|---|
| `tsc --noEmit` | **0 erreur** |
| `vite build` (production) | ✅ |
| Serveur dev — accueil + tous les modules déplacés + admin | ✅ 200 |
| `src/admin/` modifié ? | **NON** (`git diff` vide sur le dossier) |
| Imports `admin/**` hors admin | `lib/dossiers.ts` + `app/App.tsx` (routage) uniquement |
