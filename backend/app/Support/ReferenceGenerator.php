<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use RuntimeException;

/** PostgreSQL-backed, concurrency-safe business reference generator. */
final class ReferenceGenerator
{
    public static function next(string $scope): string
    {
        $scope = strtoupper($scope);
        $table = match ($scope) {
            'REC' => 'searches',
            'VEN', 'TER' => 'land_files',
            default => 'requests',
        };

        // Existing demonstration rows may predate the counter table. Continue
        // incrementing until a genuinely free reference is obtained.
        for ($attempt = 0; $attempt < 100; $attempt++) {
            $value = self::increment($scope);
            $base = $scope.'-'.now()->format('ymd');
            $reference = $value === 1 ? $base : $base.'-'.$value;

            if (! DB::table($table)->where('ref', $reference)->exists()) {
                return $reference;
            }
        }

        throw new RuntimeException('Impossible de générer une référence unique.');
    }

    private static function increment(string $scope): int
    {
        $row = DB::selectOne(
            <<<'SQL'
            INSERT INTO reference_counters (scope, reference_date, value)
            VALUES (?, ?::date, 1)
            ON CONFLICT (scope, reference_date)
            DO UPDATE SET value = reference_counters.value + 1
            RETURNING value
            SQL,
            [$scope, now()->toDateString()],
        );

        return (int) $row->value;
    }
}
