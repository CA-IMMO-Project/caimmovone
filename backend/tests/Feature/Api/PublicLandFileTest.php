<?php

namespace Tests\Feature\Api;

use App\Models\LandFile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Dépôt de terrain (« Vendre mon terrain ») — ce que le site public envoie
 * réellement : le dossier est créé AVEC la pièce d'identité du vendeur, et il
 * est refusé sans elle.
 */
class PublicLandFileTest extends TestCase
{
    use RefreshDatabase;

    /** Contenu minimal reconnu comme PDF (l'en-tête suffit à la détection). */
    private const PDF_MINIMAL = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n";

    private function dossier(array $overrides = []): array
    {
        return array_merge([
            'fullName' => 'Rakoto Jean',
            'phone' => '034 12 345 67',
            'whatsapp' => 'Oui',
            'ownerStatus' => 'Indivision familiale (terrain hérité)',
            'idType' => 'CIN',
            'title' => 'Terrain clos à Ivato',
            'area' => 650,
            'price' => 120000000,
            'description' => 'Terrain borné, calme, proche de la route principale.',
            'relief' => 'Plat',
            'access' => 'Piste carrossable',
            'region' => 'Analamanga',
            'district' => 'Avaradrano',
            'commune' => 'Ivato',
            'fokontany' => 'Ambohipo',
            'directions' => 'Derrière la station Jovenna, à 200 m de l’EPP.',
            'payment' => 'Les deux',
            'paymentDuration' => 'À discuter',
            'docTypes' => ['Titre foncier (bokin-tany)', 'Plan topographique ou bornage (coordonnées Laborde)'],
            'deposit' => 'À convenir avec l’agence',
            // Faux PDF (et non une image générée par GD) : le test tourne sur
            // n'importe quelle installation PHP, et le format PDF fait partie
            // de ceux acceptés pour la pièce d'identité.
            'idFiles' => [UploadedFile::fake()->createWithContent('cin-recto.pdf', self::PDF_MINIMAL)],
        ], $overrides);
    }

    public function test_land_file_is_created_with_the_owner_identity_piece(): void
    {
        Storage::fake('local');

        $this->post('/api/v1/land-files', $this->dossier())
            ->assertCreated()
            ->assertJsonStructure(['ref', 'message']);

        $file = LandFile::firstOrFail();
        $this->assertStringStartsWith('VEN-', $file->ref);
        $this->assertSame('Indivision familiale (terrain hérité)', $file->detail['ownerStatus']);
        // La pièce jointe est bien rattachée au dossier (visible dans la fiche VEN).
        $this->assertNotEmpty($file->detail['idDoc']['file'] ?? null);
        $this->assertDatabaseHas('clients', ['phone' => '0341234567']);
    }

    public function test_land_file_keeps_the_whatsapp_answer(): void
    {
        Storage::fake('local');

        $this->post('/api/v1/land-files', $this->dossier(['whatsapp' => 'Non']))->assertCreated();

        $file = LandFile::firstOrFail();
        $this->assertSame('Non', $file->detail['whatsapp'] ?? null);
    }

    public function test_land_file_without_identity_piece_is_rejected(): void
    {
        Storage::fake('local');

        $this->post('/api/v1/land-files', $this->dossier(['idFiles' => []]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('idFiles');

        $this->assertDatabaseCount('land_files', 0);
    }

    /**
     * Seules la CIN, le passeport et la carte de résident sont acceptés —
     * même liste que le back office (crm/model.ts : ID_TYPES), et celle exigée
     * pour l'acte de vente. Le certificat de résidence du fokontany (preuve
     * d'adresse) et le permis de conduire sont refusés.
     */
    public function test_identity_piece_type_is_restricted(): void
    {
        Storage::fake('local');

        foreach (['Certificat de résidence', 'Permis de conduire', 'Autre'] as $refuse) {
            $this->post('/api/v1/land-files', $this->dossier(['idType' => $refuse]))
                ->assertUnprocessable()
                ->assertJsonValidationErrors('idType');
        }

        $this->post('/api/v1/land-files', $this->dossier(['idType' => 'Carte de résident']))
            ->assertCreated();
    }

    /** Le vendeur peut demander une estimation à la place d'un prix. */
    /** Un dépôt qui ne dit rien de ses papiers est refusé ; « aucun document »
        est une réponse acceptée, elle. */
    public function test_land_file_requires_the_document_declaration(): void
    {
        Storage::fake('local');

        $dossier = $this->dossier();
        unset($dossier['docTypes']);
        $this->post('/api/v1/land-files', $dossier)
            ->assertUnprocessable()->assertJsonValidationErrors('docTypes');

        $this->post('/api/v1/land-files', $this->dossier([
            'docTypes' => ['Aucun document pour l’instant'],
        ]))->assertCreated();
    }

    /** Déclarer un titre sans joindre un seul fichier doit rester possible :
        le dépôt part, l'agent récupère les pièces à la visite. */
    public function test_land_file_accepts_a_declaration_without_any_uploaded_file(): void
    {
        Storage::fake('local');

        $dossier = $this->dossier([
            'docTypes' => ['Titre foncier (bokin-tany)'],
        ]);
        unset($dossier['documents']);

        $this->post('/api/v1/land-files', $dossier)->assertCreated();

        $file = LandFile::firstOrFail();
        $this->assertSame(['Titre foncier (bokin-tany)'], $file->detail['docTypes']);
        $this->assertSame([], $file->detail['documents']);
    }

    public function test_price_can_be_replaced_by_an_estimation_request(): void
    {
        Storage::fake('local');

        $this->post('/api/v1/land-files', $this->dossier([
            'price' => null,
            'estimateRequested' => 'Oui',
        ]))->assertCreated();

        $this->assertSame('Oui', LandFile::firstOrFail()->detail['estimateRequested']);
    }

    public function test_cin_recto_and_verso_are_both_attached_on_id_doc(): void
    {
        Storage::fake('local');

        $this->post('/api/v1/land-files', $this->dossier([
            'idType' => 'CIN',
            'idFiles' => [
                UploadedFile::fake()->createWithContent('cin-recto.pdf', self::PDF_MINIMAL),
                UploadedFile::fake()->createWithContent('cin-verso.pdf', self::PDF_MINIMAL),
            ],
        ]))->assertCreated();

        $file = LandFile::firstOrFail();
        $this->assertSame('Nouveau', $file->status);
        $this->assertSame('cin-recto.pdf', $file->detail['idDoc']['file']['name'] ?? null);
        $this->assertSame('cin-verso.pdf', $file->detail['idDoc']['verso']['name'] ?? null);
    }

    public function test_identity_piece_upload_enforces_strict_file_limits(): void
    {
        Storage::fake('local');

        // Plus de 2 fichiers refusé quelle que soit la pièce
        $this->post('/api/v1/land-files', $this->dossier([
            'idType' => 'CIN',
            'idFiles' => [
                UploadedFile::fake()->createWithContent('1.pdf', self::PDF_MINIMAL),
                UploadedFile::fake()->createWithContent('2.pdf', self::PDF_MINIMAL),
                UploadedFile::fake()->createWithContent('3.pdf', self::PDF_MINIMAL),
            ],
        ]))->assertUnprocessable()->assertJsonValidationErrors('idFiles');

        // Un passeport ne comporte qu'une page d'identité (max 1 fichier)
        $this->post('/api/v1/land-files', $this->dossier([
            'idType' => 'Passeport',
            'idFiles' => [
                UploadedFile::fake()->createWithContent('passeport-1.pdf', self::PDF_MINIMAL),
                UploadedFile::fake()->createWithContent('passeport-2.pdf', self::PDF_MINIMAL),
            ],
        ]))->assertUnprocessable()->assertJsonValidationErrors('idFiles');

        $this->post('/api/v1/land-files', $this->dossier([
            'idType' => 'Passeport',
            'idFiles' => [
                UploadedFile::fake()->createWithContent('passeport.pdf', self::PDF_MINIMAL),
            ],
        ]))->assertCreated();
    }

    public function test_public_vocabularies_and_fields_are_aligned_for_back_office(): void
    {
        Storage::fake('local');

        $this->post('/api/v1/land-files', $this->dossier([
            'firstName' => 'Jean',
            'lastName' => 'Rakoto',
            'region' => 'Autre région',
            'regionOther' => 'Melaky',
            'relief' => 'Plat',
            'payment' => 'Comptant',
            'paymentDuration' => 'Non concerné (comptant)',
            'noPhoto' => '1',
            'docTypes' => ['Titre foncier (bokin-tany)'],
            'documents' => [
                UploadedFile::fake()->createWithContent('titre.pdf', self::PDF_MINIMAL),
            ],
        ]))->assertCreated();

        $file = LandFile::firstOrFail();
        $this->assertSame('Rakoto', $file->detail['owner']['lastName']);
        $this->assertSame('Jean', $file->detail['owner']['firstName']);
        $this->assertSame('Autre région', $file->detail['region']);
        $this->assertSame('Melaky', $file->detail['regionOther']);
        $this->assertSame('Terrain plat', $file->detail['relief']);
        $this->assertSame('Comptant – paiement en une fois', $file->detail['salePayment']);
        $this->assertSame('', $file->detail['maxDuration']);
        $this->assertTrue($file->detail['noPhoto']);
        $this->assertSame(['Titre foncier (bokin-tany)'], $file->detail['docTypes']);
        $this->assertSame('Titre foncier', $file->detail['documents'][0]['category']);
    }

    public function test_admin_stats_and_reopen_workflow_reflect_land_files(): void
    {
        Storage::fake('local');

        $this->post('/api/v1/land-files', $this->dossier([
            'idFiles' => [
                UploadedFile::fake()->createWithContent('cin-recto.pdf', self::PDF_MINIMAL),
                UploadedFile::fake()->createWithContent('cin-verso.pdf', self::PDF_MINIMAL),
            ],
            'noPhoto' => '1',
            'summary' => str_repeat('Résumé détaillé du dossier vendeur. ', 120),
        ]))->assertCreated();

        Sanctum::actingAs(User::factory()->create(), ['admin']);

        $this->getJson('/api/v1/admin/stats')
            ->assertOk()
            ->assertJsonPath('requests.vente', 1)
            ->assertJsonPath('landFiles.total', 1)
            ->assertJsonPath('landFiles.new', 1);

        $file = LandFile::firstOrFail();
        $adminPayload = $file->toAdminArray();

        // Clôture en archive avec décision
        $closed = array_merge($adminPayload, [
            'status' => 'Archivé',
            'decision' => 'Refusé',
            'decisionReason' => 'Prix hors marché',
            'decidedAt' => '2026-10-26T10:00:00Z',
        ]);
        $this->putJson("/api/v1/admin/land-files/{$file->id}", $closed)->assertOk();
        $file->refresh();
        $this->assertSame('Refusé', $file->detail['decision'] ?? null);

        // Réouverture : efface la décision et conserve idDoc.verso + noPhoto
        $reopened = array_merge($file->toAdminArray(), [
            'status' => 'À examiner',
            'decision' => null,
            'decisionReason' => '',
            'decidedAt' => '',
        ]);
        $this->putJson("/api/v1/admin/land-files/{$file->id}", $reopened)->assertOk();
        $file->refresh();
        $this->assertNull($file->detail['decision'] ?? null);
        $this->assertSame('cin-verso.pdf', $file->detail['idDoc']['verso']['name'] ?? null);
        $this->assertTrue($file->detail['noPhoto'] ?? false);
    }
}
