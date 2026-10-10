<?php

namespace App\Support;

/**
 * Compatibilité non destructive avec les libellés des anciens dossiers.
 * Il s'agit d'étapes de traitement, jamais d'une certification foncière.
 */
final class DossierVocabulary
{
    public static function status(?string $value): string
    {
        return match ($value) {
            'À vérifier' => 'À examiner',
            'En cours de vérification' => "À l'étude",
            'Vérification terrain programmée' => 'Visite terrain programmée',
            'Vérification juridique' => 'Analyse des pièces',
            'Validé' => 'Prêt à publier',
            default => $value ?? 'Nouveau',
        };
    }

    public static function detail(array $detail): array
    {
        if (isset($detail['status'])) {
            $detail['status'] = self::status($detail['status']);
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
