<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\LandFile;
use App\Models\Search;
use App\Models\SiteRequest;
use Illuminate\Database\Seeder;

/** Données de démonstration du back office (clients, demandes, recherches, dossier). */
class AdminDemoSeeder extends Seeder
{
    public function run(): void
    {
        $now = fn (int $daysAgo) => now()->subDays($daysAgo)->toIso8601String();
        $history = fn (array $lines) => array_map(fn ($t) => ['id' => uniqid(), 'at' => $now(1), 'author' => 'Administrateur', 'text' => $t], $lines);

        // --- Clients ---
        $rakoto = Client::create([
            'full_name' => 'Rakotoarisoa Jean', 'phone' => '034 12 345 67', 'email' => 'jean.rakoto@exemple.mg',
            'source' => 'Site web', 'ref' => 'C-0001',
            'detail' => ['ref' => 'C-0001', 'fullName' => 'Rakotoarisoa Jean', 'phone' => '034 12 345 67', 'email' => 'jean.rakoto@exemple.mg', 'budget' => '40 – 60 M Ar', 'profession' => 'Ingénieur', 'age' => '38', 'nationality' => 'Malagasy', 'bankAccount' => 'Oui', 'message' => '', 'source' => 'Site web'],
        ]);
        $rava = Client::create([
            'full_name' => 'Ravonalala Marie', 'phone' => '032 88 777 66', 'email' => 'marie.ravonalala@exemple.fr',
            'source' => 'Site web', 'ref' => 'C-0002',
            'detail' => ['ref' => 'C-0002', 'fullName' => 'Ravonalala Marie', 'phone' => '032 88 777 66', 'email' => 'marie.ravonalala@exemple.fr', 'budget' => '100 – 150 M Ar', 'profession' => 'Commerçante', 'age' => '45', 'nationality' => 'Malagasy', 'bankAccount' => 'Oui', 'message' => 'Client de la diaspora (France).', 'source' => 'Site web'],
        ]);

        // --- Demande d'achat riche (CRM) ---
        SiteRequest::create([
            'ref' => 'ACH-'.now()->subDays(2)->format('ymd'),
            'kind' => 'interet', 'land_id' => 1, 'client_id' => $rakoto->id,
            'full_name' => 'Rakotoarisoa Jean', 'phone' => '034 12 345 67', 'email' => 'jean.rakoto@exemple.mg',
            'message' => 'Délai souhaité : Dès que possible', 'status' => 'En négociation', 'priority' => 'Haute', 'source' => 'Site web',
            'detail' => [
                'firstName' => 'Jean', 'lastName' => 'Rakotoarisoa', 'dialCode' => '+261', 'phone' => '034 12 345 67',
                'email' => 'jean.rakoto@exemple.mg', 'paymentMode' => 'Facilité de paiement – paiement échelonné',
                'budgetMin' => 40000000, 'budgetMax' => 60000000, 'deposit' => 30, 'paymentDuration' => '6–10 mois',
                'propertyType' => 'Terrain', 'region' => 'Antananarivo', 'district' => 'Ambohidratrimo',
                'areaMin' => 600, 'areaMax' => 900, 'goal' => 'Résidence principale', 'deadline' => 'Dès que possible',
                'agent' => 'Hery Rakoto', 'priority' => 'Haute', 'status' => 'En négociation', 'source' => 'Site web',
                'landId' => '1', 'clientId' => (string) $rakoto->id,
                'notes' => [['id' => uniqid(), 'at' => $now(1), 'author' => 'Administrateur', 'text' => 'Client très motivé, visite effectuée.']],
                'contacts' => [['id' => uniqid(), 'at' => $now(1), 'channel' => 'Appel', 'summary' => 'Appel de suivi, négociation en cours.']],
                'actions' => [['id' => uniqid(), 'type' => 'Relance', 'at' => now()->addDays(2)->toIso8601String(), 'note' => 'Rappeler pour la contre-offre', 'done' => false]],
                'history' => $history(['Demande reçue depuis le site web', 'Visite du terrain effectuée', 'Négociation ouverte']),
            ],
        ]);

        // --- Demande de visite (site) ---
        SiteRequest::create([
            'ref' => 'VIS-'.now()->subDays(1)->format('ymd'),
            'kind' => 'visite', 'land_id' => 3, 'client_id' => $rava->id,
            'full_name' => 'Ravonalala Marie', 'phone' => '032 88 777 66', 'email' => 'marie.ravonalala@exemple.fr',
            'message' => 'Visite en visio souhaitée (depuis la France).', 'status' => 'Nouvelle', 'priority' => 'Haute', 'source' => 'Site web',
            'meta' => ['visitDate' => now()->addDays(5)->toDateString(), 'visitTime' => '10:00', 'landTitle' => 'Terrain plat à Talatamaty'],
        ]);

        // --- Recherche spécifique ---
        Search::create([
            'ref' => 'REC-'.now()->subDays(3)->format('ymd'),
            'client_id' => $rava->id, 'status' => 'Terrains proposés',
            'main_zone' => 'Ivato, Antananarivo', 'full_name' => 'Ravonalala Marie',
            'phone' => '032 88 777 66', 'email' => 'marie.ravonalala@exemple.fr', 'source' => 'Site web',
            'detail' => [
                'fullName' => 'Ravonalala Marie', 'phone' => '032 88 777 66', 'email' => 'marie.ravonalala@exemple.fr',
                'usage' => 'Habitation', 'budgetMax' => 60000000, 'areaMin' => 500, 'areaMax' => 1000,
                'mainZone' => 'Ivato, Antananarivo', 'otherZones' => 'Ambohidratrimo, Talatamaty',
                'targetZone' => "Près de l'aéroport", 'lat' => -18.7969, 'lng' => 47.4788, 'radiusKm' => 5,
                'flexible' => 'Oui', 'suggestNearby' => true,
                'criteria' => 'Terrain plat, accessible en voiture, titre foncier.',
                'proposals' => [['id' => uniqid(), 'landId' => '1', 'at' => $now(1), 'note' => 'Correspond au budget et à la zone', 'answer' => 'Intéressé']],
                'history' => $history(['Recherche reçue depuis le site web', 'Terrain CAI-0001 proposé']),
                'source' => 'Site web', 'status' => 'Terrains proposés',
            ],
        ]);

        // --- Dossier « À vendre » ---
        LandFile::create([
            'ref' => 'VEN-'.now()->subDays(5)->format('ymd'),
            'client_id' => $rakoto->id, 'status' => 'En cours de vérification',
            'full_name' => 'Rakotoarisoa Jean', 'phone' => '034 12 345 67',
            'detail' => [
                // Objet owner complet : même forme que l'écran « Dossiers de vente »
                'ownerId' => 'PROP-DEMO01',
                'owner' => [
                    'firstName' => 'Jean', 'lastName' => 'Rakotoarisoa', 'dialCode' => '+261',
                    'phone' => '034 12 345 67', 'email' => 'jean.rakoto@exemple.mg',
                    'birthDate' => '1980-05-17', 'profession' => 'Ingénieur',
                    'country' => 'Madagascar', 'countryOther' => '', 'address' => 'Ambohidratrimo',
                    'idNumber' => 'CIN 876543210', 'accountNumber' => 'BNI 1234567',
                ],
                'idDoc' => ['type' => 'CIN', 'number' => '876543210', 'issuedAt' => '2019-03-04', 'expiresAt' => '2029-03-04', 'authority' => 'Mairie d’Ambohidratrimo'],
                'title' => 'Terrain familial à Ambohidratrimo', 'category' => 'Terrain nu', 'area' => 1200,
                'region' => 'Antananarivo', 'commune' => 'Ambohidratrimo', 'fokontany' => 'Ilafy',
                'relief' => 'Terrain plat', 'accesses' => ['Route goudronnée'], 'occupation' => 'Libre',
                'price' => 75000000, 'pricePerM2' => 62500, 'salePayment' => 'Comptant – paiement en une fois', 'depositRange' => '30',
                'photos' => [], 'documents' => [], 'actions' => [],
                'status' => 'En cours de vérification', 'source' => 'Site web',
                'docs' => [], 'checklist' => [], 'history' => $history(['Dossier reçu depuis le site web', 'Vérification des titres en cours']),
            ],
        ]);

        $this->command?->info('Données de démonstration admin : 2 clients, 2 demandes, 1 recherche, 1 dossier.');
    }
}
