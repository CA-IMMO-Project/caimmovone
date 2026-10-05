<?php

namespace Tests\Feature\Api;

use App\Models\Land;
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

    public function test_valid_public_request_is_linked_to_a_client_and_land(): void
    {
        $land = $this->land();

        $this->postJson('/api/v1/requests', [
            'kind' => 'interet', 'fullName' => 'Jean Rakoto',
            'phone' => '034 12 345 67', 'email' => 'Jean@Example.test',
            'landId' => (string) $land->id,
        ])->assertCreated()->assertJsonStructure(['ref', 'message']);

        $this->assertDatabaseHas('clients', ['phone' => '0341234567']);
        $this->assertDatabaseHas('requests', ['kind' => 'interet', 'land_id' => $land->id]);
    }

    public function test_invalid_phone_is_rejected(): void
    {
        $this->postJson('/api/v1/requests', [
            'kind' => 'interet', 'fullName' => 'Jean Rakoto', 'phone' => '123',
        ])->assertUnprocessable()->assertJsonValidationErrors('phone');
    }

    public function test_unknown_land_is_rejected_without_partial_client_creation(): void
    {
        $this->postJson('/api/v1/requests', [
            'kind' => 'interet', 'fullName' => 'Jean Rakoto',
            'phone' => '034 12 345 67', 'landId' => '999999',
        ])->assertUnprocessable();

        $this->assertDatabaseCount('clients', 0);
        $this->assertDatabaseCount('requests', 0);
    }

    public function test_duplicate_request_updates_existing_record(): void
    {
        $land = $this->land();
        $payload = [
            'kind' => 'interet', 'fullName' => 'Jean Rakoto',
            'phone' => '034 12 345 67', 'landId' => (string) $land->id,
        ];

        $this->postJson('/api/v1/requests', $payload)->assertCreated();
        $this->postJson('/api/v1/requests', $payload + ['message' => 'Nouvelle précision'])
            ->assertOk()->assertJson(['updated' => true]);

        $this->assertDatabaseCount('clients', 1);
        $this->assertDatabaseCount('requests', 1);
    }
}
