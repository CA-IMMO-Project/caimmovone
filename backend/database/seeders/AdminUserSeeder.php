<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = trim((string) env('ADMIN_EMAIL'));
        $password = (string) env('ADMIN_PASSWORD');

        if ($email === '' || $password === '') {
            throw new RuntimeException(
                'ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis avant d’exécuter les seeders.'
            );
        }

        if (strlen($password) < 12) {
            throw new RuntimeException('ADMIN_PASSWORD doit contenir au moins 12 caractères.');
        }

        User::firstOrCreate(
            ['email' => strtolower($email)],
            [
                'name' => 'CA IMMO (administration)',
                'password' => Hash::make($password),
            ],
        );
    }
}
