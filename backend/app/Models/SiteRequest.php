<?php

namespace App\Models;

use App\Support\ReferenceGenerator;
use Illuminate\Database\Eloquent\Model;

/**
 * Demande reçue du site public : achat (interet), visite, recherche, vente.
 * Le préfixe de référence est choisi selon le type de demande.
 */
class SiteRequest extends Model
{
    public const KINDS = ['interet', 'visite', 'recherche', 'vente'];

    public const PRIORITIES = ['Faible', 'Normale', 'Haute', 'Urgente'];

    public const BUY_STATUSES = [
        'Nouvelle',
        'À contacter',
        'Contacté',
        'En étude',
        'Proposition envoyée',
        'Visite programmée',
        'Négociation',
        'Validée',
        'Achat finalisé',
        'Refusée',
        'Archivée',
    ];

    public const VISIT_STATUSES = [
        'Demandée',
        'Confirmée',
        'Reportée',
        'Effectuée',
        'Annulée',
    ];

    public const STATUSES = [
        ...self::BUY_STATUSES,
        ...self::VISIT_STATUSES,
    ];

    public const SOURCES = [
        'Site web',
        'Backoffice',
        'Téléphone',
        'Facebook',
        'WhatsApp',
        'Agence',
        'Recommandation',
        'Autre',
    ];

    public const PREFIXES = [
        'interet' => 'ACH',
        'achat' => 'ACH',
        'visite' => 'VIS',
        'recherche' => 'REC',
        'vente' => 'VEN',
    ];

    protected $table = 'requests';

    protected $fillable = [
        'ref', 'kind', 'land_id', 'lot_id', 'client_id', 'full_name', 'phone', 'email',
        'message', 'meta', 'detail', 'status', 'priority', 'source',
    ];

    protected function casts(): array
    {
        return ['meta' => 'array', 'detail' => 'array'];
    }

    /** Référence métier atomique, sûre même sous requêtes concurrentes. */
    public static function nextRef(string $kind): string
    {
        $prefix = self::PREFIXES[$kind] ?? 'ACH';

        return ReferenceGenerator::next($prefix);
    }

    public function toPublicArray(): array
    {
        return [
            'id' => (string) $this->id,
            'ref' => $this->ref,
            'kind' => $this->kind,
            'landId' => $this->land_id ? (string) $this->land_id : null,
            'lotId' => $this->lot_id,
            'fullName' => $this->full_name,
            'phone' => $this->phone,
            'email' => $this->email,
            'message' => $this->message,
            'meta' => $this->meta,
            'status' => $this->status,
            'priority' => $this->priority,
            'source' => $this->source,
            'landTitle' => $this->land?->title,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }

    public function land()
    {
        return $this->belongsTo(Land::class);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    /** Shape attendu par le back office (BuyRequest) : détail CRM + champs structurés. */
    public function toAdminArray(): array
    {
        $detail = $this->detail ?? [];
        [$firstName, $lastName] = $this->splitName($detail['firstName'] ?? null, $detail['lastName'] ?? null);

        // meta : champs complémentaires du site public (date/heure de visite,
        // budget…). Le détail CRM, plus riche, reste prioritaire s'il existe.
        $meta = $this->meta ?? [];

        // Normalisation site public -> modèle du formulaire d’édition du back-office.
        // Les anciens noms restent acceptés afin que les demandes déjà enregistrées
        // soient elles aussi correctement préremplies.
        $nationality = (string) ($detail['country'] ?? $meta['country'] ?? $meta['nationality'] ?? '');
        $knownCountries = ['Madagascar', 'France', 'La Réunion', 'Autre'];
        $country = in_array($nationality, $knownCountries, true)
            ? $nationality
            : ($nationality !== '' ? 'Autre' : '');
        $countryOther = (string) ($detail['countryOther'] ?? $meta['countryOther'] ??
            ($country === 'Autre' && $nationality !== 'Autre' ? $nationality : ''));

        $account = (string) ($meta['bankAccount'] ?? '');
        $hasBankAccount = (string) ($detail['hasBankAccount'] ?? $meta['hasBankAccount'] ??
            ($account !== '' ? (preg_match('/^non$/i', $account) ? 'Non' : 'Oui') : ''));
        $bank = (string) ($detail['bank'] ?? $meta['bank'] ??
            ($account !== '' && ! preg_match('/^(oui|non)$/i', $account) ? $account : ''));

        $rawPayment = (string) ($detail['paymentMode'] ?? $meta['paymentMode'] ?? '');
        $paymentMode = match ($rawPayment) {
            'Comptant' => 'Paiement comptant – règlement en une fois',
            'Facilité' => 'Facilité de paiement – paiement échelonné',
            default => $rawPayment,
        };
        $paymentDuration = (string) ($detail['paymentDuration'] ?? $meta['paymentDuration'] ?? $meta['duration'] ?? '');
        $rawDeposit = $detail['deposit'] ?? $meta['deposit'] ?? $meta['downPaymentAmount'] ?? 0;
        $deposit = is_numeric($rawDeposit)
            ? (int) $rawDeposit
            : (int) preg_replace('/\D+/', '', (string) $rawDeposit);

        $legacyMessage = trim((string) $this->message);
        $deadline = (string) ($detail['deadline'] ?? $meta['deadline'] ?? '');
        if ($deadline === '' && preg_match('/^Délai souhaité\s*:\s*([^\r\n]+)/iu', $legacyMessage, $match)) {
            $deadline = trim($match[1]);
        }
        $projectDescription = (string) ($detail['extraInfo'] ?? $meta['projectDescription'] ?? '');
        if ($projectDescription === '' && $legacyMessage !== '') {
            // Nettoyage des anciennes demandes : les versions précédentes
            // mélangeaient le délai et les marqueurs de renvoi avec le projet.
            $projectDescription = (string) preg_replace('/^Délai souhaité\s*:[^\r\n]*(?:\r?\n)?/imu', '', $legacyMessage);
            $projectDescription = (string) preg_replace('/^—\s*Nouvel envoi du\s+.*?—\s*$/imu', '', $projectDescription);
            $projectDescription = trim((string) preg_replace('/\n{3,}/', "\n\n", $projectDescription));
        }
        $displayMessage = $this->kind === 'interet' && $projectDescription !== ''
            ? $projectDescription
            : ($detail['message'] ?? $this->message);

        return array_merge([
            // champs tableaux toujours présents pour l'écran « Demandes »
            'history' => [], 'notes' => [], 'contacts' => [],
            'attachments' => [], 'actions' => [],
        ], $meta, $detail, [
            'id' => (string) $this->id,
            'ref' => $this->ref,
            'kind' => $this->kind,
            'landId' => $this->land_id ? (string) $this->land_id : ($detail['landId'] ?? null),
            'lotId' => $detail['lotId'] ?? $this->lot_id ?? ($meta['lotId'] ?? null),
            'clientId' => $this->client_id ? (string) $this->client_id : ($detail['clientId'] ?? null),
            'status' => $detail['status'] ?? $this->status,
            'priority' => $detail['priority'] ?? $this->priority,
            'source' => $detail['source'] ?? $this->source,
            'firstName' => $firstName,
            'lastName' => $lastName,
            'phone' => $detail['phone'] ?? $this->phone,
            'dialCode' => $detail['dialCode'] ?? '',
            'email' => $detail['email'] ?? $this->email,
            'country' => $country,
            'countryOther' => $countryOther,
            'hasBankAccount' => $hasBankAccount,
            'bank' => $bank,
            'paymentMode' => $paymentMode,
            'paymentDuration' => $paymentDuration,
            'deposit' => $deposit,
            'deadline' => $deadline,
            'extraInfo' => $projectDescription,
            // Une demande issue du formulaire public est déposée après affichage
            // des informations de confidentialité ; elle reste donc modifiable
            // sans obliger l’administrateur à recocher ce champ.
            'consent' => $detail['consent'] ?? $meta['consent'] ?? ($this->source === 'Site web'),
            'message' => $displayMessage,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ]);
    }

    /** Prénom/nom garantis (détail prioritaire, sinon découpe du nom complet). */
    private function splitName(?string $first, ?string $last): array
    {
        if ($first || $last) {
            return [$first ?? '', $last ?? ''];
        }
        $parts = preg_split('/\s+/', trim($this->full_name ?? '') ?: '', 2);

        return [$parts[0] ?? '', $parts[1] ?? ''];
    }
}
