<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UploadFileRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

/** Store CRM attachments privately and publication media explicitly publicly. */
class UploadController extends Controller
{
    public function store(UploadFileRequest $request): JsonResponse
    {
        $file = $request->file('file');
        $visibility = $request->validated('visibility');
        $mime = (string) $file->getMimeType();

        if ($visibility === 'public' && ! str_starts_with($mime, 'image/')) {
            return response()->json([
                'message' => 'Seules les images du catalogue peuvent être rendues publiques.',
                'errors' => ['file' => ['Type de fichier public non autorisé.']],
            ], 422);
        }

        $extension = strtolower($file->extension() ?: 'bin');
        $name = Str::uuid().'.'.$extension;
        $disk = $visibility === 'public' ? 'public' : 'local';
        $directory = $visibility === 'public' ? 'catalogue' : 'admin-uploads';
        $path = $file->storeAs($directory, $name, $disk);

        abort_if($path === false, 500, 'Impossible de stocker le fichier.');

        $url = $visibility === 'public'
            ? '/storage/'.$path
            : '/api/v1/admin/files/'.str_replace('%2F', '/', rawurlencode($path));

        return response()->json([
            'id' => (string) Str::uuid(),
            'name' => $file->getClientOriginalName(),
            'type' => $mime,
            'size' => $file->getSize(),
            'url' => $url,
        ], 201);
    }
}
