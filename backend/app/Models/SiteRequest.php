<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

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
        'ref', 'kind', 'land_id', 'client_id', 'full_name', 'phone', 'email',
        'message', 'meta', 'detail', 'status', 'priority', 'source',
    ];

    protected function casts(): array
    {
        return ['meta' => 'array', 'detail' => 'array'];
    }

    /** Référence unique du jour : ACH-260930, puis ACH-260930-2, -3… */
    public static function nextRef(string $kind): string
    {
        $prefix = self::PREFIXES[$kind] ?? 'ACH';
        $base = $prefix . '-' . now()->format('ymd');
        $exists = fn (string $ref) => DB::table('requests')->where('ref', $ref)->exists();

        if (! $exists($base)) {
            return $base;
        }
        for ($i = 2; $i < 100; $i++) {
            if (! $exists("{$base}-{$i}")) {
                return "{$base}-{$i}";
            }
        }
        return $base . '-' . substr(uniqid(), -4);
    }

    public function toPublicArray(): array
    {
        return [
            'id' => (string) $this->id,
            'ref' => $this->ref,
            'kind' => $this->kind,
            'landId' => $this->land_id ? (string) $this->land_id : null,
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

        return array_merge($detail, [
            'id' => (string) $this->id,
            'ref' => $this->ref,
            'kind' => $this->kind,
            'landId' => $this->land_id ? (string) $this->land_id : ($detail['landId'] ?? null),
            'clientId' => $this->client_id ? (string) $this->client_id : ($detail['clientId'] ?? null),
            'status' => $detail['status'] ?? $this->status,
            'priority' => $detail['priority'] ?? $this->priority,
            'source' => $detail['source'] ?? $this->source,
            'firstName' => $firstName,
            'lastName' => $lastName,
            'phone' => $detail['phone'] ?? $this->phone,
            'dialCode' => $detail['dialCode'] ?? '',
            'email' => $detail['email'] ?? $this->email,
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
