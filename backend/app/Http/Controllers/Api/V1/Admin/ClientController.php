<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Search;
use App\Models\SiteRequest;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $query = Client::query()->orderByDesc('id');
        if ($request->filled('q')) {
            $q = strtolower($request->string('q')->toString());
            $query->where(fn ($w) => $w
                ->whereRaw('lower(full_name) like ?', ["%{$q}%"])
                ->orWhereRaw('lower(phone) like ?', ["%{$q}%"])
                ->orWhereRaw('lower(email) like ?', ["%{$q}%"]));
        }

        return response()->json([
            'data' => $query->get()->map(fn (Client $c) => $c->toAdminArray()),
        ]);
    }

    /** Fiche 360° : le client + toutes ses demandes + ses recherches. */
    public function show(string $id)
    {
        $c = Client::findOrFail($id);

        return response()->json([
            ...$c->toAdminArray(),
            'requests' => SiteRequest::where('client_id', $c->id)->orderByDesc('id')->get()->map(fn ($r) => $r->toAdminArray()),
            'searches' => Search::where('client_id', $c->id)->orderByDesc('id')->get()->map(fn ($s) => $s->toAdminArray()),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $client = Client::create([
            'full_name' => $data['fullName'] ?? trim(($data['firstName'] ?? '').' '.($data['lastName'] ?? '')) ?: 'Sans nom',
            'phone' => $data['phone'] ?? '',
            'email' => $data['email'] ?? null,
            'source' => $data['source'] ?? 'Backoffice',
            'detail' => $data,
        ]);

        return response()->json($client->toAdminArray(), 201);
    }

    public function update(Request $request, string $id)
    {
        $client = Client::findOrFail($id);
        $data = $request->all();
        // Fusion (pas remplacement) avec le détail déjà en base : un instantané
        // incomplet côté client ne doit pas effacer les champs absents de la requête.
        $client->fill([
            'full_name' => $data['fullName'] ?? trim(($data['firstName'] ?? '').' '.($data['lastName'] ?? '')) ?: $client->full_name,
            'phone' => $data['phone'] ?? $client->phone,
            'email' => array_key_exists('email', $data) ? ($data['email'] ?: null) : $client->email,
            'source' => $data['source'] ?? $client->source,
            'detail' => array_merge($client->detail ?? [], $data),
        ])->save();

        return response()->json($client->toAdminArray());
    }

    public function destroy(string $id)
    {
        Client::findOrFail($id)->delete();

        return response()->json(['message' => 'Client supprimé.']);
    }
}
