<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Models\Realisation;

class RealisationController extends Controller
{
    /** GET /api/v1/realisations — uniquement les réalisations publiées. */
    public function index()
    {
        return response()->json([
            'data' => Realisation::query()
                ->where('published', true)
                ->orderByDesc('featured')
                ->orderByDesc('completed_at')
                ->get()
                ->map(fn (Realisation $r) => $r->toPublicArray()),
        ]);
    }
}
