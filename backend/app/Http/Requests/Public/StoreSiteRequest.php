<?php

namespace App\Http\Requests\Public;

use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreSiteRequest extends FormRequest
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
            'kind' => 'required|in:interet,visite,recherche,vente',
            'fullName' => 'required|string|max:150',
            'phone' => 'required|string|max:40',
            'email' => 'nullable|email|max:160',
            'message' => 'nullable|string|max:5000',
            'landId' => 'nullable|string|max:64',
            'lotId' => 'nullable|string|max:64',
            'budget' => 'nullable|string|max:120',
            'profession' => 'nullable|string|max:120',
            'bankAccount' => 'nullable|string|max:160',
            'age' => 'nullable|integer|min:1|max:120',
            'nationality' => 'nullable|string|max:80',
            'projectName' => 'nullable|string|max:200',
            'paymentMode' => 'nullable|string|max:80',
            'duration' => 'nullable|string|max:80',
            'downPaymentAmount' => 'nullable|string|max:80',
            'visitDate' => 'nullable|string|max:40',
            'visitTime' => 'nullable|string|max:40',
            'birthDate' => 'nullable|string|max:40',
            'callTime' => 'nullable|string|max:80',
        ];
    }

    public function after(): array
    {
        return [fn (Validator $validator) => Phone::isValid((string) $this->input('phone'))
            ?: $validator->errors()->add('phone', Phone::message())];
    }
}
