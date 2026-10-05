<?php

namespace Database\Seeders;

use App\Models\Land;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

/**
 * Charge le catalogue initial depuis database/seeders/data/lands.json
 * (extrait du seed historique du frontend — mêmes ids, donc les liens
 * et références CAI-0001… restent stables).
 */
class LandSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('seeders/data/lands.json');
        if (! File::exists($path)) {
            $this->command?->warn('lands.json introuvable — catalogue vide.');

            return;
        }

        $lands = json_decode(File::get($path), true);
        foreach ($lands as $data) {
            Land::updateOrCreate(
                ['id' => (int) $data['id']],
                [
                    'title' => $data['title'],
                    'description' => $data['description'] ?? null,
                    'price' => (int) $data['price'],
                    'region' => $data['region'],
                    'zone' => $data['zone'] ?? null,
                    'location' => $data['location'],
                    'image_url' => $data['imageUrl'] ?? null,
                    'gallery' => $data['gallery'] ?? [],
                    'features' => $data['features'] ?? [],
                    'documents' => $data['documents'] ?? [],
                    'coordinates' => $data['coordinates'] ?? null,
                    'area' => (int) ($data['area'] ?? 0),
                    'title_status' => $data['titleStatus'] ?? 'Titre Foncier',
                    'status' => $data['status'] ?? 'disponible',
                    'relief' => $data['relief'] ?? 'Plat',
                    'access' => $data['access'] ?? null,
                    'water' => (bool) ($data['water'] ?? false),
                    'electricity' => (bool) ($data['electricity'] ?? false),
                    'payment' => $data['payment'] ?? null,
                    'payment_mode' => $data['paymentMode'] ?? 'comptant',
                    'down_payment' => $data['downPayment'] ?? null,
                    'installments' => $data['installments'] ?? null,
                    'verified' => (bool) ($data['verified'] ?? false),
                    'featured' => (bool) ($data['featured'] ?? false),
                ],
            );
        }

        $this->command?->info(count($lands).' terrains insérés.');
    }
}
