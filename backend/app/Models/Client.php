<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    protected $fillable = ['ref', 'full_name', 'phone', 'email', 'notes', 'source', 'detail'];

    protected function casts(): array
    {
        return ['detail' => 'array'];
    }

    public function requests()
    {
        return $this->hasMany(SiteRequest::class);
    }

    public function searches()
    {
        return $this->hasMany(Search::class);
    }

    /** Rapprochement par téléphone ou email (insensible à la casse). */
    public static function findOrCreateFromRequest(array $data): self
    {
        $email = trim((string) ($data['email'] ?? ''));
        // Normalisation des séparateurs : deux écritures du même numéro
        // doivent désigner la même fiche client.
        $phone = \App\Support\Phone::normalize($data['phone'] ?? '');

        $client = null;
        if ($email !== '') {
            $client = static::whereRaw('lower(email) = lower(?)', [$email])->first();
        }
        if (! $client && $phone !== '') {
            $client = static::where('phone', $phone)->first();
        }
        if (! $client) {
            $client = static::create([
                'full_name' => $data['fullName'] ?? 'Sans nom',
                'phone' => $phone,
                'email' => $email !== '' ? $email : null,
                'source' => 'Site web',
            ]);
        } elseif ($client->full_name === 'Sans nom' && ! empty($data['fullName'])) {
            $client->update(['full_name' => $data['fullName']]);
        }

        return $client;
    }

    /** Shape attendu par le back office (fiche CRM complète). */
    public function toAdminArray(): array
    {
        $detail = $this->detail ?? [];

        return array_merge($detail, [
            'id' => (string) $this->id,
            'ref' => $detail['ref'] ?? ('C-' . str_pad((string) $this->id, 4, '0', STR_PAD_LEFT)),
            'createdAt' => $this->created_at?->toIso8601String(),
            'source' => $detail['source'] ?? $this->source,
            'fullName' => $detail['fullName'] ?? $this->full_name,
            'phone' => $detail['phone'] ?? $this->phone,
            'email' => $detail['email'] ?? $this->email,
        ]);
    }
}
