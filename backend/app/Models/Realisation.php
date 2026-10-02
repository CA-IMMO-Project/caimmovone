<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Realisation extends Model
{
    protected $fillable = [
        'title', 'category', 'location', 'completed_at', 'client', 'area',
        'duration', 'description', 'photos', 'published', 'featured',
    ];

    protected function casts(): array
    {
        return [
            'photos' => 'array',
            'published' => 'boolean',
            'featured' => 'boolean',
            'area' => 'integer',
        ];
    }

    public function fillFromPublic(array $data): static
    {
        $map = [
            'title' => 'title', 'category' => 'category', 'location' => 'location',
            'completedAt' => 'completed_at', 'client' => 'client', 'area' => 'area',
            'duration' => 'duration', 'description' => 'description',
            'photos' => 'photos', 'published' => 'published', 'featured' => 'featured',
        ];
        $attributes = [];
        foreach ($map as $public => $column) {
            if (array_key_exists($public, $data)) {
                $attributes[$column] = $data[$public];
            }
        }
        return $this->fill($attributes);
    }

    /** Photos sous forme d'URLs pour le site public. */
    public function photoUrls(): array
    {
        return collect($this->photos ?? [])
            ->map(fn ($p) => is_array($p) ? ($p['url'] ?? null) : $p)
            ->filter()
            ->values()
            ->all();
    }

    /** Shape complet attendu par le back office (photos = objets fichier). */
    public function toAdminArray(): array
    {
        return array_merge($this->toPublicArray(), [
            'photos' => $this->photos ?? [],
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ]);
    }

    public function toPublicArray(): array
    {
        return [
            'id' => (string) $this->id,
            'title' => $this->title,
            'category' => $this->category,
            'location' => $this->location,
            'completedAt' => $this->completed_at,
            'client' => $this->client,
            'area' => (int) $this->area,
            'duration' => $this->duration,
            'description' => $this->description,
            'photos' => $this->photoUrls(),
            'published' => (bool) $this->published,
            'featured' => (bool) $this->featured,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
