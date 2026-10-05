<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PrivateFileTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_upload_is_stored_on_private_disk(): void
    {
        Storage::fake('local');
        Sanctum::actingAs(User::factory()->create(), ['admin']);

        $response = $this->post('/api/v1/admin/uploads', [
            'file' => UploadedFile::fake()->createWithContent(
                'titre-foncier.png',
                base64_decode(
                    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
                ),
            ),
            'visibility' => 'private',
        ], ['Accept' => 'application/json']);

        $response->assertCreated()->assertJsonPath('name', 'titre-foncier.png');
        $this->assertStringStartsWith('/api/v1/admin/files/', $response->json('url'));
        $this->assertCount(1, Storage::disk('local')->allFiles('admin-uploads'));
    }

    public function test_executable_upload_is_rejected(): void
    {
        Storage::fake('local');
        Sanctum::actingAs(User::factory()->create(), ['admin']);

        $this->post('/api/v1/admin/uploads', [
            'file' => UploadedFile::fake()->create('malware.php', 10, 'application/x-php'),
            'visibility' => 'private',
        ], ['Accept' => 'application/json'])->assertUnprocessable();
    }

    public function test_private_file_cannot_be_downloaded_anonymously(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('admin-uploads/private.pdf', 'secret');

        $this->getJson('/api/v1/admin/files/admin-uploads/private.pdf')->assertUnauthorized();
    }
}
