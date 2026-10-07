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
            'message' => $detail['message'] ?? $this->message,
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
