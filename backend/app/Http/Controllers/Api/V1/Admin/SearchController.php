<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Search;
use Illuminate\Http\Request;

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

    public function store(Request $request)
    {
        $data = $request->all();
        $search = Search::create([
            'ref' => Search::nextRef(), // référence définitive générée par le serveur
            'client_id' => isset($data['clientId']) && is_numeric($data['clientId']) ? (int) $data['clientId'] : null,
            'status' => $data['status'] ?? 'Nouvelle',
            'main_zone' => $data['mainZone'] ?? null,
            'full_name' => $data['fullName'] ?? 'Sans nom',
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'source' => $data['source'] ?? 'Backoffice',
            'detail' => $data,
        ]);

        return response()->json($search->toAdminArray(), 201);
    }

    public function update(Request $request, string $id)
    {
        $search = Search::findOrFail($id);
        $data = $request->all();
        $search->fill([
            'client_id' => array_key_exists('clientId', $data) ? (is_numeric($data['clientId']) ? (int) $data['clientId'] : null) : $search->client_id,
            'status' => $data['status'] ?? $search->status,
            'main_zone' => $data['mainZone'] ?? $search->main_zone,
            'full_name' => $data['fullName'] ?? $search->full_name,
            'phone' => array_key_exists('phone', $data) ? ($data['phone'] ?: null) : $search->phone,
            'email' => array_key_exists('email', $data) ? ($data['email'] ?: null) : $search->email,
            'source' => $data['source'] ?? $search->source,
            'detail' => $data,
        ])->save();

        return response()->json($search->toAdminArray());
    }

    public function destroy(string $id)
    {
        Search::findOrFail($id)->delete();

        return response()->json(['message' => 'Recherche supprimée.']);
    }
}
