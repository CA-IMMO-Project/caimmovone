<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@caimmo.mg')],
            [
                'name' => 'CA IMMO (administration)',
                'password' => Hash::make(env('ADMIN_PASSWORD', 'caimmo2026')),
            ],
        );
    }
}
