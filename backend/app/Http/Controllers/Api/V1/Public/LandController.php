<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Models\Land;
use Illuminate\Http\Request;

class LandController extends Controller
{
    /** GET /api/v1/lands — catalogue public (filtrage côté client, comme aujourd'hui). */
    public function index()
    {
        return response()->json([
            'data' => Land::query()
                ->where('publication_status', 'publie')
                ->orderByDesc('featured')
                ->orderByDesc('id')
                ->get()
                ->map(fn (Land $land) => $land->toPublicArray()),
        ]);
    }

    /** GET /api/v1/lands/{id} */
    public function show(string $id)
    {
        $land = Land::query()->where('publication_status', 'publie')->find($id);
        abort_if($land === null, 404, 'Terrain introuvable.');
        return response()->json($land->toPublicArray());
    }
}
