<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Support\Phone;
use App\Models\Search;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * POST /api/v1/searches — recherche sur mesure confiée par le site public.
 * Crée la fiche client (rapprochée) + la recherche « REC-… » traitée dans
 * l'écran « Recherches spécifiques » du back office.
 */
class SearchController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->merge(['phone' => Phone::normalize($request->input('phone'))]);
        $data = $request->validate([
            'fullName' => 'required|string|max:150',
            'phone' => 'required|string|max:40',
            'email' => 'nullable|email|max:160',
            'usage' => 'nullable|string|max:80',
            'budgetMax' => 'nullable|numeric|min:0',
            'areaMin' => 'nullable|numeric|min:0',
            'areaMax' => 'nullable|numeric|min:0',
            'mainZone' => 'nullable|string|max:160',
            'otherZones' => 'nullable|string|max:400',
            'targetZone' => 'nullable|string|max:200',
            'lat' => 'nullable|numeric',
            'lng' => 'nullable|numeric',
            'radiusKm' => 'nullable|numeric|min:0',
            'flexible' => 'nullable|string|in:Oui,Non',
            'suggestNearby' => 'nullable|boolean',
            'criteria' => 'nullable|string|max:5000',
        ]);

        if (! Phone::isValid($data['phone'])) {
            return response()->json(['message' => Phone::message(), 'errors' => ['phone' => [Phone::message()]]], 422);
        }

        $client = Client::findOrCreateFromRequest($data);

        $history = [[
            'id' => uniqid(),
            'at' => now()->toIso8601String(),
            'author' => 'Site web',
            'text' => 'Recherche reçue depuis le site web',
        ]];

        $detail = [
            'fullName' => $data['fullName'],
            'phone' => $data['phone'],
            'email' => $data['email'] ?? '',
            'usage' => $data['usage'] ?? 'Habitation',
            'budgetMax' => (int) ($data['budgetMax'] ?? 0),
            'areaMin' => (int) ($data['areaMin'] ?? 0),
            'areaMax' => (int) ($data['areaMax'] ?? 0),
            'mainZone' => $data['mainZone'] ?? '',
            'otherZones' => $data['otherZones'] ?? '',
            'targetZone' => $data['targetZone'] ?? '',
            'lat' => $data['lat'] ?? null,
            'lng' => $data['lng'] ?? null,
            'radiusKm' => (int) ($data['radiusKm'] ?? 5),
            'flexible' => $data['flexible'] ?? 'Oui',
            'suggestNearby' => $data['suggestNearby'] ?? true,
            'criteria' => $data['criteria'] ?? '',
            'proposals' => [],
            'history' => $history,
            'source' => 'Site web',
        ];

        $search = Search::create([
            'ref' => Search::nextRef(),
            'client_id' => $client->id,
            'status' => 'Nouvelle',
            'main_zone' => $data['mainZone'] ?? null,
            'full_name' => $data['fullName'],
            'phone' => $data['phone'],
            'email' => $data['email'] ?? null,
            'source' => 'Site web',
            'detail' => $detail,
        ]);

        return response()->json([
            'ref' => $search->ref,
            'message' => 'Votre recherche a bien été enregistrée. Notre équipe vous propose des parcelles correspondantes.',
        ], 201);
    }
}
