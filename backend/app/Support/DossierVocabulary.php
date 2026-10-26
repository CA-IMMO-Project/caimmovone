<?php

namespace App\Support;

/**
 * Compatibilité non destructive avec les libellés des anciens dossiers et
 * alignement du vocabulaire entre le portail public et le back-office.
 * Il s'agit d'étapes de traitement, jamais d'une certification foncière.
 */
final class DossierVocabulary
{
    public const STATUSES = [
        'Brouillon',
        'Nouveau',
        "À l'étude",
        'Dossier incomplet',
        'À examiner',
        'Visite terrain programmée',
        'Analyse des pièces',
        'Prêt à publier',
        'Publié',
        'En négociation',
        'Réservé',
        'Vendu',
        'Rejeté',
        'Archivé',
    ];

    public const DOC_STATUSES = [
        'Reçu',
        'À examiner',
        'À compléter',
        'Écart signalé',
    ];

    public const PRIORITIES = ['Faible', 'Normale', 'Haute', 'Urgente'];

    public const DECISIONS = ['Validé', 'Refusé'];

    public const NO_DOC = 'Aucun document pour l’instant';

    public static function status(?string $value): string
    {
        return match ($value) {
            'À vérifier', 'En attente de prise en charge' => 'À examiner',
            'En cours de vérification' => "À l'étude",
            'Vérification terrain programmée' => 'Visite terrain programmée',
            'Vérification juridique' => 'Analyse des pièces',
            'Validé' => 'Prêt à publier',
            'Refusé', 'Retiré' => 'Rejeté',
            'Clôturé' => 'Archivé',
            default => $value ?? 'Nouveau',
        };
    }

    public static function relief(?string $value): string
    {
        $trimmed = trim((string) $value);

        return match ($trimmed) {
            'Plat' => 'Terrain plat',
            default => $trimmed,
        };
    }

    public static function salePayment(?string $value): string
    {
        $trimmed = trim((string) $value);

        return match ($trimmed) {
            'Comptant' => 'Comptant – paiement en une fois',
            'Facilité' => 'Facilité – paiement échelonné',
            'Les deux' => 'Les deux – comptant ou facilité',
            default => $trimmed,
        };
    }

    public static function maxDuration(?string $value): string
    {
        $trimmed = trim((string) $value);

        return match ($trimmed) {
            'Non concerné (comptant)' => '',
            default => $trimmed,
        };
    }

    public static function docCategory(?string $value): string
    {
        $trimmed = trim((string) $value);

        return match ($trimmed) {
            'Titre foncier (bokin-tany)' => 'Titre foncier',
            'Certificat foncier (kara-tany — guichet foncier de la commune)' => 'Certificat foncier',
            'Extrait cadastral' => 'Extrait cadastral',
            'Acte de notoriété ou acte de partage (succession, indivision)' => 'Acte de notoriété / partage',
            'Papiers coutumiers (anciens actes de vente, reçus, permis)' => 'Papiers coutumiers',
            'Certificat de situation juridique (CSJ, moins de 3 mois)' => 'Certificat de situation juridique',
            'Plan topographique ou bornage (coordonnées Laborde)' => 'Plan du terrain',
            'Autorisation de transaction ou prescription d’urbanisme' => 'Autorisation / urbanisme',
            'Lettre de vente ou acte de vente' => 'Acte de vente',
            'Quittance d’impôt foncier' => 'Quittance d’impôt foncier',
            'Certificat de résidence (fokontany)' => 'Certificat de résidence',
            '', self::NO_DOC, "Aucun document pour l'instant" => 'Autre document',
            default => $trimmed,
        };
    }

    public static function detail(array $detail): array
    {
        if (isset($detail['status'])) {
            $detail['status'] = self::status($detail['status']);
        }
        if (isset($detail['relief']) && is_string($detail['relief'])) {
            $detail['relief'] = self::relief($detail['relief']);
        }
        if (isset($detail['salePayment']) && is_string($detail['salePayment'])) {
            $detail['salePayment'] = self::salePayment($detail['salePayment']);
        }
        if (isset($detail['maxDuration']) && is_string($detail['maxDuration'])) {
            $detail['maxDuration'] = self::maxDuration($detail['maxDuration']);
        }

        // Promotion non destructive du verso d'une pièce d'identité ou d'une
        // vidéo principale stockés dans `siteFiles` par d'anciens dépôts.
        if (is_array($detail['siteFiles'] ?? null)) {
            $idCards = array_values((array) ($detail['siteFiles']['idCards'] ?? []));
            if (empty($detail['idDoc']['verso']) && isset($idCards[0]) && is_array($idCards[0])) {
                $detail['idDoc'] = array_merge($detail['idDoc'] ?? ['type' => 'CIN'], [
                    'verso' => array_shift($idCards),
                ]);
                $detail['siteFiles']['idCards'] = $idCards;
            }

            $videos = array_values((array) ($detail['siteFiles']['videos'] ?? []));
            if (empty($detail['video']) && isset($videos[0]) && is_array($videos[0])) {
                $detail['video'] = array_shift($videos);
                $detail['siteFiles']['videos'] = $videos;
            }
        }

        $detail['documents'] = array_map(function (mixed $document): mixed {
            if (! is_array($document)) {
                return $document;
            }
            $document['status'] = match ($document['status'] ?? '') {
                'Vérifié' => 'Reçu',
                'À vérifier' => 'À examiner',
                'Incomplet' => 'À compléter',
                'Rejeté' => 'Écart signalé',
                default => $document['status'] ?? 'Reçu',
            };
            if (isset($document['category']) && is_string($document['category'])) {
                $document['category'] = self::docCategory($document['category']);
            }

            return $document;
        }, $detail['documents'] ?? []);

        $labels = [
            'Identité du propriétaire vérifiée' => 'Coordonnées du propriétaire renseignées',
            'Documents fonciers complets' => 'Pièces du dossier jointes',
            'Limites et bornage confirmés' => 'Plan de situation joint',
            'Situation juridique vérifiée' => 'Informations foncières renseignées',
            'Prix validé par l’agence' => 'Prix et conditions de vente saisis',
            'Photos conformes (vue générale, accès, limites)' => 'Photographies jointes (vue générale, accès, limites)',
        ];
        $detail['checklist'] = array_map(fn ($label) => $labels[$label] ?? $label, $detail['checklist'] ?? []);

        // L'historique, les notes et les pièces originales restent intacts en base.
        return $detail;
    }
}
