<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StoreLandFileRequest;
use App\Models\Client;
use App\Models\LandFile;
use App\Support\DossierVocabulary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * POST /api/v1/land-files — dépôt de terrain (« Vendre mon terrain ») depuis
 * le site public. Crée la fiche client (rapprochée) + le dossier « VEN-… »
 * traité dans l'écran « Demandes de vente » du back office.
 */
class LandFileController extends Controller
{
    public function store(StoreLandFileRequest $request): JsonResponse
    {
        $data = $request->validated();

        // Fiche client (rapprochée par email ou téléphone).
        $client = Client::findOrCreateFromRequest($data);

        $fullName = trim($data['fullName']);
        $explicitFirst = trim((string) ($data['firstName'] ?? ''));
        $explicitLast = trim((string) ($data['lastName'] ?? ''));
        if ($explicitFirst !== '' || $explicitLast !== '') {
            $firstName = $explicitFirst;
            $lastName = $explicitLast;
        } else {
            $parts = preg_split('/\s+/', $fullName);
            $firstName = $parts[0] ?? '';
            $lastName = implode(' ', array_slice($parts, 1));
        }

        $area = (int) ($data['area'] ?? 0);
        $price = (int) ($data['price'] ?? 0);

        // Les envois multipart (avec fichiers) transmettent lat/lng en tant
        // que chaînes : on les force en nombre pour le back office.
        $lat = isset($data['lat']) && $data['lat'] !== '' ? (float) $data['lat'] : null;
        $lng = isset($data['lng']) && $data['lng'] !== '' ? (float) $data['lng'] : null;

        $relief = DossierVocabulary::relief($data['relief'] ?? '');
        $salePayment = DossierVocabulary::salePayment($data['payment'] ?? '');
        $maxDuration = DossierVocabulary::maxDuration($data['paymentDuration'] ?? '');

        // Anti-doublon : le même vendeur qui redépose le même terrain (même
        // intitulé, dossier encore ouvert) voit son dossier MIS À JOUR plutôt
        // qu'un second dossier VEN créé.
        $dupe = LandFile::query()
            ->where('client_id', $client->id)
            ->whereNotIn('status', ['Publié', 'Rejeté', 'Archivé', 'Vendu', 'Refusé', 'Retiré', 'Clôturé'])
            ->where('created_at', '>=', now()->subDays(60))
            ->get()
            ->first(fn ($f) => mb_strtolower(trim((string) ($f->detail['title'] ?? ''))) === mb_strtolower(trim($data['title'])));

        if ($dupe !== null) {
            $detail = $dupe->detail ?? [];
            $owner = array_merge($detail['owner'] ?? [], [
                'firstName' => $firstName ?: ($detail['owner']['firstName'] ?? ''),
                'lastName' => $lastName ?: ($detail['owner']['lastName'] ?? ''),
                'phone' => $data['phone'],
                'email' => $data['email'] ?? ($detail['owner']['email'] ?? ''),
            ]);

            foreach ([
                'owner' => $owner,
                'title' => $data['title'],
                'area' => $area,
                'price' => $price,
                'pricePerM2' => $area > 0 ? (int) round($price / $area) : 0,
                'description' => $data['description'] ?? ($detail['description'] ?? ''),
                'relief' => $relief !== '' ? $relief : ($detail['relief'] ?? ''),
                'accesses' => ! empty($data['access']) ? [$data['access']] : ($detail['accesses'] ?? []),
                'water' => $data['water'] ?? ($detail['water'] ?? ''),
                'electricity' => $data['electricity'] ?? ($detail['electricity'] ?? ''),
                'region' => $data['region'] ?? ($detail['region'] ?? ''),
                'regionOther' => $data['regionOther'] ?? ($detail['regionOther'] ?? ''),
                'district' => $data['district'] ?? ($detail['district'] ?? ''),
                'commune' => $data['commune'] ?? ($detail['commune'] ?? ''),
                'fokontany' => $data['fokontany'] ?? ($detail['fokontany'] ?? ''),
                'addressHint' => $data['directions'] ?? ($detail['addressHint'] ?? ''),
                'lat' => $lat ?? ($detail['lat'] ?? null),
                'lng' => $lng ?? ($detail['lng'] ?? null),
                'salePayment' => $salePayment !== '' ? $salePayment : ($detail['salePayment'] ?? ''),
                'maxDuration' => $maxDuration !== '' ? $maxDuration : ($detail['maxDuration'] ?? ''),
                'depositRange' => $data['deposit'] ?? ($detail['depositRange'] ?? ''),
                'ownerStatus' => $data['ownerStatus'] ?? ($detail['ownerStatus'] ?? ''),
                'estimateRequested' => $data['estimateRequested'] ?? '',
                'noPhoto' => (bool) ($data['noPhoto'] ?? ($detail['noPhoto'] ?? false)),
                'whatsapp' => $data['whatsapp'] ?? ($detail['whatsapp'] ?? ''),
                'summary' => $data['summary'] ?? ($detail['summary'] ?? ''),
                // Renvoi d'un dossier : la déclaration la plus récente fait foi.
                'docTypes' => array_values((array) ($data['docTypes'] ?? ($detail['docTypes'] ?? []))),
            ] as $key => $value) {
                $detail[$key] = $value;
            }

            $uploaded = $this->storeUploads($request, $dupe->ref, $fullName, $data['docTypes'] ?? []);
            $detail['photos'] = array_values(array_merge($detail['photos'] ?? [], $uploaded['photos']));
            $detail['documents'] = array_values(array_merge($detail['documents'] ?? [], $uploaded['documents']));

            $idDoc = array_merge($detail['idDoc'] ?? [], [
                'type' => $data['idType'] ?? ($detail['idDoc']['type'] ?? 'CIN'),
            ]);
            if (($uploaded['idCards'][0] ?? null) !== null) {
                $idDoc['file'] = $uploaded['idCards'][0];
                // Si le nouvel envoi est un passeport ou un fichier unique, on réinitialise le verso obsolète.
                $idDoc['verso'] = $uploaded['idCards'][1] ?? null;
            }
            $detail['idDoc'] = $idDoc;

            if (($uploaded['videos'][0] ?? null) !== null) {
                if (empty($detail['video'])) {
                    $detail['video'] = $uploaded['videos'][0];
                    $extraVideos = array_slice($uploaded['videos'], 1);
                } else {
                    $extraVideos = $uploaded['videos'];
                }
            } else {
                $extraVideos = [];
            }

            $site = $detail['siteFiles'] ?? ['videos' => [], 'idCards' => []];
            if ($extraVideos !== []) {
                $site['videos'] = array_values(array_merge($site['videos'] ?? [], $extraVideos));
            }
            $site['idCards'] = [];
            $detail['siteFiles'] = $site;

            $detail['history'] = array_merge($detail['history'] ?? [], [[
                'id' => uniqid(),
                'at' => now()->toIso8601String(),
                'author' => 'Site web',
                'text' => 'Dossier renvoyé depuis le site web — informations mises à jour',
            ]]);

            $dupe->update([
                'full_name' => $fullName,
                'phone' => $data['phone'],
                'detail' => $detail,
            ]);

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

        // Référence connue d'avance pour ranger les fichiers du vendeur.
        $ref = LandFile::nextRef();
        $uploaded = $this->storeUploads($request, $ref, $fullName, $data['docTypes'] ?? []);

        $detail = [
            'ownerId' => 'PROP-'.strtoupper(substr(uniqid(), -6)),
            'owner' => [
                'firstName' => $firstName,
                'lastName' => $lastName,
                'dialCode' => '',
                'phone' => $data['phone'],
                'email' => $data['email'] ?? '',
                'birthDate' => $data['birthDate'] ?? '',
                'profession' => $data['profession'] ?? '',
                'country' => $data['country'] ?? 'Madagascar',
                'countryOther' => '',
                'address' => '',
                'hasBankAccount' => '',
                'bank' => '',
                'idNumber' => $data['idNumber'] ?? '',
                'accountNumber' => $data['bankAccount'] ?? '',
            ],
            'idDoc' => [
                'type' => $data['idType'] ?? 'CIN',
                'number' => $data['idNumber'] ?? '',
                'issuedAt' => '',
                'expiresAt' => '',
                'authority' => '',
                // Recto (ou pièce unique pour Passeport / PDF complet) et Verso
                // rattachés directement à `idDoc`, visibles dans l'onglet
                // Documents et dans l'éditeur sans tiroir séparé.
                'file' => $uploaded['idCards'][0] ?? null,
                'verso' => $uploaded['idCards'][1] ?? null,
            ],
            'title' => $data['title'],
            'category' => 'Terrain nu',
            'area' => $area,
            'price' => $price,
            'pricePerM2' => $area > 0 ? (int) round($price / $area) : 0,
            'pricePerM2Manual' => false,
            'negotiable' => 'Non',
            'description' => $data['description'] ?? '',
            'relief' => $relief,
            'accesses' => ! empty($data['access']) ? [$data['access']] : [],
            'water' => $data['water'] ?? '',
            'electricity' => $data['electricity'] ?? '',
            'region' => $data['region'] ?? '',
            'regionOther' => $data['regionOther'] ?? '',
            'district' => $data['district'] ?? '',
            'commune' => $data['commune'] ?? '',
            'fokontany' => $data['fokontany'] ?? '',
            'addressHint' => $data['directions'] ?? '',
            'lat' => $lat,
            'lng' => $lng,
            'salePayment' => $salePayment,
            'maxDuration' => $maxDuration,
            'depositRange' => $data['deposit'] ?? '',
            'ownerStatus' => $data['ownerStatus'] ?? '',
            'estimateRequested' => $data['estimateRequested'] ?? '',
            'noPhoto' => (bool) ($data['noPhoto'] ?? false),
            'whatsapp' => $data['whatsapp'] ?? '',
            'video' => $uploaded['videos'][0] ?? null,
            'siteFiles' => [
                'videos' => array_slice($uploaded['videos'], 1),
                'idCards' => [],
            ],
            'summary' => $data['summary'] ?? '',
            'receivedAt' => now()->format('Y-m-d'),
            'priority' => 'Normale',
            'agent' => 'Non assigné',
            'notes' => [],
            'tasks' => [],
            'checklist' => [],
            'photos' => $uploaded['photos'],
            'documents' => $uploaded['documents'],
            'docTypes' => array_values((array) ($data['docTypes'] ?? [])),
            'actions' => [],
            'history' => $history,
            'source' => 'Site web',
        ];

        $file = LandFile::create([
            'ref' => $ref,
            'client_id' => $client->id,
            'status' => 'Nouveau',
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
     * exclusivement via les routes Sanctum /admin/files et /admin/files-raw)
     * et renvoie des objets directement exploitables par le back-office.
     */
    private function storeUploads(Request $request, string $ref, string $ownerName, array $docTypes): array
    {
        $realDocTypes = array_values(array_filter(
            $docTypes,
            fn ($t) => is_string($t) && trim($t) !== '' && trim($t) !== DossierVocabulary::NO_DOC && trim($t) !== "Aucun document pour l'instant"
        ));

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
                    $rawCat = $realDocTypes !== [] ? $realDocTypes[$i % count($realDocTypes)] : 'Autre document';
                    $entry['category'] = DossierVocabulary::docCategory($rawCat);
                    $entry['number'] = '';
                    $entry['issuedAt'] = '';
                    $entry['ownerName'] = $ownerName;
                    $entry['status'] = 'À examiner';
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
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            default => 'application/octet-stream',
        };
    }
}
