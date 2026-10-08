<?php

namespace App\Support;

/**
 * Normalisation et validation des numéros de téléphone.
 *
 * La normalisation (suppression des séparateurs) sert aussi au rapprochement
 * des fiches clients : « 034 12 345 67 » et « 034.12.34.567 » désignent la
 * même personne et doivent matcher la même fiche.
 */
class Phone
{
    /**
     * Supprime les séparateurs et ramène le numéro à sa forme locale
     * canonique : « +261 34 12 345 67 » et « 034 12 345 67 » donnent
     * tous deux « 0341234567 » — indispensable au rapprochement client.
     */
    public static function normalize(?string $phone): string
    {
        $digits = preg_replace('/[\s.\-()]/', '', trim((string) $phone));
        if (preg_match('/^\+?261(0?3\d{8})$/', (string) $digits, $matches) === 1) {
            $national = $matches[1];
            $digits = str_starts_with($national, '0') ? $national : '0'.$national;
        }

        return $digits;
    }

    /**
     * Formats acceptés :
     *   034 12 345 67       → mobile local malgache
     *   +261 34 12 345 67   → mobile malgache international
     *   +33 6 12 34 56 78   → numéro étranger complet au format E.164
     */
    public static function isValid(?string $phone): bool
    {
        $normalized = self::normalize($phone);
        $digits = ltrim($normalized, '+');

        if (preg_match('/^03\d{8}$/', $digits) === 1
            || preg_match('/^2613\d{8}$/', $digits) === 1) {
            return true;
        }

        // Les numéros +261 restent soumis à la règle mobile malgache ci-dessus.
        return ! str_starts_with($normalized, '+261')
            && preg_match('/^\+[1-9]\d{7,14}$/', $normalized) === 1;
    }

    /** Message d'erreur affiché côté site public (422). */
    public static function message(): string
    {
        return 'Numéro invalide. Format attendu : 034 12 345 67 ou un numéro international complet (+indicatif…).';
    }
}
