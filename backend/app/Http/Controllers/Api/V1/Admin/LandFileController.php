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
            'status' => DossierVocabulary::status($data['status'] ?? 'Nouveau'),
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
        $newStatus = array_key_exists('status', $data) && $data['status'] !== null
            ? DossierVocabulary::status($data['status'])
            : $file->status;

        $merged = array_merge($file->detail ?? [], $this->cleanDetail($data));
        // Si un dossier archivé est rouvert sans nouvelle décision explicite,
        // on efface la décision précédente pour restaurer le cycle d'étude actif.
        if ($file->status === 'Archivé' && $newStatus !== 'Archivé' && ! array_key_exists('decision', $data)) {
            unset($merged['decision'], $merged['decisionReason'], $merged['decidedAt']);
        }
        if (array_key_exists('decision', $data) && $data['decision'] === null) {
            unset($merged['decision'], $merged['decisionReason'], $merged['decidedAt']);
        }

        $file->fill([
            'client_id' => array_key_exists('clientId', $data) ? ($data['clientId'] !== null ? (int) $data['clientId'] : null) : $file->client_id,
            'status' => $newStatus,
            'full_name' => array_key_exists('fullName', $data) && $data['fullName'] !== null
                ? $data['fullName']
                : $file->full_name,
            'phone' => array_key_exists('phone', $data) ? $data['phone'] : $file->phone,
            'detail' => $merged,
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
