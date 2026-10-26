<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveRealisationRequest;
use App\Models\Realisation;

class RealisationController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => Realisation::query()->orderByDesc('id')->get()->map(fn (Realisation $r) => $r->toAdminArray()),
        ]);
    }

    public function store(SaveRealisationRequest $request)
    {
        $r = new Realisation;
        $r->fillFromPublic($request->validated())->save();

        return response()->json($r->toAdminArray(), 201);
    }

    public function show(string $id)
    {
        return response()->json(Realisation::findOrFail($id)->toAdminArray());
    }

    public function update(SaveRealisationRequest $request, string $id)
    {
        $r = Realisation::findOrFail($id);
        $r->fillFromPublic($request->validated())->save();

        return response()->json($r->toAdminArray());
    }

    public function destroy(string $id)
    {
        Realisation::findOrFail($id)->delete();

        return response()->json(['message' => 'Réalisation supprimée.']);
    }
}
