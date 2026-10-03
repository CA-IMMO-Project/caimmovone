<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Support\Phone;
use App\Models\LandFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * POST /api/v1/land-files — dépôt de terrain (« Vendre mon terrain ») depuis
 * le site public. Crée la fiche client (rapprochée) + le dossier « VEN-… »
 * traité dans l'écran « Dossiers de vente » du back office.
 */
class LandFileController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->merge(['phone' => Phone::normalize($request->input('phone'))]);
        $data = $request->validate([
            'fullName' => 'required|string|max:150',
            'phone' => 'required|string|max:40',
            'email' => 'nullable|email|max:160',
            'birthDate' => 'nullable|string|max:40',
            'profession' => 'nullable|string|max:120',
            'country' => 'nullable|string|max:80',
            'bankAccount' => 'nullable|string|max:160',
            'idType' => 'nullable|string|max:40',
            'idNumber' => 'nullable|string|max:80',
            'title' => 'required|string|max:200',
            'area' => 'nullable|numeric|min:0',
            'price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string|max:5000',
            'relief' => 'nullable|string|max:80',
            'access' => 'nullable|string|max:120',
            'water' => 'nullable|string|max:20',
            'electricity' => 'nullable|string|max:20',
            'region' => 'nullable|string|max:80',
            'district' => 'nullable|string|max:80',
            'commune' => 'nullable|string|max:80',
            'fokontany' => 'nullable|string|max:80',
            'directions' => 'nullable|string|max:400',
            'lat' => 'nullable|numeric',
            'lng' => 'nullable|numeric',
            'payment' => 'nullable|string|max:80',
            'paymentDuration' => 'nullable|string|max:80',
            'deposit' => 'nullable|string|max:80',
            'photoNames' => 'nullable|array',
            'videoNames' => 'nullable|array',
            'docNames' => 'nullable|array',
            'docTypes' => 'nullable|array',
            'idFileNames' => 'nullable|array',
            'summary' => 'nullable|string|max:8000',
            // Vrais fichiers envoyés par le site (multipart) — stockés sur le
            // disque « public » puis affichés dans le back office.
            'photos' => 'nullable|array|max:12',
            'photos.*' => 'file|image|max:5120',
            'videos' => 'nullable|array|max:2',
            'videos.*' => 'file|max:102400',
            'documents' => 'nullable|array|max:12',
            'documents.*' => 'file|max:10240',
            'idFiles' => 'nullable|array|max:4',
            'idFiles.*' => 'file|max:10240',
        ]);

        if (! Phone::isValid($data['phone'])) {
            return response()->json(['message' => Phone::message(), 'errors' => ['phone' => [Phone::message()]]], 422);
        }

        // Fiche client (rapprochée par email ou téléphone).
        $client = Client::findOrCreateFromRequest($data);

        $fullName = trim($data['fullName']);
        $parts = preg_split('/\s+/', $fullName);
        $firstName = $parts[0] ?? '';
        $lastName = implode(' ', array_slice($parts, 1));

        $area = (int) ($data['area'] ?? 0);
        $price = (int) ($data['price'] ?? 0);

        // Anti-doublon : le même vendeur qui redépose le même terrain (même
        // intitulé, dossier encore ouvert) voit son dossier MIS À JOUR plutôt
        // qu'un second dossier VEN créé.
        $dupe = \App\Models\LandFile::query()
            ->where('client_id', $client->id)
            ->whereNotIn('status', ['Publié', 'Refusé', 'Retiré', 'Vendu', 'Clôturé'])
            ->where('created_at', '>=', now()->subDays(60))
            ->get()
            ->first(fn ($f) => mb_strtolower(trim((string) ($f->detail['title'] ?? ''))) === mb_strtolower(trim($data['title'])));

        if ($dupe !== null) {
            $detail = $dupe->detail ?? [];
            foreach ([
                'title' => $data['title'],
                'area' => $area,
                'price' => $price,
                'pricePerM2' => $area > 0 ? (int) round($price / $area) : 0,
                'description' => $data['description'] ?? ($detail['description'] ?? ''),
                'relief' => $data['relief'] ?? ($detail['relief'] ?? ''),
                'region' => $data['region'] ?? ($detail['region'] ?? ''),
                'district' => $data['district'] ?? ($detail['district'] ?? ''),
                'commune' => $data['commune'] ?? ($detail['commune'] ?? ''),
                'fokontany' => $data['fokontany'] ?? ($detail['fokontany'] ?? ''),
                'addressHint' => $data['directions'] ?? ($detail['addressHint'] ?? ''),
                'lat' => $data['lat'] ?? ($detail['lat'] ?? null),
                'lng' => $data['lng'] ?? ($detail['lng'] ?? null),
                'salePayment' => $data['payment'] ?? ($detail['salePayment'] ?? ''),
                'maxDuration' => $data['paymentDuration'] ?? ($detail['maxDuration'] ?? ''),
                'depositRange' => $data['deposit'] ?? ($detail['depositRange'] ?? ''),
                'summary' => $data['summary'] ?? ($detail['summary'] ?? ''),
            ] as $key => $value) {
                $detail[$key] = $value;
            }
            // Fichiers joints à ce nouvel envoi : ajoutés au dossier existant.
            $uploaded = $this->storeUploads($request, $dupe->ref);
            $site = $detail['siteFiles'] ?? ['photos' => [], 'videos' => [], 'documents' => [], 'docTypes' => [], 'idCards' => []];
            foreach (['photos', 'videos', 'documents', 'idCards'] as $key) {
                if (! empty($uploaded[$key])) {
                    $site[$key] = array_values(array_unique(array_merge($site[$key] ?? [], $uploaded[$key])));
                }
            }
            if (! empty($data['docTypes'])) {
                $site['docTypes'] = array_values(array_unique(array_merge($site['docTypes'] ?? [], $data['docTypes'])));
            }
            $detail['siteFiles'] = $site;

            $detail['history'] = array_merge($detail['history'] ?? [], [[
                'id' => uniqid(),
                'at' => now()->toIso8601String(),
                'author' => 'Site web',
                'text' => 'Dossier renvoyé depuis le site web — informations mises à jour',
            ]]);

            $dupe->update(['detail' => $detail, 'phone' => $data['phone']]);

            return response()->json([
                'ref' => $dupe->ref,
                'updated' => true,
                'message' => "Vous aviez déjà déposé ce terrain ({$dupe->ref}) : votre dossier a été mis à jour avec vos nouvelles informations.",
            ], 200);
        }

        $history = [[
            'id' => uniqid(),
            'at' => now()->toIso8601String(),
            'author' => 'Site web',
            'text' => 'Dossier reçu depuis le site web',
        ]];

        // Référence connue d'avance pour ranger les fichiers du vendeur,
        // envoyés en multipart par le formulaire « Vendre » du site.
        $ref = LandFile::nextRef();
        $uploaded = $this->storeUploads($request, $ref);

        // Détail au format de l'écran « Dossiers de vente » (crm/LandFile) :
        // ce que le formulaire public ne demande pas reçoit une valeur vide,
        // l'agence le complètera dans le back office.
        $detail = [
            'ownerId' => 'PROP-' . strtoupper(substr(uniqid(), -6)),
            'owner' => [
                'firstName' => $firstName,
                'lastName' => $lastName,
                'dialCode' => '+261',
                'phone' => $data['phone'],
                'email' => $data['email'] ?? '',
                'birthDate' => $data['birthDate'] ?? '',
                'profession' => $data['profession'] ?? '',
                'country' => $data['country'] ?? 'Madagascar',
                'countryOther' => '',
                'address' => '',
                'idNumber' => $data['idNumber'] ?? '',
                'accountNumber' => $data['bankAccount'] ?? '',
            ],
            'idDoc' => [
                'type' => $data['idType'] ?? 'CIN',
                'number' => $data['idNumber'] ?? '',
                'issuedAt' => '',
                'expiresAt' => '',
                'authority' => '',
            ],
            'title' => $data['title'],
            'category' => 'Terrain nu',
            'area' => $area,
            'price' => $price,
            'pricePerM2' => $area > 0 ? (int) round($price / $area) : 0,
            'pricePerM2Manual' => false,
            'negotiable' => 'Non',
            'description' => $data['description'] ?? '',
            'relief' => $data['relief'] ?? '',
            'accesses' => ! empty($data['access']) ? [$data['access']] : [],
            'water' => $data['water'] ?? '',
            'electricity' => $data['electricity'] ?? '',
            'region' => $data['region'] ?? '',
            'district' => $data['district'] ?? '',
            'commune' => $data['commune'] ?? '',
            'fokontany' => $data['fokontany'] ?? '',
            'addressHint' => $data['directions'] ?? '',
            'lat' => $data['lat'] ?? null,
            'lng' => $data['lng'] ?? null,
            'salePayment' => $data['payment'] ?? '',
            'maxDuration' => $data['paymentDuration'] ?? '',
            'depositRange' => $data['deposit'] ?? '',
            // Fichiers annoncés par le vendeur (noms) — les vrais fichiers
            // sont récupérés par l'agence puis déposés via le back office.
            'siteFiles' => [
                'photos' => $uploaded['photos'] !== [] ? $uploaded['photos'] : array_values($data['photoNames'] ?? []),
                'videos' => $uploaded['videos'] !== [] ? $uploaded['videos'] : array_values($data['videoNames'] ?? []),
                'documents' => $uploaded['documents'] !== [] ? $uploaded['documents'] : array_values($data['docNames'] ?? []),
                'docTypes' => array_values($data['docTypes'] ?? []),
                'idCards' => $uploaded['idCards'] !== [] ? $uploaded['idCards'] : array_values($data['idFileNames'] ?? []),
            ],
            'summary' => $data['summary'] ?? '',
            'receivedAt' => now()->format('Y-m-d'),
            'priority' => 'Normale',
            'notes' => [],
            'tasks' => [],
            'checklist' => [],
            'photos' => [],
            'documents' => [],
            'actions' => [],
            'history' => $history,
            'source' => 'Site web',
        ];

        $file = LandFile::create([
            'ref' => $ref,
            'client_id' => $client->id,
            'status' => "À l'étude",
            'full_name' => $fullName,
            'phone' => $data['phone'],
            'detail' => $detail,
        ]);

        return response()->json([
            'ref' => $file->ref,
            'message' => 'Votre dossier a bien été enregistré. Notre équipe vérifie les informations et vous recontacte.',
        ], 201);
    }

    /**
     * Stocke les fichiers reçus en multipart (storage/app/public/land-files/REF)
     * et retourne leurs URLs publiques « /storage/… ».
     * Pré-requis une seule fois sur le serveur : php artisan storage:link
     */
    private function storeUploads(Request $request, string $ref): array
    {
        $urls = ['photos' => [], 'videos' => [], 'documents' => [], 'idCards' => []];
        foreach (['photos' => 'photos', 'videos' => 'videos', 'documents' => 'documents', 'idFiles' => 'idCards'] as $field => $key) {
            foreach ((array) $request->file($field, []) as $i => $file) {
                $base = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)) ?: 'fichier';
                $ext = strtolower($file->getClientOriginalExtension() ?: 'bin');
                $name = now()->format('ymdHis') . $i . '-' . $base . '.' . $ext;
                $urls[$key][] = '/storage/' . $file->storeAs('land-files/' . $ref, $name, 'public');
            }
        }
        return $urls;
    }
}
