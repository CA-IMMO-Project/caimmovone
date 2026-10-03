# Modifications apportées au frontend

Travail réalisé sur `frontend/` uniquement — **aucun fichier ajouté au projet,
aucune modification du backend Laravel ni des services API**. Les URLs
existantes (`/terrains`, `/terrains/:id`, …) sont conservées.

## 1. Restyle du site public (charte CA-IMMO)

Alignement sur la charte du dépôt de référence **CA-IMMO-Project/CA-IMMO-Frontend-** :
marine `#0b1e42` + or `#f7c325`, boutons dorés arrondis à ombre dorée, cartes
arrondies à ombre douce, fonds blanc / brume `#f3f6fb`, titres Poppins,
« eyebrow » à tiret doré. Pages concernées : Accueil, Terrains, Détail terrain,
Recherche, Vendre, À propos, Contact, Navbar/Footer. **Réalisations inchangée.**

| Fichier | Changements |
|---|---|
| `src/index.css` | Couleur `--color-mist` (#f3f6fb) pour les fonds de section ; titres Poppins dans les pages publiques. |
| `src/shared/ui.tsx` | `PageHero` : variante `flat` (en-tête sans courbe) ; `ProgressSteps` : étape active or, passées marine. |
| `src/layout/Navbar.tsx` | Style référence ; lien « Accueil » retiré (le logo y mène). |
| `src/features/home/Home.tsx` | Sections « En quelques mots », « Nos solutions », « Nos engagements ». |
| `src/features/catalog/Lands.tsx` | Héros avec recherche rapide + en-tête de résultats. |
| `src/features/catalog/LandCard.tsx` | Carte terrain réécrite au style référence. |
| `src/features/catalog/LandDetail.tsx` | Carte prix à liseré or, carte « Votre conseiller », barre Retour/Partager. |
| `src/features/search/SearchRequest.tsx` | Encart marine à gauche, étapes dorées. |
| `src/features/sell/Sell.tsx` | Encart marine à gauche, étapes dorées. |
| `src/features/contact/ContactPage.tsx` | Mise aux couleurs de la charte. |
| `src/features/about/About.tsx` | Mise aux couleurs de la charte. |

Les fils d'Ariane « Accueil › … » ont été **supprimés** de toutes les pages
(redondants avec le logo et le menu).

## 2. Validation des formulaires publics

- **Champs obligatoires bloquants** à chaque étape : on ne peut plus passer à
  l'étape suivante si un champ requis est vide ou invalide (Recherche : zone,
  budget/surface personnalisés ; Vendre : coordonnées + téléphone/email
  vérifiés dès l'étape 1, n° de pièce, superficie et prix numériques positifs).
- **Téléphone** : les lettres sont bloquées à la saisie (`sanitizePhone` dans
  `src/lib/validate.ts`) sur Recherche, Vendre et Contact ; format malgache
  vérifié (`034 12 345 67` ou `+261 34 12 345 67`).

## 3. Uniformisation des listes du back-office

Deux composants partagés dans `src/admin/crm/kit.tsx` appliqués aux 7 écrans
(Base clients, Demandes d'achat, Visites, Recherches, À vendre, Terrains,
Messages) :

- **`PageHeader`** : en-tête identique (titre + sous-titre + action à droite) ;
- **`ListToolbar`** : recherche avec icône, bouton « Filtres » dépliable avec
  pastille du nombre de filtres actifs, actions groupées, exports
  Excel / PDF / Imprimer toujours au même endroit.

Améliorations UX transverses :

- tri par défaut « à traiter d'abord, puis plus récentes » sur toutes les listes ;
- dates relatives « il y a 2 h / hier / il y a 3 j » (date exacte au survol) — `RelDate` ;
- lignes non traitées surlignées (fond bleuté) — prop `rowClass` de `DataTable` ;
- téléphones cliquables `tel:` sans ouvrir la fiche — `TelLink` ;
- Messages : non lus en tête avec liseré doré + pastille + étiquette « Non lu »
  + compteur, recherche et filtre statut uniformes.

## Application du patch

```bash
# à la racine du dépôt soutetest
git apply soutetest-modifications.patch
git status          # vérifier les fichiers modifiés
npm --prefix frontend install
npm --prefix frontend run lint    # tsc --noEmit : doit passer sans erreur
```
