<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveClientRequest;
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

    public function store(SaveClientRequest $request)
    {
        $data = $request->validated();

        $client = Client::create([
            'full_name' => $data['fullName'],
            'phone' => $data['phone'],
            'email' => $data['email'] ?? null,
            'notes' => $data['notes'] ?? $data['message'] ?? null,
            'source' => $data['source'] ?? 'Backoffice',
            'detail' => $this->cleanDetail($data),
        ]);

        return response()->json($client->toAdminArray(), 201);
    }

    public function update(SaveClientRequest $request, string $id)
    {
        $client = Client::findOrFail($id);
        $data = $request->validated();
        // Fusion (pas remplacement) avec le détail déjà en base : un instantané
        // incomplet côté client ne doit pas effacer les champs absents de la requête.
        $client->fill([
            'full_name' => $data['fullName'] ?? $client->full_name,
            'phone' => $data['phone'] ?? $client->phone,
            'email' => array_key_exists('email', $data) ? $data['email'] : $client->email,
            'notes' => array_key_exists('notes', $data)
                ? $data['notes']
                : (array_key_exists('message', $data) ? $data['message'] : $client->notes),
            'source' => $data['source'] ?? $client->source,
            'detail' => array_merge($client->detail ?? [], $this->cleanDetail($data)),
        ])->save();

        return response()->json($client->toAdminArray());
    }

    public function destroy(string $id)
    {
        Client::findOrFail($id)->delete();

        return response()->json(['message' => 'Client supprimé.']);
    }

    private function cleanDetail(array $data): array
    {
        unset($data['id'], $data['createdAt']);
        if (array_key_exists('ref', $data) && empty($data['ref'])) {
            unset($data['ref']);
        }

        return $data;
    }
}
