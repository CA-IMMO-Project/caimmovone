<?php

namespace Tests\Feature\Api;

use App\Models\Land;
use App\Models\SiteRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicRequestTest extends TestCase
{
    use RefreshDatabase;

    private function land(): Land
    {
        return Land::create([
            'title' => 'Terrain test', 'region' => 'Analamanga',
            'location' => 'Antananarivo', 'price' => 1000000,
        ]);
    }

    /**
     * Demande d'achat complète telle que l'envoie le site public.
     * Sont obligatoires : l'objectif, le délai, le budget (choisi sur le site à
     * partir du prix affiché) et les informations de paiement.
     * « Parlez-nous de votre projet » est facultatif : il n'apparaît donc pas
     * dans cette charge utile minimale.
     */
    private function buyPayload(array $overrides = []): array
    {
        return array_merge([
            'kind' => 'interet',
            'fullName' => 'Jean Rakoto',
            'phone' => '034 12 345 67',
            'goal' => 'Résidence principale',
            'deadline' => 'Dès que possible',
            'budget' => 'Le prix affiché me convient',
            'budgetMin' => 80000000,
            'budgetMax' => 80000000,
            'paymentMode' => 'Comptant',
            'nationality' => 'Madagascar',
            'bankAccount' => 'Oui',
        ], $overrides);
    }

    public function test_valid_public_request_is_linked_to_a_client_and_land(): void
    {
        $land = $this->land();

        $this->postJson('/api/v1/requests', $this->buyPayload([
            'email' => 'Jean@Example.test',
            'landId' => (string) $land->id,
        ]))->assertCreated()->assertJsonStructure(['ref', 'message']);

        $this->assertDatabaseHas('clients', ['phone' => '0341234567']);
        $this->assertDatabaseHas('requests', ['kind' => 'interet', 'land_id' => $land->id]);

        // Le choix de budget et les champs de projet alimentent la fiche admin.
        $meta = SiteRequest::first()->meta;
        $this->assertSame(80000000, $meta['budgetMin']);
        $this->assertSame(80000000, $meta['budgetMax']);
        $this->assertSame('Résidence principale', $meta['goal']);
        $this->assertSame('Le prix affiché me convient', $meta['budget']);
    }

    /** Une demande d'achat sans budget ni paiement est refusée (plus de fiche vide). */
    public function test_incomplete_buy_request_is_rejected(): void
    {
        $land = $this->land();

        $this->postJson('/api/v1/requests', [
            'kind' => 'interet', 'fullName' => 'Jean Rakoto',
            'phone' => '034 12 345 67', 'landId' => (string) $land->id,
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'goal', 'deadline', 'budget', 'paymentMode', 'nationality', 'bankAccount',
        ]);

        $this->assertDatabaseCount('requests', 0);
    }

    /** « Parlez-nous de votre projet » est facultatif : une demande sans texte
        passe, et le texte reste enregistré quand il est fourni. */
    public function test_project_description_is_optional(): void
    {
        $this->postJson('/api/v1/requests', $this->buyPayload())
            ->assertCreated();

        $this->postJson('/api/v1/requests', $this->buyPayload([
            'projectDescription' => 'Nous cherchons un terrain calme pour notre famille.',
        ]))->assertCreated();

        $metas = SiteRequest::all()->pluck('meta');
        $this->assertArrayNotHasKey('projectDescription', $metas[0]);
        $this->assertSame(
            'Nous cherchons un terrain calme pour notre famille.',
            $metas[1]['projectDescription']
        );
    }

    /** Paiement échelonné sans apport : dossier inexploitable.
        La tranche choisie OU un montant suffit — le formulaire demande la
        tranche, et le montant exact reste accepté s'il est fourni. */
    public function test_instalment_request_requires_a_deposit(): void
    {
        $this->postJson('/api/v1/requests', $this->buyPayload(['paymentMode' => 'Facilité']))
            ->assertUnprocessable()->assertJsonValidationErrors('downPaymentRange');

        // La profession accompagne un paiement échelonné (règle du formulaire
        // public, appliquée aussi par le serveur).
        $this->postJson('/api/v1/requests', $this->buyPayload([
            'paymentMode' => 'Facilité', 'downPaymentRange' => '20 à 40 %', 'profession' => 'Commerçant',
        ]))->assertCreated();

        $this->postJson('/api/v1/requests', $this->buyPayload([
            'paymentMode' => 'Facilité', 'downPaymentAmount' => '35000000', 'profession' => 'Commerçant',
        ]))->assertCreated();
    }

    /** Paiement échelonné sans profession : refusé (le conseiller doit savoir à qui il parle). */
    public function test_instalment_request_requires_a_profession(): void
    {
        $this->postJson('/api/v1/requests', $this->buyPayload([
            'paymentMode' => 'Facilité', 'downPaymentRange' => '20 à 40 %',
        ]))->assertUnprocessable()->assertJsonValidationErrors('profession');
    }

    /** La visite et la recherche demandent aussi si le numéro est sur WhatsApp. */
    public function test_visit_and_search_requests_keep_the_whatsapp_answer(): void
    {
        $land = $this->land();

        $this->postJson('/api/v1/requests', [
            'kind' => 'visite', 'fullName' => 'Jean Rakoto', 'phone' => '034 12 345 67',
            'landId' => (string) $land->id, 'visitDate' => '2026-11-02', 'visitTime' => 'Matin (9h – 12h)',
            'whatsapp' => 'Oui', 'email' => 'jean@example.test',
        ])->assertCreated();

        $visit = SiteRequest::where('kind', 'visite')->firstOrFail();
        $this->assertSame('Oui', $visit->meta['whatsapp']);
        $this->assertSame('jean@example.test', $visit->meta['email'] ?? $visit->email);
    }

    public function test_invalid_phone_is_rejected(): void
    {
        $this->postJson('/api/v1/requests', $this->buyPayload(['phone' => '123']))
            ->assertUnprocessable()->assertJsonValidationErrors('phone');
    }

    public function test_unknown_land_is_rejected_without_partial_client_creation(): void
    {
        $this->postJson('/api/v1/requests', $this->buyPayload(['landId' => '999999']))
            ->assertUnprocessable();

        $this->assertDatabaseCount('clients', 0);
        $this->assertDatabaseCount('requests', 0);
    }

    public function test_duplicate_request_updates_existing_record(): void
    {
        $land = $this->land();
        $payload = $this->buyPayload(['landId' => (string) $land->id]);

        $this->postJson('/api/v1/requests', $payload)->assertCreated();
        $this->postJson('/api/v1/requests', $payload + ['message' => 'Nouvelle précision'])
            ->assertOk()->assertJson(['updated' => true]);

        $this->assertDatabaseCount('clients', 1);
        $this->assertDatabaseCount('requests', 1);
    }

    /** Une demande de visite n'est pas soumise aux règles de la demande d'achat. */
    public function test_visit_request_does_not_require_project_fields(): void
    {
        $land = $this->land();

        $this->postJson('/api/v1/requests', [
            'kind' => 'visite', 'fullName' => 'Jean Rakoto', 'phone' => '034 12 345 67',
            'landId' => (string) $land->id, 'visitDate' => '2026-11-02', 'visitTime' => 'Matin (9h – 12h)',
        ])->assertCreated();
    }
}
