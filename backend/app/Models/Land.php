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
        'publication_status', 'lots', 'sales',
    ];

    protected function casts(): array
    {
        return [
            'gallery' => 'array',
            'lots' => 'array',
            'sales' => 'array',
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
            'sales' => 'sales',
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
            'documents' => $this->normalizedDocuments(),
            'payment' => $this->payment,
            'paymentMode' => $this->payment_mode,
            'downPayment' => $this->down_payment,
            'installments' => $this->installments,
            'verified' => (bool) $this->verified,
            'featured' => (bool) $this->featured,
            'publicationStatus' => $this->publication_status ?? 'publie',
            'lots' => $this->lots ?? [],
            // Historique des ventes de la fiche (vente du terrain entier ou d'un lot) :
            // sans cette colonne, le backoffice perdait l'historique à chaque rechargement.
            'sales' => $this->sales ?? [],
        ];
    }

    /**
     * Les anciens jeux de données (seed d'origine) stockent les documents du
     * dossier comme de simples libellés ("Titre foncier"…). Le backoffice
     * permet désormais d'y déposer de vrais fichiers (id/name/type/size/url) :
     * on normalise ici pour que l'API renvoie toujours la même forme d'objet,
     * quelle que soit l'ancienneté de la donnée en base.
     */
    private function normalizedDocuments(): array
    {
        $documents = $this->documents ?? [];

        return array_values(array_map(function ($document, $index) {
            if (is_string($document)) {
                return ['id' => "doc-{$index}", 'name' => $document, 'type' => '', 'size' => 0];
            }

            // Document déjà « objet » (déposé depuis le backoffice, ou migré
            // précédemment) : on complète quand même les clés manquantes ou
            // nulles (ex. `type` à null) pour que le frontend — qui appelle
            // `file.type.startsWith(...)` — ne plante jamais sur une donnée
            // historique incomplète.
            return [
                'id' => $document['id'] ?? "doc-{$index}",
                'name' => $document['name'] ?? 'Document',
                'type' => $document['type'] ?? '',
                'size' => $document['size'] ?? 0,
                'url' => $document['url'] ?? null,
            ];
        }, $documents, array_keys($documents)));
    }
}
