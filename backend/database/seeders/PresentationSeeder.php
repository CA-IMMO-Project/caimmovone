<?php

namespace Database\Seeders;

use App\Support\PresentationData;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/** À appeler volontairement sur une base de présentation distincte. */
class PresentationSeeder extends Seeder
{
    public function run(): void
    {
        PresentationData::ensureAllowed();
        DB::transaction(function (): void {
            $this->call([
                LandSeeder::class,
                AdminDemoSeeder::class,
                RealisationSeeder::class,
            ]);
        });
    }
}
