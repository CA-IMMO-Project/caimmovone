<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveSearchRequest;
use App\Models\Search;

/** Recherches spécifiques (back office). */
class SearchController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => Search::query()->orderByDesc('id')->get()->map(fn (Search $s) => $s->toAdminArray()),
        ]);
    }

    public function show(string $id)
    {
        return response()->json(Search::findOrFail($id)->toAdminArray());
    }

    public function store(SaveSearchRequest $request)
    {
        $data = $request->validated();
        $search = Search::create([
            'ref' => Search::nextRef(), // référence définitive générée par le serveur
            'client_id' => isset($data['clientId']) ? (int) $data['clientId'] : null,
            'status' => $data['status'] ?? 'Nouvelle',
            'main_zone' => $data['mainZone'] ?? null,
            'full_name' => $data['fullName'],
            'phone' => $data['phone'],
            'email' => $data['email'] ?? null,
            'source' => $data['source'] ?? 'Backoffice',
            'detail' => $this->cleanDetail($data),
        ]);

        return response()->json($search->toAdminArray(), 201);
    }

    public function update(SaveSearchRequest $request, string $id)
    {
        $search = Search::findOrFail($id);
        $data = $request->validated();
        // Fusion (pas remplacement) avec le détail déjà en base : un instantané
        // incomplet côté client ne doit pas effacer les champs absents de la requête.
        $search->fill([
            'client_id' => array_key_exists('clientId', $data) ? ($data['clientId'] !== null ? (int) $data['clientId'] : null) : $search->client_id,
            'status' => $data['status'] ?? $search->status,
            'main_zone' => array_key_exists('mainZone', $data) ? $data['mainZone'] : $search->main_zone,
            'full_name' => $data['fullName'] ?? $search->full_name,
            'phone' => $data['phone'] ?? $search->phone,
            'email' => array_key_exists('email', $data) ? $data['email'] : $search->email,
            'source' => $data['source'] ?? $search->source,
            'detail' => array_merge($search->detail ?? [], $this->cleanDetail($data)),
        ])->save();

        return response()->json($search->toAdminArray());
    }

    public function destroy(string $id)
    {
        Search::findOrFail($id)->delete();

        return response()->json(['message' => 'Recherche supprimée.']);
    }

    private function cleanDetail(array $data): array
    {
        unset($data['id'], $data['ref'], $data['createdAt'], $data['updatedAt']);

        return $data;
    }
}
