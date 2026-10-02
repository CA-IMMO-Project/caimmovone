<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Models\Land;
use App\Models\Realisation;
use App\Models\SiteRequest;
use Illuminate\Http\JsonResponse;

/** Tableau de bord du back office. */
class StatsController extends Controller
{
    public function index(): JsonResponse
    {
        $byKind = SiteRequest::query()->selectRaw('kind, count(*) as n')->groupBy('kind')->pluck('n', 'kind');

        return response()->json([
            'lands' => ['total' => Land::count(), 'available' => Land::where('status', 'disponible')->count()],
            'realisations' => Realisation::where('published', true)->count(),
            'requests' => [
                'total' => SiteRequest::count(),
                'new' => SiteRequest::where('status', 'Nouvelle')->count(),
                'achat' => (int) ($byKind['interet'] ?? 0),
                'visite' => (int) ($byKind['visite'] ?? 0),
                'recherche' => (int) ($byKind['recherche'] ?? 0),
                'vente' => (int) ($byKind['vente'] ?? 0),
            ],
            'messages' => ['total' => ContactMessage::count(), 'unread' => ContactMessage::where('read', false)->count()],
        ]);
    }
}
