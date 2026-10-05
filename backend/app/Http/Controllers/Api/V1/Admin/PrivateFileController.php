<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Download a confidential CRM file after Sanctum authorization. */
class PrivateFileController extends Controller
{
    public function show(string $path): StreamedResponse
    {
        $path = ltrim(rawurldecode($path), '/');

        abort_if(str_contains($path, '..'), 400, 'Chemin de fichier invalide.');
        abort_unless(Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, null, [
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
