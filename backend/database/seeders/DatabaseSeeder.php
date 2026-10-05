<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            AdminUserSeeder::class,
            LandSeeder::class,
            RealisationSeeder::class,
            AdminDemoSeeder::class,
        ]);

        // Les seeders insèrent des ids explicites : on resynchronise les
        // séquences PostgreSQL pour que les prochaines insertions (API) partent
        // du bon numéro au lieu de collisionner.
        foreach (['lands', 'clients', 'requests', 'searches', 'land_files', 'realisations', 'messages', 'users'] as $table) {
            DB::statement(
                "SELECT setval(pg_get_serial_sequence('{$table}', 'id'), COALESCE((SELECT MAX(id) FROM {$table}), 0) + 1, false)"
            );
        }
    }
}
