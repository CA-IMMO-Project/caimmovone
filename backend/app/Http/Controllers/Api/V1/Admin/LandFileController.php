<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\LandFile;
use Illuminate\Http\Request;

/** Dossiers « À vendre » (dépôts de terrain, back office). */
class LandFileController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => LandFile::query()->orderByDesc('id')->get()->map(fn (LandFile $f) => $f->toAdminArray()),
        ]);
    }

    public function show(string $id)
    {
        return response()->json(LandFile::findOrFail($id)->toAdminArray());
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $file = LandFile::create([
            'ref' => LandFile::nextRef(), // référence définitive générée par le serveur
            'client_id' => isset($data['clientId']) && is_numeric($data['clientId']) ? (int) $data['clientId'] : null,
            'status' => $data['status'] ?? "À l'étude",
            'full_name' => $data['fullName'] ?? $data['ownerName'] ?? null,
            'phone' => $data['phone'] ?? null,
            'detail' => $data,
        ]);
        return response()->json($file->toAdminArray(), 201);
    }

    public function update(Request $request, string $id)
    {
        $file = LandFile::findOrFail($id);
        $data = $request->all();
        $file->fill([
            'client_id' => array_key_exists('clientId', $data) ? (is_numeric($data['clientId']) ? (int) $data['clientId'] : null) : $file->client_id,
            'status' => $data['status'] ?? $file->status,
            'full_name' => $data['fullName'] ?? $data['ownerName'] ?? $file->full_name,
            'phone' => array_key_exists('phone', $data) ? ($data['phone'] ?: null) : $file->phone,
            'detail' => $data,
        ])->save();
        return response()->json($file->toAdminArray());
    }

    public function destroy(string $id)
    {
        LandFile::findOrFail($id)->delete();
        return response()->json(['message' => 'Dossier supprimé.']);
    }
}
