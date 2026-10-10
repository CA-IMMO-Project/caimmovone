<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Installation normale : aucun terrain, client ou document inventé.
        // Le jeu facultatif se charge uniquement via presentation:install.
        $this->call(AdminUserSeeder::class);
    }
}
