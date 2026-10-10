# CA IMMO — données et dossiers de présentation

## Ce qui est fourni

Un jeu réaliste pour présenter les parcours du site et du back office, **pas des offres, clients ou ventes authentiques**. Les noms, contacts, budgets, prix, limites et transactions du jeu sont fictifs. Les médias sont ceux de CA IMMO déjà utilisés dans le projet, à titre illustratif.

Il n'y a pas de grand bandeau « démonstration » sur le site. Chaque PDF porte discrètement **« Exemple — sans valeur juridique »**. Aucun titre foncier, CIN, passeport, acte, certificat, reçu bancaire, numéro de compte, signature ou cachet officiel n'est fabriqué.

| Collection | Nombre | Contenu |
|---|---:|---|
| Terrains | 10 | 7 publiés, 2 brouillons, 1 archivé ; prix en ariary, galeries, accès, coordonnées indicatives et pièces |
| Parcelles | 4 | Secteur Spécial : 500 + 500 + 500 + 758 = 2 258 m² ; disponible / réservé / vendu |
| Clients | 12 | 8 profils acquéreurs et 4 propriétaires, emails réservés `@example.com` |
| Demandes d'achat | 8 | Qualification, proposition, négociation, réservation et 2 achats finalisés fictifs |
| Visites | 4 | Demandée, confirmée, effectuée, reportée |
| Recherches | 4 | Besoins, budgets, zones et propositions rattachées aux terrains |
| Dossiers vendeurs | 4 | Propriétaires, pièces, suivi, notes et relances |
| Messages | 6 | Demandes liées aux profils du jeu |
| Projets-types | 3 | Internes et **non publiés** : aucune fausse réalisation livrée revendiquée |
| PDF | 50 | 30 pièces de terrains, 12 supports d'achat/visite, 4 profils propriétaires, 4 cahiers de recherche |

Les rendez-vous et relances sont calculés autour de la date de la **première installation** du jeu. Les références sont attribuées à cette installation, comme lors d’un import ; les dates de réception du scénario peuvent être antérieures. Les heures de suivi sont cohérentes avec le fuseau de Madagascar et stockées en UTC pour les colonnes de date. Les réinstallations ne déplacent pas les dates déjà enregistrées.

## 1. Appliquer cette mise à jour

Cette mise à jour complète le travail frontend précédent. Fusionner ses dossiers `backend/`, `frontend/` et `docs/` dans le projet existant **déjà mis à jour**, sans supprimer les autres fichiers. Si nécessaire, appliquer d'abord `CA_IMMO_tous_les_changements.zip` : cette archive précédente fournit notamment les médias et les reels déjà intégrés.

Avant toute intervention sur une installation existante :

- sauvegarder la base PostgreSQL et `backend/storage/app` ;
- conserver le `.env`, l'`APP_KEY`, les identifiants et les documents existants ;
- ne pas utiliser `migrate:fresh`, `db:wipe` ou une suppression du catalogue ;
- installer les dépendances habituelles depuis les fichiers lock du projet.

Le nouveau fichier de migration ajoute uniquement le registre `presentation_records`. Il ne supprime ni ne remplace de terrain, client, demande, document ou colonne historique.

## 2. Installation normale, sans exemples

Depuis `backend/` :

```bash
composer install
php artisan migrate
```

Sur une **installation neuve seulement**, créer `.env` depuis `.env.example` et générer `APP_KEY`. Ne pas remplacer un `.env` déjà utilisé.

Pour créer le compte d'administration sur une nouvelle installation, définir `ADMIN_EMAIL` et un `ADMIN_PASSWORD` unique d'au moins 12 caractères dans `.env`, puis :

```bash
php artisan db:seed
```

Le seeder normal ne charge **aucune donnée métier inventée**. Un compte correspondant déjà présent n'est pas réinitialisé. `presentation:install` ne crée ni ne modifie de compte administrateur.

## 3. Charger les données pour présenter au client

**Utiliser une base distincte réservée à la présentation.** Le garde-fou d'environnement ne peut pas vérifier à votre place que `DB_DATABASE` désigne la bonne base.

Dans le `.env` de cette installation séparée, configurer les paramètres PostgreSQL et `APP_ENV=local`, `staging` ou `presentation`. Ne pas changer temporairement l'environnement de la vraie application pour contourner la protection.

Puis :

```bash
cd backend
php artisan migrate
php artisan presentation:install
php artisan serve --host=0.0.0.0 --port=8000
```

Dans un autre terminal :

```bash
cd frontend
npm ci
npm run dev
```

Se connecter à `/admin/login` avec le compte configuré sur **cette** installation.

### Relancer sans doublons

```bash
php artisan presentation:install
```

- Une clé interne stable suit chaque ligne créée par ce jeu.
- Aucun rapprochement par id imposé, titre, nom, téléphone ou email ne réécrit une donnée existante.
- Les séquences PostgreSQL ne sont pas réinitialisées.
- Les modifications faites ensuite aux exemples restent conservées.
- Un PDF source manquant est signalé ; un PDF privé manquant peut être recopié.
- Un fichier déjà présent n'est pas écrasé.
- Des exemples supprimés peuvent être recréés ; les anciens historiques ne sont pas remis à zéro.
- Le chargement est refusé en `APP_ENV=production`, même avec `db:seed --force`.

Le bouton **« Charger les exemples »** est proposé uniquement dans les environnements autorisés. L'ancienne URL `/api/v1/admin/lands/reset` est conservée pour compatibilité, mais **ne supprime plus tout le catalogue** : elle effectue le même chargement additif.

Si l'ancienne base contient déjà des données issues des anciens seeders, elles restent présentes. Une base de présentation neuve donne le jeu cohérent décrit dans le tableau ci-dessus, sans mélange avec d'anciens exemples.

## 4. Où sont les documents ?

Sources incluses dans le projet :

```text
backend/database/seeders/fixtures/
  terrains/<clé>/fiche-commerciale.pdf
  terrains/<clé>/plan-indicatif.pdf
  terrains/<clé>/synthese-dossier.pdf
  crm/demandes/<clé>.pdf
  crm/proprietaires/<clé>.pdf
  crm/recherches/<clé>.pdf
  INDEX_DES_PIECES.md
  manifest.json
```

À l'installation, Laravel copie ces fichiers dans :

```text
backend/storage/app/private/presentation/v1/
```

Les liens du back office utilisent `/api/v1/admin/files/presentation/v1/...`. Ils nécessitent un jeton Sanctum doté de l'ability `admin`. Ne pas placer ces pièces dans `public/` ou remplacer les véritables documents d'une installation existante.

L'API publique ne transmet ni les URLs de pièces privées, ni les coordonnées des acheteurs enregistrées dans les ventes, ni l'historique interne des parcelles. Les métadonnées de pièces restent visibles sur la fiche terrain, sans prétendre à un contrôle juridique.

`manifest.json` donne la taille et le SHA-256 des **50 PDF source**. Les médias repris dans les galeries sont traçables dans `docs/medias-ca-immo.md`.

## 5. Parcours à montrer au client

1. **Catalogue du site → Domaine Lacéo — secteur Spécial** : les quatre parcelles et leurs disponibilités.
2. Onglet **Documents** : ouvrir puis télécharger la fiche, le plan ou la synthèse.
3. Onglet **Ventes & clients intéressés** : consulter l'achat finalisé du lot L03 et les demandes liées au lot L02.
4. **Demandes d'achat → Joël Rakotondrasoa** : besoin, budget, terrain choisi, notes et suivi.
5. **Visites → visite confirmée de Joël** : créneau, client, terrain, historique et fiche de préparation.
6. **Recherches → Mialy Rasolofoniaina** : besoin autour de Talatamaty, propositions et cahier de recherche PDF.
7. **Demandes de vente → Talatamaty** : profil propriétaire, trois pièces du dossier et étape « Prêt à publier ». La fiche catalogue reste en brouillon.
8. **Agenda** : les appels, rendez-vous et relances planifiés dans le jeu.

Les boutons d'aperçu utilisent une vraie modale avec fermeture par Échap et retour du focus au bouton. Les PDF sont téléchargés après action, pas pour afficher leur simple icône.

## 6. Retrait de « Terrain vérifié »

Supprimés : badge public, filtre, case d'édition, déduction depuis le type de titre, propriété frontend et exposition/écriture API.

Le workflow vendeur décrit maintenant une étape de travail : **« À examiner »**, **« Visite terrain programmée »**, **« Analyse des pièces »**, **« Prêt à publier »**. Les documents ont des états de suivi : **« Reçu »**, **« À examiner »**, **« À compléter »**, **« Écart signalé »**.

Les anciens libellés sont adaptés à la lecture sans effacer les notes, historiques ou pièces originales. La colonne historique `lands.verified` reste en base mais n'est plus utilisée ni exposée. Les mécanismes d'authentification, la vérification d'email et les contrôles techniques de fichiers ne sont pas retirés.

La disponibilité, la publication et la présence d'un PDF ne certifient pas un droit foncier. Les vrais titres et autres pièces doivent venir des intéressés et des autorités compétentes.

## 7. Contrôles réalisés

- PostgreSQL 17 : **32 tests backend / 587 assertions**, tous réussis.
- `npm run lint` et `npm run build`.
- **50 PDF / 50 pages** : lecture, mention sur chaque page, taille et SHA-256.
- HTTP réel via le proxy Vite : les **50 PDF** répondent après authentification ; accès anonyme refusé (`401`).
- Vérification des aperçus et téléchargements de documents sur ordinateur et mobile.
- Navigation dans les modules du back office et les pages publiques, sans ancien statut, erreur JavaScript ou débordement global détecté.
- Tests de non-écrasement des dossiers existants, de relance sans doublons et de refus en production.

Ces contrôles portent sur l'installation isolée de présentation, pas sur une base ou un hébergement de production du client.

## 8. Regénération optionnelle des PDF

Les PDF sont déjà inclus : Python n'est pas nécessaire pour utiliser le backend.

Pour regénérer les sources après une modification volontaire des JSON :

```bash
python -m pip install reportlab Pillow
python backend/tools/generate_presentation_documents.py
```

Le script lit `lands.json` et `presentation.json` ainsi que les images locales. Il ne produit pas de documents officiels. Une régénération ne remplace pas automatiquement les copies privées ou les lignes déjà installées : utiliser une nouvelle base de présentation pour une nouvelle version du jeu, sans nettoyer une base réelle.
