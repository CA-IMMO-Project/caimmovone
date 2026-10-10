<?php

namespace Database\Seeders;

use App\Models\Land;
use App\Support\PresentationData;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

/** Catalogue de présentation additif ; ne rapproche ni n'écrase des terrains existants. */
class LandSeeder extends Seeder
{
    public function run(): void
    {
        PresentationData::ensureAllowed();
        $records = new PresentationData;
        $base = CarbonImmutable::now('Indian/Antananarivo')->startOfDay();
        $rows = PresentationData::json('lands.json');

        foreach ($rows as $row) {
            $data = $row;
            $data['documents'] = array_map(
                fn ($fixture) => $records->file($fixture['path'], $fixture['name']),
                $row['documentFixtures'],
            );
            $data['lots'] = array_map(function ($lot) use ($base) {
                $lot['history'] = array_map(function ($entry) use ($base) {
                    $entry['at'] = $base->addDays($entry['dayOffset'] ?? -18)->setTime(10, 0)->toIso8601String();
                    unset($entry['dayOffset']);

                    return $entry;
                }, $lot['history'] ?? []);

                return $lot;
            }, $row['lots'] ?? []);

            $records->remember('land:'.$row['presentationKey'], Land::class, function () use ($data, $base) {
                return (new Land)->fillFromPublic($data)->forceFill([
                    'created_at' => $base->subDays(60)->setTime(9, 0)->utc(),
                    'updated_at' => $base->subDay()->setTime(16, 0)->utc(),
                ]);
            });
        }

        $this->command?->info(count($rows).' terrains de présentation disponibles ; les lignes existantes sont conservées.');
    }
}
