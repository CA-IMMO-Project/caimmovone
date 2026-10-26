<?php

namespace App\Http\Requests\Admin;

use App\Models\Realisation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveRealisationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $isCreate = $this->isMethod('post');

        return [
            'id' => ['nullable'],
            'createdAt' => ['nullable', 'string', 'max:64'],
            'updatedAt' => ['nullable', 'string', 'max:64'],
            'title' => $isCreate
                ? ['required', 'string', 'max:255']
                : ['sometimes', 'required', 'string', 'max:255'],
            'category' => $isCreate
                ? ['required', 'string', Rule::in(Realisation::CATEGORIES)]
                : ['sometimes', 'required', 'string', Rule::in(Realisation::CATEGORIES)],
            'location' => ['nullable', 'string', 'max:255'],
            'completedAt' => ['nullable', 'string', 'regex:/^\d{4}-(0[1-9]|1[0-2])$/'],
            'client' => ['nullable', 'string', 'max:180'],
            'area' => ['nullable', 'numeric', 'min:0', 'max:1000000000'],
            'duration' => ['nullable', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:10000'],
            'photos' => ['nullable', 'array', 'max:50'],
            'published' => ['nullable', 'boolean'],
            'featured' => ['nullable', 'boolean'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            foreach ((array) $this->input('photos', []) as $index => $photo) {
                $validString = is_string($photo) && trim($photo) !== '';
                $validObject = is_array($photo) && (
                    (! empty($photo['url']) && is_string($photo['url']))
                    || (! empty($photo['name']) && is_string($photo['name']))
                );

                if (! $validString && ! $validObject) {
                    $validator->errors()->add("photos.{$index}", 'Chaque visuel doit comporter une URL ou une fiche fichier valide.');
                }
            }
        }];
    }
}
