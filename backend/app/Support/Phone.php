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
        if (preg_match('/^\+?261(3\d{8})$/', (string) $digits)) {
            $digits = '0'.substr((string) $digits, -9);
        }

        return $digits;
    }

    /**
     * Formats acceptés (mobile Madagascar) :
     *   034 12 345 67       → 10 chiffres commençant par 03
     *   +261 34 12 345 67   → 261 + 9 chiffres (le 0 initial est omis)
     */
    public static function isValid(?string $phone): bool
    {
        $digits = ltrim(self::normalize($phone), '+');

        return preg_match('/^03\d{8}$/', $digits) === 1
            || preg_match('/^2613\d{8}$/', $digits) === 1;
    }

    /** Message d'erreur affiché côté site public (422). */
    public static function message(): string
    {
        return 'Numéro de téléphone invalide. Format attendu : 034 12 345 67 ou +261 34 12 345 67.';
    }
}
