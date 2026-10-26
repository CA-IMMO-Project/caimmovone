<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveSiteRequest;
use App\Models\SiteRequest;
use Illuminate\Http\Request;

/** Demandes reçues du site public + demandes créées dans le back office. */
class RequestController extends Controller
{
    public function index(Request $request)
    {
        $query = SiteRequest::with('land')->orderByDesc('id');
        if ($request->filled('kind')) {
            $query->where('kind', $request->kind);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json([
            'data' => $query->get()->map(fn (SiteRequest $r) => $r->toAdminArray()),
        ]);
    }

    public function show(string $id)
    {
        return response()->json(SiteRequest::with('land')->findOrFail($id)->toAdminArray());
    }

    /** Création (back office) — l'objet admin complet est stocké, les champs
        structurés sont synchronisés pour les filtres. */
    public function store(SaveSiteRequest $request)
    {
        $data = $request->validated();
        $kind = $data['kind'] ?? 'interet';
        $defaultStatus = $kind === 'visite' ? 'Demandée' : 'Nouvelle';

        $siteRequest = SiteRequest::create([
            'ref' => SiteRequest::nextRef($kind),
            'kind' => $kind,
            'land_id' => isset($data['landId']) ? (int) $data['landId'] : null,
            'lot_id' => $data['lotId'] ?? null,
            'client_id' => isset($data['clientId']) ? (int) $data['clientId'] : null,
            'full_name' => $data['fullName'],
            'phone' => $data['phone'],
            'email' => $data['email'] ?? null,
            'message' => $data['extraInfo'] ?? $data['message'] ?? null,
            'detail' => $this->cleanDetail($data),
            'status' => $data['status'] ?? $defaultStatus,
            'priority' => $data['priority'] ?? 'Normale',
            'source' => $data['source'] ?? 'Backoffice',
        ]);

        return response()->json($siteRequest->toAdminArray(), 201);
    }

    /** Mise à jour : fusion (pas remplacement) avec le détail déjà en base —
        un instantané incomplet côté client ne doit pas effacer les champs
        absents de la requête ; les champs structurés suivent (statut, priorité…). */
    public function update(SaveSiteRequest $request, string $id)
    {
        $siteRequest = SiteRequest::findOrFail($id);
        $data = $request->validated();

        $siteRequest->fill([
            'kind' => $data['kind'] ?? $siteRequest->kind,
            'land_id' => array_key_exists('landId', $data) ? ($data['landId'] !== null ? (int) $data['landId'] : null) : $siteRequest->land_id,
            'lot_id' => array_key_exists('lotId', $data) ? $data['lotId'] : $siteRequest->lot_id,
            'client_id' => array_key_exists('clientId', $data) ? ($data['clientId'] !== null ? (int) $data['clientId'] : null) : $siteRequest->client_id,
            'full_name' => $data['fullName'] ?? $siteRequest->full_name,
            'phone' => $data['phone'] ?? $siteRequest->phone,
            'email' => array_key_exists('email', $data) ? $data['email'] : $siteRequest->email,
            'message' => array_key_exists('message', $data) ? $data['message'] : $siteRequest->message,
            'detail' => array_merge($siteRequest->detail ?? [], $this->cleanDetail($data)),
            'status' => $data['status'] ?? $siteRequest->status,
            'priority' => $data['priority'] ?? $siteRequest->priority,
            'source' => $data['source'] ?? $siteRequest->source,
        ])->save();

        return response()->json($siteRequest->toAdminArray());
    }

    public function destroy(string $id)
    {
        SiteRequest::findOrFail($id)->delete();

        return response()->json(['message' => 'Demande supprimée.']);
    }

    private function cleanDetail(array $data): array
    {
        unset($data['id'], $data['ref'], $data['createdAt'], $data['updatedAt']);

        return $data;
    }
}
