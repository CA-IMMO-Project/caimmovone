<?php

namespace Tests\Feature\Api;

use App\Models\LandFile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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
            'docTypes' => ['Titre foncier', 'Plan du terrain'],
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

    public function test_price_can_be_replaced_by_an_estimation_request(): void
    {
        Storage::fake('local');

        $this->post('/api/v1/land-files', $this->dossier([
            'price' => null,
            'estimateRequested' => 'Oui',
        ]))->assertCreated();

        $this->assertSame('Oui', LandFile::firstOrFail()->detail['estimateRequested']);
    }
}
