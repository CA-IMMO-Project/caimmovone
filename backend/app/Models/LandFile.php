<?php

namespace App\Models;

use App\Support\DossierVocabulary;
use App\Support\ReferenceGenerator;
use Illuminate\Database\Eloquent\Model;

/** Dossier « À vendre » : terrain proposé à l'agence (dépôt site ou saisie interne). */
class LandFile extends Model
{
    protected $fillable = ['ref', 'client_id', 'status', 'full_name', 'phone', 'detail'];

    protected function casts(): array
    {
        return ['detail' => 'array'];
    }

    public static function nextRef(string $prefix = 'VEN'): string
    {
        return ReferenceGenerator::next($prefix);
    }

    public function toAdminArray(): array
    {
        $detail = DossierVocabulary::detail($this->detail ?? []);

        return array_merge([
            // champs tableaux toujours présents pour l'interface d'administration
            'photos' => [], 'documents' => [], 'accesses' => [],
            'history' => [], 'checklist' => [], 'actions' => [],
        ], $detail, [
            'id' => (string) $this->id,
            'ref' => $this->ref,
            'clientId' => $this->client_id ? (string) $this->client_id : null,
            'status' => DossierVocabulary::status($this->status),
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ]);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }
}
