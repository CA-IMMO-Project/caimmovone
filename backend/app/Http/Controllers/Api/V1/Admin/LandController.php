<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Land;
use Illuminate\Http\Request;

class LandController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => Land::query()->orderByDesc('id')->get()->map(fn (Land $l) => $l->toPublicArray()),
        ]);
    }

    public function store(Request $request)
    {
        // Le formulaire d'édition envoie l'objet complet : on valide les
        // colonnes NOT NULL pour renvoyer un 422 clair plutôt qu'une erreur SQL.
        $data = $request->validate([
            'title' => 'required|string',
            'region' => 'required|string',
            'location' => 'required|string',
            'price' => 'required|numeric',
        ]) + $request->all();
        // Upsert : si un id numérique valide est fourni, on met à jour.
        $land = isset($data['id']) && is_numeric($data['id']) ? (Land::find((int) $data['id']) ?? new Land()) : new Land();
        $land->fillFromPublic($data)->save();
        return response()->json($land->toPublicArray(), $land->wasRecentlyCreated ? 201 : 200);
    }

    public function show(string $id)
    {
        return response()->json(Land::findOrFail($id)->toPublicArray());
    }

    public function update(Request $request, string $id)
    {
        $land = Land::findOrFail($id);
        $land->fillFromPublic($request->all())->save();
        return response()->json($land->toPublicArray());
    }

    public function destroy(string $id)
    {
        Land::findOrFail($id)->delete();
        return response()->json(['message' => 'Terrain supprimé.']);
    }

    /** POST /admin/lands/reset — recrée le catalogue de démonstration. */
    public function reset()
    {
        Land::query()->delete();
        $seeder = new \Database\Seeders\LandSeeder();
        $seeder->setContainer(app())->run();
        return response()->json([
            'message' => 'Catalogue réinitialisé.',
            'lands' => Land::query()->orderByDesc('id')->get()->map(fn (Land $l) => $l->toPublicArray()),
        ]);
    }
}
