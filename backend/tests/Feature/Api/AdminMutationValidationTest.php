<?php

namespace Tests\Feature\Api;

use App\Models\Client;
use App\Models\ContactMessage;
use App\Models\Land;
use App\Models\User;
use Database\Seeders\PresentationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminMutationValidationTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['admin']);
    }

    public function test_login_rejects_malformed_email_or_missing_password(): void
    {
        $this->postJson('/api/v1/admin/login', [
            'email' => 'not-an-email',
            'password' => '',
        ])->assertUnprocessable()->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_admin_land_creation_validates_required_and_bounded_fields(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/v1/admin/lands', [
            'title' => '',
            'region' => 'Analamanga',
            'location' => 'Ivato',
            'price' => -500,
            'status' => 'inconnu',
            'publicationStatus' => 'en-ligne',
            'coordinates' => [120, 47.5],
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'title', 'price', 'status', 'publicationStatus', 'coordinates.0',
        ]);

        $this->assertDatabaseCount('lands', 0);

        $response = $this->postJson('/api/v1/admin/lands', [
            'title' => 'Terrain résidentiel Ivato',
            'region' => 'Analamanga',
            'location' => 'Ivato, Antananarivo',
            'price' => 85000000,
            'area' => 500,
            'status' => 'reserve',
            'publicationStatus' => 'brouillon',
            'titleStatus' => 'Titre Foncier',
            'relief' => 'Plat',
            'paymentMode' => 'comptant-ou-facilite',
            'coordinates' => [-18.7969, 47.4788],
            'water' => true,
            'electricity' => false,
        ])->assertCreated();

        $response->assertJsonPath('status', 'réservé')
            ->assertJsonPath('publicationStatus', 'brouillon');
    }

    public function test_admin_land_update_enforces_same_rules_and_preserves_nested_data(): void
    {
        $this->actingAsAdmin();

        $land = Land::create([
            'title' => 'Domaine initial',
            'region' => 'Analamanga',
            'location' => 'Vontovorona',
            'price' => 120000000,
            'area' => 1000,
            'status' => 'disponible',
            'publication_status' => 'publie',
            'lots' => [[
                'id' => 'lot-1',
                'number' => 'Lot 1',
                'area' => 500,
                'price' => 60000000,
                'status' => 'disponible',
                'history' => [['id' => 'h-1', 'at' => '2026-10-01T10:00:00Z', 'author' => 'Admin', 'text' => 'Créé']],
            ]],
        ]);

        $this->putJson('/api/v1/admin/lands/'.$land->id, [
            'title' => '',
            'price' => 0,
            'status' => 'invalide',
            'lots' => [['id' => 'lot-1', 'number' => 'Lot 1', 'area' => -10, 'price' => 60000000, 'status' => 'autre']],
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'title', 'price', 'status', 'lots.0.area', 'lots.0.status',
        ]);

        $this->patchJson('/api/v1/admin/lands/'.$land->id, [
            'price' => 135000000,
            'status' => 'réservé',
        ])->assertOk()
            ->assertJsonPath('price', 135000000)
            ->assertJsonPath('status', 'réservé')
            ->assertJsonPath('lots.0.history.0.text', 'Créé');
    }

    public function test_admin_realisation_create_and_update_validate_fields_dates_and_booleans(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/v1/admin/realisations', [
            'title' => '',
            'category' => 'Catégorie inventée',
            'completedAt' => '2026-13',
            'area' => -20,
            'published' => 'oui',
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'title', 'category', 'completedAt', 'area', 'published',
        ]);

        $created = $this->postJson('/api/v1/admin/realisations', [
            'title' => 'Villa contemporaine à Ilafy',
            'category' => 'Villa',
            'location' => 'Ilafy, Analamanga',
            'completedAt' => '2026-09',
            'area' => 320,
            'description' => 'Chantier livré clé en main.',
            'photos' => [['id' => 'p-1', 'name' => 'facade.jpg', 'type' => 'image/jpeg', 'size' => 1024, 'url' => '/storage/uploads/facade.jpg']],
            'published' => false,
            'featured' => true,
        ])->assertCreated()->json();

        $this->patchJson('/api/v1/admin/realisations/'.$created['id'], [
            'completedAt' => 'date-invalide',
        ])->assertUnprocessable()->assertJsonValidationErrors('completedAt');

        $this->patchJson('/api/v1/admin/realisations/'.$created['id'], [
            'published' => true,
            'completedAt' => '2026-10',
        ])->assertOk()
            ->assertJsonPath('published', true)
            ->assertJsonPath('completedAt', '2026-10');
    }

    public function test_admin_client_create_and_update_normalize_phone_and_validate_identity(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/v1/admin/clients', [
            'fullName' => '   ',
            'phone' => '12345',
            'email' => 'adresse-invalide',
            'source' => 'Canal inconnu',
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'fullName', 'phone', 'email', 'source',
        ]);

        $this->assertDatabaseCount('clients', 0);

        $client = $this->postJson('/api/v1/admin/clients', [
            'fullName' => 'Miora Razafindrakoto',
            'phone' => '+261 34 12 345 67',
            'email' => 'Miora.Razafindrakoto@Example.test',
            'profession' => 'Architecte',
            'age' => '34',
            'source' => 'Backoffice',
        ])->assertCreated()->json();

        $this->assertSame('0341234567', $client['phone']);
        $this->assertSame('miora.razafindrakoto@example.test', $client['email']);
        $this->assertDatabaseMissing('clients', ['full_name' => 'Sans nom']);

        $this->patchJson('/api/v1/admin/clients/'.$client['id'], [
            'phone' => '000',
        ])->assertUnprocessable()->assertJsonValidationErrors('phone');

        $this->patchJson('/api/v1/admin/clients/'.$client['id'], [
            'message' => 'Disponible le samedi matin.',
        ])->assertOk()
            ->assertJsonPath('profession', 'Architecte')
            ->assertJsonPath('message', 'Disponible le samedi matin.');
    }

    public function test_admin_request_create_and_update_enforce_allowed_values_and_foreign_keys(): void
    {
        $this->actingAsAdmin();

        $client = Client::create([
            'full_name' => 'Jean Rakoto',
            'phone' => '0341234567',
            'email' => 'jean@example.test',
        ]);
        $land = Land::create([
            'title' => 'Lotissement Ivato',
            'region' => 'Analamanga',
            'location' => 'Ivato',
            'price' => 90000000,
            'lots' => [['id' => 'lot-a', 'number' => 'Lot A', 'area' => 400, 'price' => 45000000, 'status' => 'disponible']],
        ]);

        $this->postJson('/api/v1/admin/requests', [
            'kind' => 'type-libre',
            'status' => 'Statut inventé',
            'priority' => 'Critique',
            'landId' => '999999',
            'clientId' => '999999',
            'firstName' => 'Jean',
            'lastName' => 'Rakoto',
            'phone' => '034 12 345 67',
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'kind', 'status', 'priority', 'landId', 'clientId',
        ]);

        $this->postJson('/api/v1/admin/requests', [
            'kind' => 'interet',
            'landId' => (string) $land->id,
            'lotId' => 'lot-inexistant',
            'clientId' => (string) $client->id,
            'firstName' => 'Jean',
            'lastName' => 'Rakoto',
            'phone' => '034 12 345 67',
        ])->assertUnprocessable()->assertJsonValidationErrors('lotId');

        $this->assertDatabaseCount('requests', 0);

        $created = $this->postJson('/api/v1/admin/requests', [
            'kind' => 'interet',
            'status' => 'En étude',
            'priority' => 'Haute',
            'landId' => (string) $land->id,
            'lotId' => 'lot-a',
            'clientId' => (string) $client->id,
            'firstName' => 'Jean',
            'lastName' => 'Rakoto',
            'phone' => '+261 34 12 345 67',
            'email' => 'jean@example.test',
            'budgetMin' => 40000000,
            'budgetMax' => 50000000,
        ])->assertCreated()->json();

        $this->assertStringStartsWith('ACH-', $created['ref']);
        $this->assertSame('0341234567', $created['phone']);
        $this->assertDatabaseHas('requests', ['id' => (int) $created['id'], 'lot_id' => 'lot-a']);

        $this->patchJson('/api/v1/admin/requests/'.$created['id'], [
            'status' => 'Statut illégal',
        ])->assertUnprocessable()->assertJsonValidationErrors('status');
    }

    public function test_admin_search_create_and_update_validate_statuses_bounds_and_client_link(): void
    {
        $this->actingAsAdmin();

        $client = Client::create([
            'full_name' => 'Sarah Andrianarison',
            'phone' => '0330592740',
        ]);

        $this->postJson('/api/v1/admin/searches', [
            'fullName' => 'Sarah Andrianarison',
            'phone' => '033 05 927 40',
            'clientId' => '999999',
            'status' => 'Statut libre',
            'areaMin' => 800,
            'areaMax' => 300,
            'lat' => -95,
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'clientId', 'status', 'areaMax', 'lat',
        ]);

        $this->assertDatabaseCount('searches', 0);

        $created = $this->postJson('/api/v1/admin/searches', [
            'fullName' => 'Sarah Andrianarison',
            'phone' => '+261 33 05 927 40',
            'clientId' => (string) $client->id,
            'status' => 'En recherche',
            'usage' => 'Habitation',
            'mainZone' => 'Talatamaty',
            'areaMin' => 400,
            'areaMax' => 800,
            'lat' => -18.8421,
            'lng' => 47.4812,
        ])->assertCreated()->json();

        $this->assertStringStartsWith('REC-', $created['ref']);
        $this->assertSame('0330592740', $created['phone']);
    }

    public function test_admin_land_file_create_and_update_validate_vocabulary_draft_and_client_link(): void
    {
        $this->actingAsAdmin();

        $client = Client::create([
            'full_name' => 'Haja Randria',
            'phone' => '0324471826',
        ]);

        // Un dossier non-brouillon incomplet ou rattaché à un client inexistant est rejeté.
        $this->postJson('/api/v1/admin/land-files', [
            'status' => "À l'étude",
            'title' => '',
            'clientId' => '999999',
            'priority' => 'Maximale',
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'title', 'fullName', 'phone', 'clientId', 'priority',
        ]);

        // Un statut arbitraire hors vocabulaire est rejeté.
        $this->postJson('/api/v1/admin/land-files', [
            'status' => 'Certifié définitivement',
            'title' => 'Terrain Ambohidratrimo',
            'fullName' => 'Haja Randria',
            'phone' => '032 44 718 26',
        ])->assertUnprocessable()->assertJsonValidationErrors('status');

        // Un brouillon incomplet mais cohérent est autorisé dans le back-office.
        $draft = $this->postJson('/api/v1/admin/land-files', [
            'status' => 'Brouillon',
            'priority' => 'Normale',
            'owner' => ['firstName' => 'Haja', 'lastName' => '', 'phone' => '', 'email' => ''],
        ])->assertCreated()->json();
        $this->assertSame('Brouillon', $draft['status']);

        // Un ancien libellé de statut est normalisé par DossierVocabulary puis accepté.
        $dossier = $this->postJson('/api/v1/admin/land-files', [
            'status' => 'Vérification juridique',
            'priority' => 'Haute',
            'clientId' => (string) $client->id,
            'title' => 'Terrain titré Iavoloha',
            'owner' => [
                'firstName' => 'Haja',
                'lastName' => 'Randria',
                'phone' => '+261 32 44 718 26',
                'email' => 'haja@example.test',
            ],
            'area' => 600,
            'price' => 95000000,
        ])->assertCreated()->json();

        $this->assertSame('Analyse des pièces', $dossier['status']);
        $this->assertSame('0324471826', $dossier['owner']['phone']);
    }

    public function test_admin_message_update_restricts_mutation_to_valid_read_status_only(): void
    {
        $this->actingAsAdmin();

        $message = ContactMessage::create([
            'full_name' => 'Onja Razanamparany',
            'phone' => '0345140268',
            'email' => 'onja@example.test',
            'subject' => 'Renseignement',
            'body' => 'Contenu original immuable.',
            'read' => false,
        ]);

        $this->putJson('/api/v1/admin/messages/'.$message->id, [])
            ->assertUnprocessable()->assertJsonValidationErrors('status');

        $this->putJson('/api/v1/admin/messages/'.$message->id, [
            'status' => 'statut-inconnu',
        ])->assertUnprocessable()->assertJsonValidationErrors('status');

        $this->putJson('/api/v1/admin/messages/'.$message->id, [
            'status' => 'traité',
            'body' => 'Tentative de réécriture ignorée',
        ])->assertOk()
            ->assertJsonPath('status', 'traité')
            ->assertJsonPath('message', 'Contenu original immuable.');
    }

    public function test_seeded_records_can_all_be_re_saved_through_admin_update_endpoints(): void
    {
        Storage::fake('local');
        $this->seed(PresentationSeeder::class);
        $this->actingAsAdmin();

        $bootstrap = $this->getJson('/api/v1/admin/bootstrap')->assertOk()->json();

        foreach ($bootstrap['lands'] as $land) {
            $this->putJson('/api/v1/admin/lands/'.$land['id'], $land)->assertOk();
        }
        foreach ($bootstrap['realisations'] as $realisation) {
            $this->putJson('/api/v1/admin/realisations/'.$realisation['id'], $realisation)->assertOk();
        }
        foreach ($bootstrap['clients'] as $client) {
            $this->putJson('/api/v1/admin/clients/'.$client['id'], $client)->assertOk();
        }
        foreach ($bootstrap['requests'] as $req) {
            $this->putJson('/api/v1/admin/requests/'.$req['id'], $req)->assertOk();
        }
        foreach ($bootstrap['searches'] as $search) {
            $this->putJson('/api/v1/admin/searches/'.$search['id'], $search)->assertOk();
        }
        foreach ($bootstrap['landFiles'] as $landFile) {
            $this->putJson('/api/v1/admin/land-files/'.$landFile['id'], $landFile)->assertOk();
        }
        foreach ($bootstrap['messages'] as $msg) {
            $this->putJson('/api/v1/admin/messages/'.$msg['id'], [
                'status' => $msg['status'],
            ])->assertOk();
        }
    }

    public function test_public_submissions_round_trip_cleanly_through_admin_updates(): void
    {
        Storage::fake('local');

        $land = Land::create([
            'title' => 'Terrain public test',
            'region' => 'Analamanga',
            'location' => 'Ambohidratrimo',
            'price' => 75000000,
            'status' => 'disponible',
            'publication_status' => 'publie',
        ]);

        $this->postJson('/api/v1/requests', [
            'kind' => 'visite',
            'landId' => (string) $land->id,
            'fullName' => 'Tahina Rakotomalala',
            'phone' => '+261 34 88 112 23',
            'preferredDate' => '2026-11-10',
            'preferredTime' => '09:30',
            'whatsapp' => 'Oui',
        ])->assertCreated();

        $this->post('/api/v1/land-files', [
            'fullName' => 'Noro Ramiandrisoa',
            'phone' => '+261 32 45 678 90',
            'whatsapp' => 'Oui',
            'ownerStatus' => 'Propriétaire unique',
            'idType' => 'CIN',
            'title' => 'Terrain résidentiel Talatamaty',
            'area' => 500,
            'price' => 90000000,
            'description' => 'Terrain plat proche axe principal.',
            'relief' => 'Plat',
            'access' => 'Route goudronnée',
            'region' => 'Analamanga',
            'district' => 'Ambohidratrimo',
            'commune' => 'Talatamaty',
            'fokontany' => 'Mandriambero',
            'directions' => 'Face école privée.',
            'payment' => 'Comptant uniquement',
            'docTypes' => ['Titre foncier (bokin-tany)'],
            'idFiles' => [UploadedFile::fake()->createWithContent(
                'cin.pdf',
                "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"
            )],
        ])->assertCreated();

        $this->actingAsAdmin();
        $bootstrap = $this->getJson('/api/v1/admin/bootstrap')->assertOk()->json();

        $visitPayload = $bootstrap['requests'][0];
        $visitPayload['status'] = 'Confirmée';

        $this->putJson('/api/v1/admin/requests/'.$visitPayload['id'], $visitPayload)
            ->assertOk()
            ->assertJsonPath('status', 'Confirmée')
            ->assertJsonPath('landTitle', 'Terrain public test')
            ->assertJsonPath('whatsapp', 'Oui');

        $dossierPayload = $bootstrap['landFiles'][0];
        $dossierPayload['status'] = 'Analyse des pièces';

        $this->putJson('/api/v1/admin/land-files/'.$dossierPayload['id'], $dossierPayload)
            ->assertOk()
            ->assertJsonPath('status', 'Analyse des pièces')
            ->assertJsonPath('whatsapp', 'Oui')
            ->assertJsonPath('source', 'Site web');
    }
}
