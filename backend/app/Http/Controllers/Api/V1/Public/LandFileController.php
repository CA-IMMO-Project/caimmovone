<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Support\Phone;
use App\Models\LandFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
            'payment' => 'nullable|string|max:80',
            'paymentDuration' => 'nullable|string|max:80',
            'deposit' => 'nullable|string|max:80',
            'photoNames' => 'nullable|array',
            'videoNames' => 'nullable|array',
            'docNames' => 'nullable|array',
            'docTypes' => 'nullable|array',
            'idFileNames' => 'nullable|array',
            'summary' => 'nullable|string|max:8000',
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

        $history = [[
            'id' => uniqid(),
            'at' => now()->toIso8601String(),
            'author' => 'Site web',
            'text' => 'Dossier reçu depuis le site web',
        ]];

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
            'salePayment' => $data['payment'] ?? '',
            'maxDuration' => $data['paymentDuration'] ?? '',
            'depositRange' => $data['deposit'] ?? '',
            // Fichiers annoncés par le vendeur (noms) — les vrais fichiers
            // sont récupérés par l'agence puis déposés via le back office.
            'siteFiles' => [
                'photos' => array_values($data['photoNames'] ?? []),
                'videos' => array_values($data['videoNames'] ?? []),
                'documents' => array_values($data['docNames'] ?? []),
                'docTypes' => array_values($data['docTypes'] ?? []),
                'idCards' => array_values($data['idFileNames'] ?? []),
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
            'ref' => LandFile::nextRef(),
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
}
