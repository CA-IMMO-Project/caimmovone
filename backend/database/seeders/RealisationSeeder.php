<?php

namespace Database\Seeders;

use App\Models\Realisation;
use Illuminate\Database\Seeder;

class RealisationSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            [
                'title' => 'Villa clé en main — Ambohidratrimo',
                'category' => 'Villa',
                'location' => 'Ambohidratrimo, Antananarivo',
                'completed_at' => '2026-05',
                'client' => 'Famille R.',
                'area' => 420,
                'duration' => '11 mois',
                'description' => "Construction complète d'une villa familiale sur un terrain titré : fondations, gros œuvre, finitions et clôture. Suivi de chantier hebdomadaire avec photos envoyées aux propriétaires installés à l'étranger.",
                'photos' => ['/media/terrains/highlands.jpg', '/media/terrains/colline.jpg'],
                'published' => true,
                'featured' => true,
            ],
            [
                'title' => 'Lotissement résidentiel — Talatamaty',
                'category' => 'Lotissement',
                'location' => 'Talatamaty, Antananarivo',
                'completed_at' => '2026-02',
                'client' => 'Investisseur privé',
                'area' => 5200,
                'duration' => '7 mois',
                'description' => "Découpage d'une parcelle de 5 200 m² en 9 lots viabilisés : routes d'accès, adduction d'eau, électricité en bordure de chaque lot et bornage par géomètre agréé.",
                'photos' => ['/media/terrains/plaine.jpg', '/media/terrains/agricole.jpg'],
                'published' => true,
                'featured' => false,
            ],
            [
                'title' => 'Maison familiale — Antsirabe',
                'category' => 'Construction de maison',
                'location' => 'Vinaninkarena, Antsirabe',
                'completed_at' => '2025-11',
                'client' => 'Famille M.',
                'area' => 180,
                'duration' => '9 mois',
                'description' => "Maison de plain-pied 180 m² : trois chambres, salon traversant, cuisine équipée et varangue. Conception bioclimatique adaptée à l'altitude d'Antsirabe.",
                'photos' => ['/media/terrains/ouest.jpg'],
                'published' => true,
                'featured' => false,
            ],
        ];

        foreach ($rows as $row) {
            Realisation::updateOrCreate(['title' => $row['title']], $row);
        }

        $this->command?->info(count($rows) . ' réalisations insérées.');
    }
}
