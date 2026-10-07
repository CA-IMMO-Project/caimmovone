<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StoreLandFileRequest;
use App\Models\Client;
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
    public function store(StoreLandFileRequest $request): JsonResponse
    {
        $data = $request->validated();

        // Fiche client (rapprochée par email ou téléphone).
        $client = Client::findOrCreateFromRequest($data);

        $fullName = trim($data['fullName']);
        $parts = preg_split('/\s+/', $fullName);
        $firstName = $parts[0] ?? '';
        $lastName = implode(' ', array_slice($parts, 1));

        $area = (int) ($data['area'] ?? 0);
        $price = (int) ($data['price'] ?? 0);

        // Les envois multipart (avec fichiers) transmettent lat/lng en tant
        // que chaînes : on les force en nombre pour que le back office (qui
        // teste `typeof lat === 'number'` pour centrer la carte et afficher
        // le repère) les reconnaisse — sinon le pin GPS reste invisible bien
        // que la position soit bien enregistrée.
        $lat = isset($data['lat']) && $data['lat'] !== '' ? (float) $data['lat'] : null;
        $lng = isset($data['lng']) && $data['lng'] !== '' ? (float) $data['lng'] : null;

        // Anti-doublon : le même vendeur qui redépose le même terrain (même
        // intitulé, dossier encore ouvert) voit son dossier MIS À JOUR plutôt
        // qu'un second dossier VEN créé.
        $dupe = LandFile::query()
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
                'lat' => $lat ?? ($detail['lat'] ?? null),
                'lng' => $lng ?? ($detail['lng'] ?? null),
                'salePayment' => $data['payment'] ?? ($detail['salePayment'] ?? ''),
                'maxDuration' => $data['paymentDuration'] ?? ($detail['maxDuration'] ?? ''),
                'depositRange' => $data['deposit'] ?? ($detail['depositRange'] ?? ''),
                'summary' => $data['summary'] ?? ($detail['summary'] ?? ''),
            ] as $key => $value) {
                $detail[$key] = $value;
            }

            // Fichiers joints à ce nouvel envoi : ajoutés DIRECTEMENT aux
            // photos / documents / pièce d'identité du dossier (pas dans un
            // tiroir à part) — ils sont donc visibles tout de suite dans les
            // onglets « Photos » et « Documents » du back office.
            $uploaded = $this->storeUploads($request, $dupe->ref, $fullName, $data['docTypes'] ?? []);
            $detail['photos'] = array_values(array_merge($detail['photos'] ?? [], $uploaded['photos']));
            $detail['documents'] = array_values(array_merge($detail['documents'] ?? [], $uploaded['documents']));
            if (($uploaded['idCards'][0] ?? null) !== null) {
                $detail['idDoc'] = array_merge($detail['idDoc'] ?? [], ['file' => $uploaded['idCards'][0]]);
            }
            // Au-delà de la 1ère pièce d'identité, et les vidéos (pas de case
            // dédiée dans la fiche) : conservées dans « Fichiers reçus du site ».
            $site = $detail['siteFiles'] ?? ['videos' => [], 'idCards' => []];
            if (! empty($uploaded['videos'])) {
                $site['videos'] = array_values(array_merge($site['videos'] ?? [], $uploaded['videos']));
            }
            if (count($uploaded['idCards']) > 1) {
                $site['idCards'] = array_values(array_merge($site['idCards'] ?? [], array_slice($uploaded['idCards'], 1)));
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
        $uploaded = $this->storeUploads($request, $ref, $fullName, $data['docTypes'] ?? []);

        $detail = [
            'ownerId' => 'PROP-'.strtoupper(substr(uniqid(), -6)),
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
                // Scan de la pièce d'identité envoyé par le vendeur : visible
                // directement dans la fiche (pas besoin d'aller le chercher
                // dans un tiroir à part).
                'file' => $uploaded['idCards'][0] ?? null,
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
            'lat' => $lat,
            'lng' => $lng,
            'salePayment' => $data['payment'] ?? '',
            'maxDuration' => $data['paymentDuration'] ?? '',
            'depositRange' => $data['deposit'] ?? '',
            // Vidéos et éventuelles pièces d'identité au-delà de la 1ère : pas
            // de case dédiée dans la fiche, elles restent visibles dans
            // « Fichiers reçus du site web ».
            'siteFiles' => [
                'videos' => $uploaded['videos'],
                'idCards' => array_slice($uploaded['idCards'], 1),
            ],
            'summary' => $data['summary'] ?? '',
            'receivedAt' => now()->format('Y-m-d'),
            'priority' => 'Normale',
            'notes' => [],
            'tasks' => [],
            'checklist' => [],
            // Photos et documents envoyés par le vendeur : visibles tout de
            // suite dans les onglets « Photos » / « Documents » du dossier —
            // l'agence n'a plus besoin d'aller les chercher dans un tiroir à
            // part avant de pouvoir les consulter.
            'photos' => $uploaded['photos'],
            'documents' => $uploaded['documents'],
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
     * Stocke les pièces du vendeur hors de la racine publique (lecture
     * exclusivement via la route Sanctum /admin/files/{path}) et renvoie des
     * objets directement exploitables par la fiche du back office (même forme
     * que les fichiers déposés depuis l'admin : id, name, type, size, url).
     */
    private function storeUploads(Request $request, string $ref, string $ownerName, array $docTypes): array
    {
        $out = ['photos' => [], 'videos' => [], 'documents' => [], 'idCards' => []];
        foreach (['photos' => 'photos', 'videos' => 'videos', 'documents' => 'documents', 'idFiles' => 'idCards'] as $field => $key) {
            $i = 0;
            foreach ((array) $request->file($field, []) as $uploadedFile) {
                $ext = strtolower($uploadedFile->extension() ?: pathinfo((string) $uploadedFile->getClientOriginalName(), PATHINFO_EXTENSION) ?: 'bin');
                $storedName = Str::uuid().'-'.$i.'.'.$ext;
                $path = $uploadedFile->storeAs('land-files/'.$ref, $storedName, 'local');
                abort_if($path === false, 500, 'Impossible de stocker une pièce jointe.');

                $entry = [
                    'id' => (string) Str::uuid(),
                    'name' => $uploadedFile->getClientOriginalName() ?: $storedName,
                    'type' => $uploadedFile->getMimeType() ?: $this->guessMime($ext),
                    'size' => (int) $uploadedFile->getSize(),
                    'url' => '/api/v1/admin/files/'.str_replace('%2F', '/', rawurlencode($path)),
                ];

                if ($key === 'documents') {
                    // Catégorie au mieux (le formulaire ne lie pas un type à
                    // un fichier précis) : on fait tourner les types cochés
                    // par le vendeur, sinon « Autre document ». L'agent peut
                    // corriger la catégorie en un clic dans le back office.
                    $entry['category'] = $docTypes !== [] ? $docTypes[$i % count($docTypes)] : 'Autre document';
                    $entry['number'] = '';
                    $entry['issuedAt'] = '';
                    $entry['ownerName'] = $ownerName;
                    $entry['status'] = 'À vérifier';
                }

                $out[$key][] = $entry;
                $i++;
            }
        }

        return $out;
    }

    private function guessMime(string $ext): string
    {
        return match ($ext) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            'gif' => 'image/gif',
            'mp4' => 'video/mp4',
            'mov' => 'video/quicktime',
            'webm' => 'video/webm',
            'avi' => 'video/x-msvideo',
            'pdf' => 'application/pdf',
            default => 'application/octet-stream',
        };
    }
}
