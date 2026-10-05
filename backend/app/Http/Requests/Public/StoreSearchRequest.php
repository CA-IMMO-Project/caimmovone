<?php

namespace App\Http\Requests\Public;

use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreSearchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['phone' => Phone::normalize($this->input('phone'))]);
    }

    public function rules(): array
    {
        return [
            'fullName' => 'required|string|max:150', 'phone' => 'required|string|max:40',
            'email' => 'nullable|email|max:160', 'usage' => 'nullable|string|max:80',
            'budgetMax' => 'nullable|numeric|min:0', 'areaMin' => 'nullable|numeric|min:0',
            'areaMax' => 'nullable|numeric|min:0|gte:areaMin', 'mainZone' => 'nullable|string|max:160',
            'otherZones' => 'nullable|string|max:400', 'targetZone' => 'nullable|string|max:200',
            'lat' => 'nullable|numeric|between:-90,90', 'lng' => 'nullable|numeric|between:-180,180',
            'radiusKm' => 'nullable|numeric|min:0|max:1000', 'flexible' => 'nullable|string|in:Oui,Non',
            'suggestNearby' => 'nullable|boolean', 'criteria' => 'nullable|string|max:5000',
        ];
    }

    public function after(): array
    {
        return [fn (Validator $validator) => Phone::isValid((string) $this->input('phone'))
            ?: $validator->errors()->add('phone', Phone::message())];
    }
}
