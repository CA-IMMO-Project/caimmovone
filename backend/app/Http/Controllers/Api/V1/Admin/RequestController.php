<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
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
    public function store(Request $request)
    {
        $data = $request->all();
        $kind = $data['kind'] ?? 'interet';

        $siteRequest = SiteRequest::create([
            'ref' => SiteRequest::nextRef($kind),
            'kind' => $kind,
            'land_id' => isset($data['landId']) && is_numeric($data['landId']) ? (int) $data['landId'] : null,
            'client_id' => isset($data['clientId']) && is_numeric($data['clientId']) ? (int) $data['clientId'] : null,
            'full_name' => trim(($data['firstName'] ?? '') . ' ' . ($data['lastName'] ?? '')) ?: ($data['fullName'] ?? 'Sans nom'),
            'phone' => $data['phone'] ?? '',
            'email' => $data['email'] ?? null,
            'message' => $data['extraInfo'] ?? $data['message'] ?? null,
            'detail' => $data,
            'status' => $data['status'] ?? 'Nouvelle',
            'priority' => $data['priority'] ?? 'Normale',
            'source' => $data['source'] ?? 'Backoffice',
        ]);

        return response()->json($siteRequest->toAdminArray(), 201);
    }

    /** Mise à jour : l'objet admin complet remplace le détail, les champs
        structurés suivent (statut, priorité…). */
    public function update(Request $request, string $id)
    {
        $siteRequest = SiteRequest::findOrFail($id);
        $data = $request->all();

        $siteRequest->fill([
            'kind' => $data['kind'] ?? $siteRequest->kind,
            'land_id' => array_key_exists('landId', $data) ? (is_numeric($data['landId']) ? (int) $data['landId'] : null) : $siteRequest->land_id,
            'client_id' => array_key_exists('clientId', $data) ? (is_numeric($data['clientId']) ? (int) $data['clientId'] : null) : $siteRequest->client_id,
            'full_name' => trim(($data['firstName'] ?? '') . ' ' . ($data['lastName'] ?? '')) ?: ($data['fullName'] ?? $siteRequest->full_name),
            'phone' => $data['phone'] ?? $siteRequest->phone,
            'email' => array_key_exists('email', $data) ? ($data['email'] ?: null) : $siteRequest->email,
            'message' => array_key_exists('message', $data) ? $data['message'] : $siteRequest->message,
            'detail' => $data,
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
}
