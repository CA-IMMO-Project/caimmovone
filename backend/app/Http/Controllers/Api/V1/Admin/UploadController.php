<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * POST /api/v1/admin/uploads — dépose un fichier (photo, vidéo, pièce) sur
 * le serveur et renvoie sa fiche + URL publique. Les fichiers vivent sur le
 * disque (storage/app/public), seules leurs métadonnées vont en base.
 */
class UploadController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:51200', // 50 Mo max
        ]);

        $file = $request->file('file');
        $safe = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)) . '-' . Str::random(6) . '.' . strtolower($file->getClientOriginalExtension() ?: 'bin');
        $path = $file->storeAs('uploads', $safe, 'public');

        return response()->json([
            'id' => Str::random(10),
            'name' => $file->getClientOriginalName(),
            'type' => $file->getMimeType(),
            'size' => $file->getSize(),
            // Chemin relatif : le frontend le fait passer par son proxy /api
            // (utilisable en dev comme en production, quelle que soit l'origine).
            'url' => '/storage/' . $path,
        ], 201);
    }
}
