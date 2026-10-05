<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StoreSearchRequest;
use App\Models\Client;
use App\Models\Search;
use Illuminate\Http\JsonResponse;

/**
 * POST /api/v1/searches — recherche sur mesure confiée par le site public.
 * Crée la fiche client (rapprochée) + la recherche « REC-… » traitée dans
 * l'écran « Recherches spécifiques » du back office.
 */
class SearchController extends Controller
{
    public function store(StoreSearchRequest $request): JsonResponse
    {
        $data = $request->validated();

        $client = Client::findOrCreateFromRequest($data);

        // Anti-doublon : si ce client a déjà une recherche active (non trouvée,
        // non clôturée), on la MET À JOUR avec les nouveaux critères plutôt que
        // d'ouvrir une seconde fiche REC pour la même personne.
        $active = Search::query()
            ->where('client_id', $client->id)
            ->whereNotIn('status', ['Trouvé', 'Clôturée'])
            ->latest()
            ->first();

        if ($active !== null) {
            $detail = $active->detail ?? [];
            // Les nouveaux critères remplacent les anciens…
            foreach ([
                'fullName' => $data['fullName'],
                'phone' => $data['phone'],
                'email' => $data['email'] ?? ($detail['email'] ?? ''),
                'usage' => $data['usage'] ?? ($detail['usage'] ?? 'Habitation'),
                'budgetMax' => (int) ($data['budgetMax'] ?? ($detail['budgetMax'] ?? 0)),
                'areaMin' => (int) ($data['areaMin'] ?? ($detail['areaMin'] ?? 0)),
                'areaMax' => (int) ($data['areaMax'] ?? ($detail['areaMax'] ?? 0)),
                'mainZone' => $data['mainZone'] ?? ($detail['mainZone'] ?? ''),
                'otherZones' => $data['otherZones'] ?? ($detail['otherZones'] ?? ''),
                'targetZone' => $data['targetZone'] ?? ($detail['targetZone'] ?? ''),
                'lat' => $data['lat'] ?? ($detail['lat'] ?? null),
                'lng' => $data['lng'] ?? ($detail['lng'] ?? null),
                'radiusKm' => (int) ($data['radiusKm'] ?? ($detail['radiusKm'] ?? 5)),
                'flexible' => $data['flexible'] ?? ($detail['flexible'] ?? 'Oui'),
                'suggestNearby' => $data['suggestNearby'] ?? ($detail['suggestNearby'] ?? true),
                'criteria' => $data['criteria'] ?? ($detail['criteria'] ?? ''),
            ] as $key => $value) {
                $detail[$key] = $value;
            }
            // …mais l'historique et les terrains déjà proposés sont conservés.
            $detail['history'] = array_merge($detail['history'] ?? [], [[
                'id' => uniqid(),
                'at' => now()->toIso8601String(),
                'author' => 'Site web',
                'text' => 'Recherche renvoyée depuis le site web — critères mis à jour',
            ]]);

            $active->update([
                'main_zone' => $data['mainZone'] ?? $active->main_zone,
                'full_name' => $data['fullName'],
                'phone' => $data['phone'],
                'email' => $data['email'] ?? $active->email,
                'detail' => $detail,
            ]);

            return response()->json([
                'ref' => $active->ref,
                'updated' => true,
                'message' => "Vous aviez déjà une recherche en cours ({$active->ref}) : nous l'avons mise à jour avec vos nouveaux critères. Notre équipe vous propose des parcelles correspondantes.",
            ], 200);
        }

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
