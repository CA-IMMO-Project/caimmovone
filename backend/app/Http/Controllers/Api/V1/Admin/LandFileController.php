<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveLandFileRequest;
use App\Models\LandFile;
use App\Support\DossierVocabulary;

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

    public function store(SaveLandFileRequest $request)
    {
        $data = $request->validated();
        $file = LandFile::create([
            'ref' => LandFile::nextRef(), // référence définitive générée par le serveur
            'client_id' => isset($data['clientId']) ? (int) $data['clientId'] : null,
            'status' => DossierVocabulary::status($data['status'] ?? "À l'étude"),
            'full_name' => $data['fullName'] ?? null,
            'phone' => $data['phone'] ?? null,
            'detail' => $this->cleanDetail($data),
        ]);

        return response()->json($file->toAdminArray(), 201);
    }

    public function update(SaveLandFileRequest $request, string $id)
    {
        $file = LandFile::findOrFail($id);
        $data = $request->validated();
        // Fusion (pas remplacement) avec le détail déjà en base : si le client
        // envoie un instantané incomplet (onglet resté ouvert, dépôt concurrent
        // depuis le site public pendant l'édition…), les champs absents de la
        // requête restent ceux déjà enregistrés au lieu d'être effacés.
        $file->fill([
            'client_id' => array_key_exists('clientId', $data) ? ($data['clientId'] !== null ? (int) $data['clientId'] : null) : $file->client_id,
            'status' => array_key_exists('status', $data) && $data['status'] !== null
                ? DossierVocabulary::status($data['status'])
                : $file->status,
            'full_name' => array_key_exists('fullName', $data) && $data['fullName'] !== null
                ? $data['fullName']
                : $file->full_name,
            'phone' => array_key_exists('phone', $data) ? $data['phone'] : $file->phone,
            'detail' => array_merge($file->detail ?? [], $this->cleanDetail($data)),
        ])->save();

        return response()->json($file->toAdminArray());
    }

    public function destroy(string $id)
    {
        LandFile::findOrFail($id)->delete();

        return response()->json(['message' => 'Dossier supprimé.']);
    }

    private function cleanDetail(array $data): array
    {
        unset($data['id'], $data['ref'], $data['createdAt'], $data['updatedAt']);

        return $data;
    }
}
