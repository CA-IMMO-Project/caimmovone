<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Realisation;
use Illuminate\Http\Request;

class RealisationController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => Realisation::query()->orderByDesc('id')->get()->map(fn (Realisation $r) => $r->toAdminArray()),
        ]);
    }

    public function store(Request $request)
    {
        $r = new Realisation();
        $r->fillFromPublic($request->all())->save();
        return response()->json($r->toAdminArray(), 201);
    }

    public function show(string $id)
    {
        return response()->json(Realisation::findOrFail($id)->toAdminArray());
    }

    public function update(Request $request, string $id)
    {
        $r = Realisation::findOrFail($id);
        $r->fillFromPublic($request->all())->save();
        return response()->json($r->toAdminArray());
    }

    public function destroy(string $id)
    {
        Realisation::findOrFail($id)->delete();
        return response()->json(['message' => 'Réalisation supprimée.']);
    }
}
