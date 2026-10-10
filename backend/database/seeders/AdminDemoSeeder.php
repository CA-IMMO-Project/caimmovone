<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\ContactMessage;
use App\Models\Land;
use App\Models\LandFile;
use App\Models\Search;
use App\Models\SiteRequest;
use App\Support\PresentationData;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use RuntimeException;

/** Ancien nom conservé pour compatibilité ; charge désormais un jeu cohérent et non destructif. */
class AdminDemoSeeder extends Seeder
{
    private PresentationData $records;

    private CarbonImmutable $base;

    public function run(): void
    {
        PresentationData::ensureAllowed();
        $this->records = new PresentationData;
        $this->base = CarbonImmutable::now('Indian/Antananarivo')->startOfDay();
        $dataset = PresentationData::json('presentation.json');
        $catalogue = collect(PresentationData::json('lands.json'))->keyBy('presentationKey');

        // Compatible aussi avec un appel explicite à l'ancien seeder CRM seul.
        if ($catalogue->keys()->contains(fn ($key) => ! $this->records->find('land:'.$key, Land::class))) {
            $this->call(LandSeeder::class);
        }
        $clients = [];
        $people = collect($dataset['people'])->keyBy('key');
        foreach ($dataset['people'] as $person) {
            $name = $person['firstName'].' '.$person['lastName'];
            $clients[$person['key']] = $this->records->remember('client:'.$person['key'], Client::class, function () use ($person, $name) {
                return (new Client([
                    'full_name' => $name,
                    'phone' => $person['phone'],
                    'email' => $person['email'],
                    'source' => $person['source'],
                    'notes' => $person['message'],
                    'detail' => [
                        'fullName' => $name, 'phone' => $person['phone'], 'email' => $person['email'],
                        'budget' => $person['budget'] ? $this->ar($person['budget']) : '',
                        'profession' => $person['profession'],
                        'age' => (string) (int) CarbonImmutable::parse($person['birthDate'])->diffInYears($this->base),
                        'nationality' => 'Malgache', 'bankAccount' => $person['bankAccount'],
                        'message' => $person['message'], 'source' => $person['source'],
                    ],
                ]))->forceFill(['created_at' => $this->date(-45)->utc(), 'updated_at' => $this->date(-1)->utc()]);
            });
        }

        foreach ($dataset['requests'] as $row) {
            $client = $clients[$row['clientKey']];
            $person = $people[$row['clientKey']];
            $land = $this->land($row['landKey']);
            $attachment = $this->records->file($row['documentPath'], $row['kind'] === 'visite' ? 'Fiche de préparation de visite' : 'Synthèse du projet d’achat');
            $request = $this->records->remember('request:'.$row['key'], SiteRequest::class, function () use ($row, $client, $person, $land, $attachment) {
                $visit = isset($row['visitOffset']) ? $this->date($row['visitOffset'], $row['visitTime'] ?? '10:00') : null;
                $follow = isset($row['followUpOffset']) ? $this->date($row['followUpOffset'], '10:30') : null;
                $detail = array_merge($this->person($person), [
                    'clientId' => (string) $client->id, 'landId' => (string) $land->id, 'lotId' => $row['lotId'] ?? null,
                    'status' => $row['status'], 'priority' => $row['priority'], 'source' => $person['source'],
                    'agent' => $row['agent'], 'propertyType' => 'Terrain',
                    'region' => $land->region, 'district' => $land->region === 'Analamanga' ? 'Antananarivo' : $land->zone,
                    'commune' => $land->zone, 'fokontany' => '',
                    'budgetMin' => $row['budgetMin'], 'budgetMax' => $row['budgetMax'],
                    'areaMin' => $row['areaMin'], 'areaMax' => $row['areaMax'],
                    'goal' => $row['goal'], 'criteria' => $row['criteria'], 'message' => $row['message'],
                    'paymentMode' => $row['paymentMode'], 'deposit' => $row['deposit'], 'paymentDuration' => $row['paymentDuration'],
                    'deadline' => 'Dans les six prochains mois', 'extraInfo' => 'Scénario fictif ; aucun engagement ou paiement réel.',
                    'consent' => true, 'nextFollowUp' => $follow?->toIso8601String() ?? '',
                    'visitAt' => $visit?->toIso8601String() ?? '',
                    'visitDate' => $visit?->toDateString() ?? '', 'visitTime' => $visit?->format('H:i') ?? '',
                    'callTime' => 'En journée', 'attachments' => [$attachment],
                    'notes' => [$this->entry($row['key'].'-note', $row['message'], -1, $row['agent'])],
                    'contacts' => [[
                        'id' => 'ex-'.$row['key'].'-contact', 'at' => $this->date($row['createdOffset'] + 1, '11:00')->toIso8601String(),
                        'channel' => 'Appel', 'summary' => $row['contactSummary'],
                    ]],
                    'history' => array_map(fn ($text, $index) => $this->entry($row['key'].'-h'.$index, $text, $row['createdOffset'] + $index, $row['agent']), $row['history'], array_keys($row['history'])),
                    'actions' => [],
                ]);
                if ($row['kind'] === 'visite' && $visit) {
                    $done = $row['status'] === 'Effectuée';
                    $detail['actions'][] = [
                        'id' => 'ex-'.$row['key'].'-visite', 'type' => 'Visite du terrain', 'at' => $visit->toIso8601String(),
                        'note' => $row['message'], 'done' => $done,
                        'doneAt' => $done ? $visit->addHour()->toIso8601String() : null,
                        'result' => $done ? 'Visite réalisée dans le scénario ; questions enregistrées au dossier.' : '',
                    ];
                } elseif ($follow) {
                    $detail['actions'][] = [
                        'id' => 'ex-'.$row['key'].'-appel', 'type' => 'Appel', 'at' => $follow->toIso8601String(),
                        'note' => 'Faire le point sur le projet et la prochaine étape.', 'done' => false,
                    ];
                }
                if (isset($row['soldOffset'])) {
                    $detail['history'][] = $this->entry($row['key'].'-vente', 'Achat finalisé dans le scénario — aucun acte ni paiement réel.', $row['soldOffset'], $row['agent']);
                }

                return (new SiteRequest([
                    'ref' => SiteRequest::nextRef($row['kind']), 'kind' => $row['kind'],
                    'client_id' => $client->id, 'land_id' => $land->id, 'lot_id' => $row['lotId'] ?? null,
                    'full_name' => $client->full_name, 'phone' => $client->phone, 'email' => $client->email,
                    'message' => $row['message'], 'status' => $row['status'], 'priority' => $row['priority'],
                    'source' => $person['source'], 'detail' => $detail,
                    'meta' => ['budget' => $this->ar($row['budgetMax']), 'visitDate' => $detail['visitDate'], 'visitTime' => $detail['visitTime']],
                ]))->forceFill(['created_at' => $this->date($row['createdOffset'])->utc(), 'updated_at' => $this->date(-1, '16:00')->utc()]);
            });

            // Une vente n'est ajoutée qu'à la création de CE dossier fictif.
            // Aucun historique existant (même modifié ensuite) n'est réécrit.
            if ($request->wasRecentlyCreated && isset($row['salePrice']) && ! collect($land->sales ?? [])->contains('id', 'ex-'.$row['key'].'-sale')) {
                $sales = $land->sales ?? [];
                $sales[] = [
                    'id' => 'ex-'.$row['key'].'-sale', 'date' => $this->date($row['soldOffset'])->toDateString(),
                    'lotId' => $row['lotId'] ?? null, 'price' => $row['salePrice'], 'paymentMode' => $row['paymentMode'],
                    'buyer' => [
                        'firstName' => $person['firstName'], 'lastName' => $person['lastName'],
                        'phone' => $person['phone'], 'email' => $person['email'], 'address' => $person['address'],
                        'idNumber' => 'Non fourni — exemple',
                    ],
                    'notes' => 'Scénario fictif d’achat finalisé ; aucun transfert, paiement ou acte réel.',
                    'buyRequestId' => (string) $request->id,
                ];
                $land->forceFill(['sales' => $sales])->save();
            }
        }

        foreach ($dataset['searches'] as $row) {
            $client = $clients[$row['clientKey']];
            $attachment = $this->records->file($row['documentPath'], 'Cahier de recherche');
            $this->records->remember('search:'.$row['key'], Search::class, function () use ($row, $client, $attachment) {
                $proposals = array_map(function ($key, $index) use ($row) {
                    return [
                        'id' => 'ex-'.$row['key'].'-p'.$index, 'landId' => (string) $this->land($key)->id,
                        'at' => $this->date(-1)->toIso8601String(), 'note' => 'Parcelle proposée selon la zone, le budget et la surface.',
                        'answer' => $row['status'] === 'Visite programmée' ? 'Visite demandée' : 'En attente',
                    ];
                }, $row['proposalLandKeys'], array_keys($row['proposalLandKeys']));
                $detail = array_merge($row, [
                    'clientId' => (string) $client->id, 'fullName' => $client->full_name,
                    'phone' => $client->phone, 'email' => $client->email, 'source' => 'Backoffice',
                    'proposals' => $proposals, 'attachments' => [$attachment],
                    'history' => [$this->entry($row['key'].'-created', 'Recherche qualifiée et rattachée au client.', $row['createdOffset'])],
                ]);
                unset($detail['key'], $detail['clientKey'], $detail['createdOffset'], $detail['proposalLandKeys'], $detail['documentPath']);

                return (new Search([
                    'ref' => Search::nextRef(), 'client_id' => $client->id, 'status' => $row['status'],
                    'main_zone' => $row['mainZone'], 'full_name' => $client->full_name, 'phone' => $client->phone,
                    'email' => $client->email, 'source' => 'Backoffice', 'detail' => $detail,
                ]))->forceFill(['created_at' => $this->date($row['createdOffset'])->utc(), 'updated_at' => $this->date(-1)->utc()]);
            });
        }

        foreach ($dataset['sellers'] as $row) {
            $client = $clients[$row['clientKey']];
            $person = $people[$row['clientKey']];
            $land = $catalogue[$row['landKey']];
            $profile = $this->records->file($row['profilePath'], 'Profil du propriétaire — exemple');
            $documents = array_map(function ($fixture, $index) use ($person, $row) {
                return array_merge($this->records->file($fixture['path'], $fixture['name']), [
                    'category' => $index === 1 ? 'Plan du terrain' : 'Autre document',
                    'number' => '', 'issuedAt' => '', 'ownerName' => $person['firstName'].' '.$person['lastName'],
                    'status' => $row['documentsStatus'],
                ]);
            }, $land['documentFixtures'], array_keys($land['documentFixtures']));
            $this->records->remember('seller:'.$row['key'], LandFile::class, function () use ($row, $client, $person, $land, $profile, $documents) {
                $comptant = $land['paymentMode'] === 'comptant';
                $visit = isset($row['visitOffset']) ? $this->date($row['visitOffset'], '14:30') : null;
                $detail = [
                    'clientId' => (string) $client->id, 'ownerId' => 'EX-PROP-'.strtoupper($person['key']),
                    'owner' => array_merge($this->person($person), ['accountNumber' => '']),
                    'idDoc' => [
                        'type' => 'Autre', 'number' => 'EX-PROFIL-'.strtoupper($person['key']),
                        'issuedAt' => $this->base->toDateString(), 'expiresAt' => '', 'authority' => 'Profil de présentation — pas une pièce d’identité', 'file' => $profile,
                    ],
                    'title' => $land['title'], 'category' => $row['landKey'] === 'brickaville' ? 'Terrain agricole' : ($row['landKey'] === 'laceo-special' ? 'Lotissement' : 'Terrain nu'),
                    'area' => $land['area'], 'price' => $land['price'], 'pricePerM2' => (int) round($land['price'] / $land['area']), 'pricePerM2Manual' => false,
                    'negotiable' => 'Oui', 'description' => $land['description'],
                    'relief' => $land['relief'] === 'Plat' ? 'Terrain plat' : 'Pente douce', 'accesses' => [$land['access']],
                    'roadWidth' => '4 m (hypothèse)', 'distanceMainRoad' => '300 m (hypothèse)',
                    'water' => $land['water'] ? 'À proximité' : 'Non', 'electricity' => $land['electricity'] ? 'À proximité' : 'Non',
                    'mobile' => 'Oui', 'internet' => 'Oui', 'sanitation' => 'À prévoir', 'fence' => 'Non',
                    'building' => 'Non', 'buildingDesc' => '', 'occupation' => 'Libre', 'immediate' => 'Oui',
                    'usage' => $row['landKey'] === 'brickaville' ? 'Agricole' : ($row['landKey'] === 'mahajanga' ? 'Commercial' : 'Résidentiel'),
                    'region' => $land['region'], 'regionOther' => '', 'district' => $land['region'] === 'Analamanga' ? 'Antananarivo' : $land['zone'],
                    'commune' => $land['zone'], 'fokontany' => '', 'addressHint' => 'Localisation indicative du scénario ; point de rencontre à confirmer.',
                    'landmark' => 'Repère à préciser avant visite', 'lat' => $land['coordinates'][0], 'lng' => $land['coordinates'][1],
                    'photos' => array_map(fn ($url) => $this->photo($url), $land['gallery']),
                    'documents' => $documents, 'salePayment' => $comptant ? 'Comptant – paiement en une fois' : 'Les deux – comptant ou facilité',
                    'maxDuration' => $comptant ? '0–4 mois' : '10–12 mois', 'maxDurationOther' => '',
                    'depositRange' => $comptant ? 'Personnalisé' : '25–35 %', 'depositCustom' => $comptant ? 100 : 0,
                    'frequency' => 'Mensuelle', 'frequencyOther' => '', 'saleNegotiable' => 'Oui', 'negotiationMargin' => 'À convenir',
                    'specialConditions' => 'Hypothèses de présentation sans engagement. Pièces authentiques à demander avant une acquisition.',
                    'ownerComments' => $person['message'], 'agent' => $row['agent'], 'receivedAt' => $this->date($row['receivedOffset'])->toDateString(),
                    'priority' => $row['priority'], 'status' => $row['status'], 'fieldCheck' => $row['fieldCheck'], 'legalCheck' => $row['legalCheck'],
                    'internalEstimate' => $land['price'], 'recommendedPrice' => $land['price'], 'commission' => 5,
                    'internalComments' => $row['note'],
                    'checklist' => [
                        'Coordonnées du propriétaire renseignées', 'Pièces du dossier jointes', 'Plan de situation joint',
                        'Informations foncières renseignées', 'Prix et conditions de vente saisis', 'Photographies jointes (vue générale, accès, limites)',
                    ],
                    'visitAt' => $visit?->toIso8601String() ?? '', 'notes' => [$this->entry($row['key'].'-note', $row['note'], -1, $row['agent'])],
                    'tasks' => [['id' => 'ex-'.$row['key'].'-task', 'due' => $this->date($row['followUpOffset'])->toDateString(), 'text' => 'Faire le point sur les pièces réelles à apporter et la prochaine étape.', 'done' => false]],
                    'history' => [$this->entry($row['key'].'-received', 'Dossier reçu, client rattaché et supports joints.', $row['receivedOffset'], $row['agent'])],
                    'actions' => [[
                        'id' => 'ex-'.$row['key'].'-follow', 'type' => 'Appel', 'at' => $this->date($row['followUpOffset'], '15:00')->toIso8601String(),
                        'note' => 'Suivi des pièces et des conditions commerciales.', 'done' => false,
                    ]],
                ];

                return (new LandFile([
                    'ref' => LandFile::nextRef(), 'client_id' => $client->id, 'status' => $row['status'],
                    'full_name' => $client->full_name, 'phone' => $client->phone, 'detail' => $detail,
                ]))->forceFill(['created_at' => $this->date($row['createdOffset'])->utc(), 'updated_at' => $this->date(-1)->utc()]);
            });
        }

        foreach ($dataset['messages'] as $row) {
            $client = $clients[$row['clientKey']];
            $this->records->remember('message:'.$row['key'], ContactMessage::class, function () use ($row, $client) {
                return (new ContactMessage([
                    'full_name' => $client->full_name, 'phone' => $client->phone, 'email' => $client->email,
                    'subject' => $row['subject'], 'body' => $row['body'], 'read' => $row['read'],
                ]))->forceFill(['created_at' => $this->date($row['createdOffset'])->utc(), 'updated_at' => $this->date(-1)->utc()]);
            });
        }

        $this->command?->info('CRM : 12 clients, 8 achats, 4 visites, 4 recherches, 4 dossiers vendeurs et 6 messages liés.');
    }

    private function date(int $offset, string $time = '09:00'): CarbonImmutable
    {
        [$hour, $minute] = array_map('intval', explode(':', $time));

        return $this->base->addDays($offset)->setTime($hour, $minute);
    }

    private function entry(string $key, string $text, int $offset, string $author = 'Administrateur'): array
    {
        return ['id' => 'ex-'.$key, 'at' => $this->date($offset)->toIso8601String(), 'author' => $author, 'text' => $text];
    }

    private function person(array $p): array
    {
        return [
            'firstName' => $p['firstName'], 'lastName' => $p['lastName'], 'phone' => $p['phone'], 'dialCode' => '',
            'email' => $p['email'], 'birthDate' => $p['birthDate'], 'profession' => $p['profession'],
            'country' => $p['country'], 'countryOther' => '', 'address' => $p['address'],
            'hasBankAccount' => '', 'bank' => '',
        ];
    }

    private function land(string $key): Land
    {
        $land = $this->records->find('land:'.$key, Land::class);
        if (! $land instanceof Land) {
            throw new RuntimeException('Terrain de présentation introuvable : '.$key);
        }

        return $land;
    }

    private function photo(string $url): array
    {
        $path = base_path('../frontend/public'.$url);

        return ['id' => 'ex-photo-'.substr(hash('sha256', $url), 0, 12), 'name' => basename($url), 'url' => $url, 'type' => 'image/jpeg', 'size' => File::exists($path) ? File::size($path) : 0];
    }

    private function ar(int $value): string
    {
        return number_format($value, 0, ',', ' ').' Ar';
    }
}
