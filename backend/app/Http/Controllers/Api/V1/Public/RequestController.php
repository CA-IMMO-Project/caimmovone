<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Land;
use App\Support\Phone;
use App\Models\SiteRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * POST /api/v1/requests — point d'entrée unique des demandes du site public :
 * achat (« je suis intéressé »), visite, recherche sur mesure, dépôt de terrain.
 */
class RequestController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        // Téléphone : format contrôlé + normalisé (rapprochement client fiable).
        $request->merge(['phone' => Phone::normalize($request->input('phone'))]);
        $data = $request->validate([
            'kind' => 'required|in:interet,visite,recherche,vente',
            'fullName' => 'required|string|max:150',
            'phone' => 'required|string|max:40',
            'email' => 'nullable|email|max:160',
            'message' => 'nullable|string|max:5000',
            'landId' => 'nullable|string|max:64',
            'budget' => 'nullable|string|max:120',
            'profession' => 'nullable|string|max:120',
            'bankAccount' => 'nullable|string|max:160',
            'age' => 'nullable|integer|min:1|max:120',
            'nationality' => 'nullable|string|max:80',
            'projectName' => 'nullable|string|max:200',
            'paymentMode' => 'nullable|string|max:80',
            'duration' => 'nullable|string|max:80',
            'downPaymentAmount' => 'nullable|string|max:80',
            'visitDate' => 'nullable|string|max:40',
            'visitTime' => 'nullable|string|max:40',
            'birthDate' => 'nullable|string|max:40',
            'callTime' => 'nullable|string|max:80',
        ]);

        if (! Phone::isValid($data['phone'])) {
            return response()->json(['message' => Phone::message(), 'errors' => ['phone' => [Phone::message()]]], 422);
        }

        // Le terrain concerné (si la demande porte sur une fiche) doit exister.
        $land = null;
        if (! empty($data['landId'])) {
            $land = Land::find($data['landId']);
            abort_if($land === null, 422, 'Terrain introuvable.');
        }

        // Fiche client (rapprochée par email ou téléphone).
        $client = Client::findOrCreateFromRequest($data);

        // Anti-doublon : un même client qui renvoie la même demande sur le
        // même terrain (achat ou visite) retrouve sa demande existante plutôt
        // qu'une seconde fiche. Fenêtre de 30 jours — au-delà, on considère
        // qu'il s'agit d'un nouveau besoin.
        if ($land !== null && in_array($data['kind'], ['interet', 'visite'], true)) {
            $dupe = SiteRequest::query()
                ->where('client_id', $client->id)
                ->where('kind', $data['kind'])
                ->where('land_id', $land->id)
                // Une demande déjà traitée/annulée ne bloque pas un nouveau besoin.
                ->whereNotIn('status', ['Annulée', 'Refusée', 'Effectuée', 'Terminée', 'Traitée', 'Clôturée', 'Vendu'])
                ->where('created_at', '>=', now()->subDays(30))
                ->latest()
                ->first();

            if ($dupe !== null) {
                // MISE À JOUR de la fiche existante : nouvelles infos fusionnées,
                // trace du renvoi — pas de seconde fiche pour la même personne.
                $meta = $dupe->meta ?? [];
                foreach (['budget', 'profession', 'bankAccount', 'nationality', 'projectName',
                    'paymentMode', 'duration', 'downPaymentAmount', 'visitDate', 'visitTime', 'birthDate', 'callTime'] as $key) {
                    if (! empty($data[$key])) {
                        $meta[$key] = (string) $data[$key];
                    }
                }
                if (! empty($data['age'])) {
                    $meta['age'] = $data['age'];
                }
                // Budget approximatif du site -> colonne Budget du back office.
                if (! empty($data['budget'])) {
                    $approx = (int) preg_replace('/\D+/', '', (string) $data['budget']);
                    if ($approx > 0) {
                        $meta['budgetMax'] = $approx;
                    }
                }
                $meta['landTitle'] = $land->title;
                $meta['resendCount'] = (int) ($meta['resendCount'] ?? 0) + 1;
                $meta['lastResentAt'] = now()->toIso8601String();

                $message = trim((string) $dupe->message);
                $newText = trim((string) ($data['message'] ?? ''));
                if ($newText !== '' && ! str_contains($message, $newText)) {
                    $message .= ($message !== '' ? "\n\n" : '') . '— Nouvel envoi du ' . now()->format('d/m/Y H:i') . " —\n" . $newText;
                }

                $dupe->update([
                    'message' => $message !== '' ? $message : $dupe->message,
                    'meta' => $meta,
                    'priority' => 'Haute',
                ]);

                $label = $data['kind'] === 'visite' ? 'de visite' : "d'achat";

                return response()->json([
                    'ref' => $dupe->ref,
                    'updated' => true,
                    'message' => "Vous aviez déjà une demande {$label} sur ce terrain : nous l'avons mise à jour ({$dupe->ref}) avec vos nouvelles informations. Notre équipe vous recontacte très vite.",
                ], 200);
            }
        }

        // Champs complémentaires rangés dans meta (tout ce qui n'a pas de colonne).
        $meta = [];
        foreach (['budget', 'profession', 'bankAccount', 'nationality', 'projectName',
                     'paymentMode', 'duration', 'downPaymentAmount', 'visitDate', 'visitTime', 'birthDate', 'callTime'] as $key) {
            if (! empty($data[$key])) {
                $meta[$key] = (string) $data[$key];
            }
        }
        if (! empty($data['age'])) {
            $meta['age'] = $data['age'];
        }
        // Budget approximatif du site -> colonne Budget du back office.
        if (! empty($data['budget'])) {
            $approx = (int) preg_replace('/\D+/', '', (string) $data['budget']);
            if ($approx > 0) {
                $meta['budgetMax'] = $approx;
            }
        }
        if ($land) {
            $meta['landTitle'] = $land->title;
        }

        $siteRequest = SiteRequest::create([
            'ref' => SiteRequest::nextRef($data['kind']),
            'kind' => $data['kind'],
            'land_id' => $land?->id,
            'client_id' => $client->id,
            'full_name' => $data['fullName'],
            'phone' => $data['phone'],
            'email' => $data['email'] ?? null,
            'message' => $data['message'] ?? null,
            'meta' => $meta,
            // Une visite a son propre cycle de vie, distinct des achats.
            'status' => $data['kind'] === 'visite' ? 'Demandée' : 'Nouvelle',
            'priority' => 'Haute',
            'source' => 'Site web',
        ]);

        return response()->json([
            'ref' => $siteRequest->ref,
            'message' => 'Votre demande a bien été enregistrée. Notre équipe vous recontacte très vite.',
        ], 201);
    }
}
