<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ContactMessage;
use App\Models\Land;
use App\Models\LandFile;
use App\Models\Realisation;
use App\Models\Search;
use App\Models\SiteRequest;
use App\Support\PresentationData;
use Illuminate\Http\JsonResponse;

/**
 * GET /api/v1/admin/bootstrap — charge en un seul appel toutes les collections
 * du back office (shapes admin). Le frontend en hydrate son cache : plus
 * aucune donnée métier ne vit dans le navigateur.
 */
class BootstrapController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'presentationAllowed' => PresentationData::allowed(),
            'lands' => Land::query()->orderByDesc('id')->get()->map(fn (Land $l) => $l->toPublicArray(true))->values()->all(),
            'requests' => SiteRequest::query()->with('land')->orderByDesc('id')->get()->map(fn (SiteRequest $r) => $r->toAdminArray())->values()->all(),
            'clients' => Client::query()->orderByDesc('id')->get()->map(fn (Client $c) => $c->toAdminArray())->values()->all(),
            'searches' => Search::query()->orderByDesc('id')->get()->map(fn (Search $s) => $s->toAdminArray())->values()->all(),
            'landFiles' => LandFile::query()->orderByDesc('id')->get()->map(fn (LandFile $f) => $f->toAdminArray())->values()->all(),
            'realisations' => Realisation::query()->orderByDesc('id')->get()->map(fn (Realisation $r) => $r->toAdminArray())->values()->all(),
            'messages' => ContactMessage::query()->orderByDesc('id')->get()->map(fn (ContactMessage $m) => $m->toAdminArray())->values()->all(),
        ]);
    }
}
