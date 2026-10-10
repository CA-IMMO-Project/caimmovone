<?php

namespace Tests\Feature\Api;

use App\Models\Client;
use App\Models\ContactMessage;
use App\Models\Land;
use App\Models\LandFile;
use App\Models\Realisation;
use App\Models\Search;
use App\Models\SiteRequest;
use App\Models\User;
use App\Support\PresentationData;
use Carbon\CarbonImmutable;
use Database\Seeders\AdminUserSeeder;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\PresentationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PresentationDataTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_dataset_contains_coherent_records_and_real_private_pdf_files(): void
    {
        $this->seed(PresentationSeeder::class);
        $this->assertSame(10, Land::count());
        $this->assertSame(12, Client::count());
        $this->assertSame(8, SiteRequest::where('kind', 'interet')->count());
        $this->assertSame(4, SiteRequest::where('kind', 'visite')->count());
        $this->assertSame(4, Search::count());
        $this->assertSame(4, LandFile::count());
        $this->assertSame(6, ContactMessage::count());
        $this->assertSame(3, Realisation::count());
        $this->assertSame(0, Realisation::where('published', true)->count());
        $this->assertSame(51, DB::table('presentation_records')->count());
        $this->assertSame(50, count(Storage::disk('local')->allFiles('presentation/v1')));
        $this->assertSame(0, User::count(), 'Le jeu ne doit pas créer de compte ni de mot de passe.');

        foreach (Land::all() as $land) {
            $this->assertGreaterThan(0, $land->price);
            $this->assertCount(3, $land->gallery);
            $this->assertCount(3, $land->documents);
            foreach ($land->documents as $file) {
                $this->assertPrivatePdf($file);
            }
            if ($land->lots) {
                $this->assertSame($land->area, array_sum(array_column($land->lots, 'area')));
                $this->assertSame($land->price, array_sum(array_column($land->lots, 'price')));
            }
        }
        foreach (SiteRequest::all() as $request) {
            $this->assertNotNull($request->land);
            $this->assertNotNull($request->client);
            $this->assertSame((string) $request->land_id, $request->detail['landId']);
            $this->assertSame((string) $request->client_id, $request->detail['clientId']);
            $this->assertPrivatePdf($request->detail['attachments'][0]);
            if ($request->lot_id) {
                $this->assertContains($request->lot_id, array_column($request->land->lots, 'id'));
            }
        }
        foreach (LandFile::all() as $file) {
            $this->assertNotNull($file->client);
            $this->assertPrivatePdf($file->detail['idDoc']['file']);
            $this->assertSame('Autre', $file->detail['idDoc']['type']);
            $this->assertSame('', $file->detail['owner']['accountNumber']);
            $this->assertCount(3, $file->detail['documents']);
        }
        foreach (Search::all() as $search) {
            $this->assertNotNull($search->client);
            $this->assertPrivatePdf($search->detail['attachments'][0]);
            foreach ($search->detail['proposals'] as $proposal) {
                $this->assertNotNull(Land::find($proposal['landId']));
            }
        }
        foreach (Client::all() as $client) {
            $this->assertStringEndsWith('@example.com', $client->email);
            $this->assertTrue(ctype_digit($client->toAdminArray()['age']));
        }
        $sales = Land::all()->flatMap(fn ($land) => $land->sales ?? []);
        $this->assertCount(2, $sales);
        foreach ($sales as $sale) {
            $this->assertSame('Achat finalisé', SiteRequest::findOrFail($sale['buyRequestId'])->status);
        }
    }

    public function test_creation_dates_and_history_have_consistent_chronology_and_timezone(): void
    {
        $this->seed(PresentationSeeder::class);
        foreach (SiteRequest::all() as $request) {
            $historyStart = CarbonImmutable::parse($request->detail['history'][0]['at']);
            $this->assertSame($request->created_at->getTimestamp(), $historyStart->getTimestamp());
            $this->assertTrue($request->land->created_at->lessThanOrEqualTo($request->created_at));
            $this->assertTrue($request->client->created_at->lessThanOrEqualTo($request->created_at));
        }
    }

    public function test_reloading_preserves_real_records_and_edits_without_duplicates(): void
    {
        $first = PresentationData::json('lands.json')[0];
        $realFile = ['id' => 'original', 'name' => 'Pièce originale.pdf', 'type' => 'application/pdf', 'size' => 30, 'url' => '/api/v1/admin/files/originals/title.pdf'];
        Storage::disk('local')->put('originals/title.pdf', '%PDF-1.7 original conservé');
        $realLand = (new Land)->fillFromPublic(array_merge($first, ['price' => 987654321, 'documents' => [$realFile]]));
        $realLand->forceFill(['verified' => true])->save();
        $realClient = Client::create(['full_name' => 'Joël Rakotondrasoa', 'phone' => '0340000001', 'email' => 'joel@example.com', 'notes' => 'Notes réelles à conserver.']);
        $landBefore = $realLand->fresh()->getAttributes();
        $clientBefore = $realClient->fresh()->getAttributes();

        $this->seed(PresentationSeeder::class);
        $owned = (new PresentationData)->find('land:laceo-special', Land::class);
        $this->assertNotSame($realLand->id, $owned->id);
        $owned->update(['title' => 'Titre ajusté par le client', 'price' => 123456789, 'documents' => [$realFile]]);
        $ownedBefore = $owned->fresh()->getAttributes();
        $counts = $this->counts();
        $counters = DB::table('reference_counters')->orderBy('scope')->orderBy('reference_date')->get()->toArray();
        $fileBefore = Storage::disk('local')->get('originals/title.pdf');

        $this->seed(PresentationSeeder::class);
        $this->assertSame($counts, $this->counts());
        $this->assertEquals($counters, DB::table('reference_counters')->orderBy('scope')->orderBy('reference_date')->get()->toArray());
        $this->assertSame($landBefore, $realLand->fresh()->getAttributes());
        $this->assertSame($clientBefore, $realClient->fresh()->getAttributes());
        $this->assertSame($ownedBefore, $owned->fresh()->getAttributes());
        $this->assertSame($fileBefore, Storage::disk('local')->get('originals/title.pdf'));
        $this->assertSame(11, Land::count());
        $this->assertSame(13, Client::count());
    }

    public function test_missing_sample_files_are_restored_without_overwriting_existing_files(): void
    {
        $this->seed(PresentationSeeder::class);
        $file = Land::firstOrFail()->documents[0];
        $path = substr($file['url'], strlen('/api/v1/admin/files/'));
        Storage::disk('local')->delete($path);
        $second = Land::firstOrFail()->documents[1];
        $secondPath = substr($second['url'], strlen('/api/v1/admin/files/'));
        Storage::disk('local')->put($secondPath, '%PDF-1.7 version conservée');

        $this->seed(PresentationSeeder::class);
        $this->assertTrue(Storage::disk('local')->exists($path));
        $this->assertSame('%PDF-1.7 version conservée', Storage::disk('local')->get($secondPath));
        $this->assertSame(10, Land::count());
    }

    public function test_sample_document_requires_authentication_and_streams_a_pdf(): void
    {
        $this->seed(PresentationSeeder::class);
        $url = Land::firstOrFail()->documents[0]['url'];
        $this->getJson($url)->assertUnauthorized();
        Sanctum::actingAs(User::factory()->create(), ['admin']);
        $response = $this->getJson($url)->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $response->streamedContent());
    }

    public function test_public_catalogue_hides_old_flag_buyers_lot_history_and_private_urls(): void
    {
        $this->seed(PresentationSeeder::class);
        $land = (new PresentationData)->find('land:laceo-special', Land::class);
        $land->forceFill(['verified' => true])->save();
        $public = $this->getJson('/api/v1/lands/'.$land->id)->assertOk()->assertJsonMissingPath('verified')->json();
        $this->assertSame([], $public['sales']);
        $this->assertArrayNotHasKey('history', $public['lots'][0]);
        $this->assertNull($public['documents'][0]['url']);
        $this->assertArrayNotHasKey('verified', $land->toArray());

        Sanctum::actingAs(User::factory()->create(), ['admin']);
        $admin = $this->getJson('/api/v1/admin/lands/'.$land->id)->assertOk()->assertJsonMissingPath('verified')->json();
        $this->assertCount(1, $admin['sales']);
        $this->assertNotEmpty($admin['lots'][0]['history']);
        $this->assertStringStartsWith('/api/v1/admin/files/', $admin['documents'][0]['url']);
        $this->assertSame('Nantenaina', $admin['sales'][0]['buyer']['firstName']);
    }

    public function test_legacy_flag_is_ignored_when_an_old_editor_sends_it(): void
    {
        $land = (new Land)->fillFromPublic(PresentationData::json('lands.json')[0]);
        $land->forceFill(['verified' => true])->save();
        Sanctum::actingAs(User::factory()->create(), ['admin']);
        $this->patchJson('/api/v1/admin/lands/'.$land->id, ['title' => 'Titre corrigé', 'verified' => false])
            ->assertOk()->assertJsonPath('title', 'Titre corrigé')->assertJsonMissingPath('verified');
        $this->assertTrue((bool) $land->fresh()->getRawOriginal('verified'));
    }

    public function test_old_dossier_labels_are_adapted_without_modifying_original_records(): void
    {
        $original = [
            'documents' => [['id' => 'original', 'name' => 'Titre original.pdf', 'status' => 'Vérifié', 'url' => '/api/v1/admin/files/originals/title.pdf']],
            'checklist' => ['Identité du propriétaire vérifiée', 'Situation juridique vérifiée'],
            'legalCheck' => 'Note historique à conserver.',
        ];
        $file = LandFile::create(['ref' => LandFile::nextRef(), 'status' => 'Vérification juridique', 'detail' => $original]);
        $output = $file->toAdminArray();
        $this->assertSame('Analyse des pièces', $output['status']);
        $this->assertSame('Reçu', $output['documents'][0]['status']);
        $this->assertSame('Coordonnées du propriétaire renseignées', $output['checklist'][0]);
        $this->assertEquals($original, $file->fresh()->detail);
        $this->assertSame('Vérification juridique', $file->fresh()->status);
        $this->assertSame($original['documents'][0]['url'], $output['documents'][0]['url']);
    }

    public function test_installation_is_refused_in_production_without_mutation(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        $before = $this->counts();
        $this->artisan('presentation:install')->assertExitCode(1);
        $this->assertSame($before, $this->counts());
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_old_reset_endpoint_adds_examples_without_deleting_existing_land(): void
    {
        $real = (new Land)->fillFromPublic(PresentationData::json('lands.json')[0]);
        $real->title = 'Terrain réel à conserver';
        $real->save();
        Sanctum::actingAs(User::factory()->create(), ['admin']);
        $this->postJson('/api/v1/admin/lands/reset')->assertOk();
        $this->assertSame('Terrain réel à conserver', $real->fresh()->title);
        $this->assertSame(11, Land::count());
        $this->postJson('/api/v1/admin/lands/reset')->assertOk();
        $this->assertSame(11, Land::count());
    }

    public function test_old_reset_endpoint_is_refused_and_hidden_in_production(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['admin']);
        $this->app->detectEnvironment(fn () => 'production');
        $this->getJson('/api/v1/admin/bootstrap')->assertOk()->assertJsonPath('presentationAllowed', false);
        $this->postJson('/api/v1/admin/lands/reset')->assertForbidden();
        $this->assertSame(0, Land::count());
    }

    public function test_normal_database_seeder_never_installs_invented_business_records(): void
    {
        $this->partialMock(AdminUserSeeder::class, fn ($mock) => $mock->shouldReceive('run')->once());
        $this->seed(DatabaseSeeder::class);
        $this->assertSame(0, Land::count());
        $this->assertSame(0, Client::count());
        $this->assertSame(0, DB::table('presentation_records')->count());
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_messages_keep_the_complete_last_name(): void
    {
        $message = new ContactMessage(['full_name' => 'Sarah Andrianarison']);
        $this->assertSame('Andrianarison', $message->toAdminArray()['lastName']);
    }

    private function assertPrivatePdf(array $file): void
    {
        $this->assertSame('application/pdf', $file['type']);
        $this->assertGreaterThan(1000, $file['size']);
        $this->assertStringStartsWith('/api/v1/admin/files/presentation/v1/', $file['url']);
        $path = substr($file['url'], strlen('/api/v1/admin/files/'));
        $this->assertTrue(Storage::disk('local')->exists($path));
        $this->assertSame($file['size'], Storage::disk('local')->size($path));
        $this->assertStringStartsWith('%PDF-', Storage::disk('local')->get($path));
    }

    private function counts(): array
    {
        $counts = [];
        foreach (['lands', 'clients', 'requests', 'searches', 'land_files', 'messages', 'realisations', 'presentation_records', 'reference_counters'] as $table) {
            $counts[$table] = DB::table($table)->count();
        }

        return $counts;
    }
}
