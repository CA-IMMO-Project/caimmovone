<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Land;
use App\Models\SiteRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * POST /api/v1/requests — point d'entrée unique des demandes du site public :
 * achat (« je suis intéressé »), visite, recherche sur mesure, dépôt de terrain.
 */
class RequestController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'kind' => 'required|in:interet,visite,recherche,vente',
            'fullName' => 'required|string|max:150',
            'phone' => 'required|string|max:40',
            'email' => 'nullable|email|max:160',
            'message' => 'nullable|string|max:5000',
            'landId' => 'nullable|string|max:64',
            'budget' => 'nullable|string|max:120',
            'profession' => 'nullable|string|max:120',
            'bankAccount' => 'nullable|string|max:160',
            'age' => 'nullable|integer|min:1|max:120',
            'nationality' => 'nullable|string|max:80',
            'projectName' => 'nullable|string|max:200',
            'paymentMode' => 'nullable|string|max:80',
            'duration' => 'nullable|string|max:80',
            'downPaymentAmount' => 'nullable|string|max:80',
            'visitDate' => 'nullable|string|max:40',
            'visitTime' => 'nullable|string|max:40',
        ]);

        // Le terrain concerné (si la demande porte sur une fiche) doit exister.
        $land = null;
        if (! empty($data['landId'])) {
            $land = Land::find($data['landId']);
            abort_if($land === null, 422, 'Terrain introuvable.');
        }

        // Fiche client (rapprochée par email ou téléphone).
        $client = Client::findOrCreateFromRequest($data);

        // Champs complémentaires rangés dans meta (tout ce qui n'a pas de colonne).
        $meta = [];
        foreach (['budget', 'profession', 'bankAccount', 'nationality', 'projectName',
                     'paymentMode', 'duration', 'downPaymentAmount', 'visitDate', 'visitTime'] as $key) {
            if (! empty($data[$key])) {
                $meta[$key] = (string) $data[$key];
            }
        }
        if (! empty($data['age'])) {
            $meta['age'] = $data['age'];
        }
        if ($land) {
            $meta['landTitle'] = $land->title;
        }

        $siteRequest = SiteRequest::create([
            'ref' => SiteRequest::nextRef($data['kind']),
            'kind' => $data['kind'],
            'land_id' => $land?->id,
            'client_id' => $client->id,
            'full_name' => $data['fullName'],
            'phone' => $data['phone'],
            'email' => $data['email'] ?? null,
            'message' => $data['message'] ?? null,
            'meta' => $meta,
            'status' => 'Nouvelle',
            'priority' => 'Haute',
            'source' => 'Site web',
        ]);

        return response()->json([
            'ref' => $siteRequest->ref,
            'message' => 'Votre demande a bien été enregistrée. Notre équipe vous recontacte très vite.',
        ], 201);
    }
}
