<?php

namespace Tests\Feature\Api;

use App\Models\Client;
use App\Models\Land;
use App\Models\SiteRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReferenceAndIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_business_references_are_unique_and_incremental(): void
    {
        $first = SiteRequest::nextRef('interet');
        SiteRequest::create([
            'ref' => $first, 'kind' => 'interet', 'full_name' => 'Test',
            'phone' => '0341234567', 'status' => 'Nouvelle',
        ]);
        $second = SiteRequest::nextRef('interet');

        $this->assertNotSame($first, $second);
        $this->assertStringStartsWith($first.'-', $second);
    }

    public function test_deleting_related_records_preserves_request_history_with_null_foreign_keys(): void
    {
        $client = Client::create(['full_name' => 'Jean', 'phone' => '0341234567']);
        $land = Land::create([
            'title' => 'Terrain', 'region' => 'Analamanga',
            'location' => 'Antananarivo', 'price' => 100,
        ]);
        $request = SiteRequest::create([
            'ref' => SiteRequest::nextRef('interet'), 'kind' => 'interet',
            'client_id' => $client->id, 'land_id' => $land->id,
            'full_name' => 'Jean', 'phone' => '0341234567', 'status' => 'Nouvelle',
        ]);

        $client->delete();
        $land->delete();

        $request->refresh();
        $this->assertNull($request->client_id);
        $this->assertNull($request->land_id);
    }
}
