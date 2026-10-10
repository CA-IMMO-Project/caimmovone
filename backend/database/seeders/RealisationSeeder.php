<?php

namespace Database\Seeders;

use App\Models\Realisation;
use App\Support\PresentationData;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

class RealisationSeeder extends Seeder
{
    public function run(): void
    {
        PresentationData::ensureAllowed();
        $records = new PresentationData;
        $base = CarbonImmutable::now('Indian/Antananarivo')->startOfDay();
        foreach (PresentationData::json('presentation.json')['projects'] as $row) {
            $records->remember('project:'.$row['key'], Realisation::class, function () use ($row, $base) {
                // Ces projets-types restent internes : aucune fausse réalisation
                // livrée ne doit être présentée comme un fait de l'entreprise.
                return (new Realisation)->fillFromPublic($row)->forceFill([
                    'created_at' => $base->subDays(20)->utc(),
                    'updated_at' => $base->subDay()->utc(),
                ]);
            });
        }
        $this->command?->info('3 projets-types internes disponibles (non publiés).');
    }
}
