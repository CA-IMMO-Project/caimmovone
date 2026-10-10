# Médias CA IMMO — diversification & reels

Les nouveaux médias sont issus de la page officielle **Chargé d’Affaires Immobilier** (profil `61572362485960`). Aucun visuel généré ni photo de stock ajouté dans cette passe.

## Vidéos intégrées à l’accueil

| Fichier | Publication d’origine | Durée | Poids |
| --- | --- | --- | --- |
| `laceo-visite.mp4` | https://www.facebook.com/reel/928773469508512/ | 1:38 | 6.14 Mio |
| `iavoloha-drone.mp4` | https://www.facebook.com/reel/1087224946508736/ | 1:17 | 7.13 Mio |
| `laceo-acces.mp4` | https://www.facebook.com/reel/1456242408745482/ | 1:40 | 7.70 Mio |

- Encodage MP4 H.264 Main / AAC, 1280 × 720, `yuv420p`, avec `faststart`. Son et montage d’origine conservés.
- Le lecteur n’est monté qu’après une action utilisateur. Pas de téléchargement vidéo au chargement de l’accueil, pas d’autoplay de fond, pas d’iframe ou de cookie Facebook.
- Lecteur natif : lecture/pause, volume, déplacement et plein écran. Modale `<dialog>` : focus capturé, retour au bouton déclencheur, Échap / bouton / clic hors lecteur pour fermer. La fermeture et le changement de page arrêtent le son.
- Un lien mène à chaque publication d’origine ; un message de secours apparaît si la vidéo ne peut pas être lue.
- Les vidéos sont des publications existantes : une note précise que des tarifs, disponibilités ou promotions peuvent être passés. Les conditions actuelles doivent être confirmées avec CA IMMO.

## Nouvelles photos et affiches

Images exportées depuis les vidéos originales, recadrées sans les titres, badges ou logos incrustés. Les pixels de terrain ne sont pas retouchés pour effacer des limites de parcelle. Les recadrages sont bornés à l’image source et conservent le rapport d’aspect.

| Fichier | Vidéo source | Frame | Format |
| --- | --- | --- | --- |
| `home-collage.jpg` | https://www.facebook.com/reel/928773469508512/ | 12 s | 1200 × 900 |
| `home-drone.jpg` | https://www.facebook.com/reel/2064158930899134/ | 45 s | 960 × 600 |
| `home-cta.jpg` | https://www.facebook.com/reel/1456242408745482/ | 70 s | 1920 × 520 |
| `about-cta.jpg` | https://www.facebook.com/reel/2064158930899134/ | 30 s | 1280 × 512 |
| `page-recherche.jpg` | https://www.facebook.com/reel/1456242408745482/ | 40 s | 1200 × 750 |
| `page-vendre.jpg` | https://www.facebook.com/reel/1087224946508736/ | 58 s | 1280 × 800 |
| `page-realisations.jpg` | https://www.facebook.com/reel/2064158930899134/ | 60 s | 960 × 600 |
| `page-contact.jpg` | https://www.facebook.com/reel/2064158930899134/ | 180 s | 960 × 600 |
| `banniere-section.jpg` | https://www.facebook.com/reel/1456242408745482/ | 32 s | 1520 × 608 |
| `reels/laceo-visite.jpg` | https://www.facebook.com/reel/928773469508512/ | 18 s | 1280 × 720 |
| `reels/iavoloha-drone.jpg` | https://www.facebook.com/reel/1087224946508736/ | 12 s | 1280 × 720 |
| `reels/laceo-acces.jpg` | https://www.facebook.com/reel/1456242408745482/ | 40 s | 1280 × 720 |
| `about-collage-haut.jpg` | https://www.facebook.com/reel/1456242408745482/ | 48 s | 1176 × 420 |

La colonne de la page À propos utilise également une zone sans texte de la couverture Facebook existante. Les autres cadrages conservés ne sont pas dupliqués dans les nouveaux blocs de l’accueil.

## Vérifications

- `npm run lint` (TypeScript) et `npm run build`.
- Aperçu Vite configuré pour écouter sur `0.0.0.0:3000` et accepter le domaine d’aperçu.
- Contrôle des photos : dimensions, bounds des crops, absence de bandes noires et inspection visuelle.
- Test navigateur desktop/mobile : lecture des trois vidéos, fermeture, focus, message de secours et absence de chargement MP4 avant clic.


## Photographie ajoutée aux dossiers de présentation

`frontend/public/media/caimmo/iavoloha-quartier.jpg` est une frame à **30 s**
de la vidéo réelle [Iavoloha Pagode](https://www.facebook.com/reel/1087224946508736/),
extraite de sa copie locale `reels/iavoloha-drone.mp4`. Source 1280 × 720,
crop `(0, 45, 1120, 675)`, résultat natif **1120 × 630 (16:9)**, sans suréchantillonnage.
Le logo incrusté situé en haut à droite reste entièrement hors du cadre.

Les nouveaux dossiers utilisent les médias existants de la société, à titre
illustratif : les coordonnées, limites, prix et rattachements aux dossiers de
présentation ne sont pas des relevés des parcelles réellement photographiées.
