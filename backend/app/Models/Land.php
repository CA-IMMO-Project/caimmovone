<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Terrain du catalogue public.
 * L'API renvoie les champs en camelCase (toPublicArray) pour coller
 * exactement au type `Land` du frontend.
 */
class Land extends Model
{
    protected $fillable = [
        'title', 'description', 'price', 'region', 'zone', 'location', 'image_url',
        'gallery', 'features', 'documents', 'coordinates', 'area', 'title_status',
        'status', 'relief', 'access', 'water', 'electricity', 'payment',
        'payment_mode', 'down_payment', 'installments', 'verified', 'featured',
        'publication_status', 'lots',
    ];

    protected function casts(): array
    {
        return [
            'gallery' => 'array',
            'lots' => 'array',
            'features' => 'array',
            'documents' => 'array',
            'coordinates' => 'array',
            'water' => 'boolean',
            'electricity' => 'boolean',
            'verified' => 'boolean',
            'featured' => 'boolean',
            'price' => 'integer',
            'area' => 'integer',
        ];
    }

    /** Accepte les payloads camelCase du frontend / futur back office. */
    public function fillFromPublic(array $data): static
    {
        $map = [
            'title' => 'title', 'description' => 'description', 'price' => 'price',
            'region' => 'region', 'zone' => 'zone', 'location' => 'location',
            'imageUrl' => 'image_url', 'gallery' => 'gallery', 'features' => 'features',
            'documents' => 'documents', 'coordinates' => 'coordinates', 'area' => 'area',
            'titleStatus' => 'title_status', 'status' => 'status', 'relief' => 'relief',
            'access' => 'access', 'water' => 'water', 'electricity' => 'electricity',
            'payment' => 'payment', 'paymentMode' => 'payment_mode',
            'downPayment' => 'down_payment', 'installments' => 'installments',
            'verified' => 'verified', 'featured' => 'featured',
            'publicationStatus' => 'publication_status', 'lots' => 'lots',
        ];
        $attributes = [];
        foreach ($map as $public => $column) {
            if (array_key_exists($public, $data)) {
                $attributes[$column] = $data[$public];
            }
        }

        return $this->fill($attributes);
    }

    public function toPublicArray(): array
    {
        return [
            'id' => (string) $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'price' => (int) $this->price,
            'region' => $this->region,
            'location' => $this->location,
            'coordinates' => $this->coordinates,
            'imageUrl' => $this->image_url,
            'gallery' => $this->gallery ?? [],
            'features' => $this->features ?? [],
            'area' => (int) $this->area,
            'titleStatus' => $this->title_status,
            'status' => $this->status,
            'zone' => $this->zone,
            'relief' => $this->relief,
            'access' => $this->access,
            'water' => (bool) $this->water,
            'electricity' => (bool) $this->electricity,
            'documents' => $this->documents ?? [],
            'payment' => $this->payment,
            'paymentMode' => $this->payment_mode,
            'downPayment' => $this->down_payment,
            'installments' => $this->installments,
            'verified' => (bool) $this->verified,
            'featured' => (bool) $this->featured,
            'publicationStatus' => $this->publication_status ?? 'publie',
            'lots' => $this->lots ?? [],
        ];
    }
}
