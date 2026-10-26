<?php

namespace App\Http\Requests\Admin;

use App\Models\Land;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreLandRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $merged = [];

        if ($this->input('status') === 'reserve') {
            $merged['status'] = 'réservé';
        }

        if (is_array($this->input('lots'))) {
            $merged['lots'] = array_map(function (mixed $lot): mixed {
                if (is_array($lot) && ($lot['status'] ?? null) === 'reserve') {
                    $lot['status'] = 'réservé';
                }

                return $lot;
            }, $this->input('lots'));
        }

        if ($merged !== []) {
            $this->merge($merged);
        }
    }

    public function rules(): array
    {
        return [
            'id' => ['nullable'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'price' => ['required', 'numeric', 'min:1', 'max:1000000000000'],
            'region' => ['required', 'string', 'max:120'],
            'zone' => ['nullable', 'string', 'max:160'],
            'location' => ['required', 'string', 'max:255'],
            'imageUrl' => ['nullable', 'string', 'max:2048'],
            'gallery' => ['nullable', 'array', 'max:50'],
            'gallery.*' => ['string', 'max:2048'],
            'features' => ['nullable', 'array', 'max:50'],
            'features.*' => ['string', 'max:255'],
            'documents' => ['nullable', 'array', 'max:50'],
            'coordinates' => ['nullable', 'array', 'size:2'],
            'coordinates.0' => ['numeric', 'between:-90,90'],
            'coordinates.1' => ['numeric', 'between:-180,180'],
            'area' => ['nullable', 'numeric', 'min:0', 'max:1000000000'],
            'titleStatus' => ['nullable', 'string', Rule::in(Land::TITLE_STATUSES)],
            'status' => ['nullable', 'string', Rule::in(Land::STATUSES)],
            'publicationStatus' => ['nullable', 'string', Rule::in(Land::PUBLICATION_STATUSES)],
            'relief' => ['nullable', 'string', Rule::in(Land::RELIEFS)],
            'access' => ['nullable', 'string', 'max:255'],
            'water' => ['nullable', 'boolean'],
            'electricity' => ['nullable', 'boolean'],
            'featured' => ['nullable', 'boolean'],
            'payment' => ['nullable', 'string', 'max:500'],
            'paymentMode' => ['nullable', 'string', Rule::in(Land::PAYMENT_MODES)],
            'downPayment' => ['nullable', 'string', 'max:255'],
            'installments' => ['nullable', 'string', 'max:255'],
            'lots' => ['nullable', 'array', 'max:200'],
            'sales' => ['nullable', 'array', 'max:200'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            foreach ((array) $this->input('lots', []) as $index => $lot) {
                if (! is_array($lot)) {
                    $validator->errors()->add("lots.{$index}", 'Chaque parcelle doit être un objet valide.');

                    continue;
                }
                if (isset($lot['area']) && (! is_numeric($lot['area']) || (float) $lot['area'] < 0)) {
                    $validator->errors()->add("lots.{$index}.area", 'La surface de la parcelle doit être un nombre positif ou nul.');
                }
                if (isset($lot['price']) && (! is_numeric($lot['price']) || (float) $lot['price'] < 0)) {
                    $validator->errors()->add("lots.{$index}.price", 'Le prix de la parcelle doit être un nombre positif ou nul.');
                }
                if (isset($lot['status']) && ! in_array($lot['status'], Land::STATUSES, true)) {
                    $validator->errors()->add("lots.{$index}.status", 'Statut de parcelle non reconnu.');
                }
            }

            foreach ((array) $this->input('sales', []) as $index => $sale) {
                if (! is_array($sale)) {
                    $validator->errors()->add("sales.{$index}", 'Chaque vente doit être un objet valide.');

                    continue;
                }
                if (isset($sale['price']) && (! is_numeric($sale['price']) || (float) $sale['price'] < 0)) {
                    $validator->errors()->add("sales.{$index}.price", 'Le montant de la vente doit être positif ou nul.');
                }
                if (! empty($sale['date']) && (! is_string($sale['date']) || preg_match('/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/', $sale['date']) !== 1)) {
                    $validator->errors()->add("sales.{$index}.date", 'La date de vente doit respecter le format AAAA-MM-JJ.');
                }
            }
        }];
    }
}
