<?php

namespace App\Models;

use App\Support\ReferenceGenerator;
use Illuminate\Database\Eloquent\Model;

/** Recherche sur mesure confiée à l'équipe (fiche « Recherches spécifiques »). */
class Search extends Model
{
    protected $fillable = [
        'ref', 'client_id', 'status', 'main_zone', 'full_name', 'phone',
        'email', 'source', 'detail',
    ];

    protected function casts(): array
    {
        return ['detail' => 'array'];
    }

    public static function nextRef(): string
    {
        return ReferenceGenerator::next('REC');
    }

    /** Fusion : détail (objet admin) puis champs structurés font autorité. */
    public function toAdminArray(): array
    {
        $detail = $this->detail ?? [];

        return array_merge($detail, [
            'id' => (string) $this->id,
            'ref' => $this->ref,
            'clientId' => $this->client_id ? (string) $this->client_id : null,
            'status' => $this->status,
            'mainZone' => $detail['mainZone'] ?? $this->main_zone,
            'fullName' => $detail['fullName'] ?? $this->full_name,
            'phone' => $detail['phone'] ?? $this->phone,
            'email' => $detail['email'] ?? $this->email,
            'source' => $detail['source'] ?? $this->source,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ]);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }
}
