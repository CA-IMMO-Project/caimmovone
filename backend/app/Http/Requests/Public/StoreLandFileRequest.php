<?php

namespace App\Http\Requests\Public;

use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreLandFileRequest extends FormRequest
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
            'email' => 'nullable|email|max:160', 'birthDate' => 'nullable|date|before:today',
            'profession' => 'nullable|string|max:120', 'country' => 'nullable|string|max:80',
            'bankAccount' => 'nullable|string|max:160', 'idType' => 'nullable|string|max:40',
            'idNumber' => 'nullable|string|max:80', 'title' => 'required|string|max:200',
            'area' => 'nullable|numeric|min:0', 'price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string|max:5000', 'relief' => 'nullable|string|max:80',
            'access' => 'nullable|string|max:120', 'water' => 'nullable|string|max:20',
            'electricity' => 'nullable|string|max:20', 'region' => 'nullable|string|max:80',
            'district' => 'nullable|string|max:80', 'commune' => 'nullable|string|max:80',
            'fokontany' => 'nullable|string|max:80', 'directions' => 'nullable|string|max:400',
            'lat' => 'nullable|numeric|between:-90,90', 'lng' => 'nullable|numeric|between:-180,180',
            'payment' => 'nullable|string|max:80', 'paymentDuration' => 'nullable|string|max:80',
            'deposit' => 'nullable|string|max:80', 'photoNames' => 'nullable|array|max:12',
            'videoNames' => 'nullable|array|max:2', 'docNames' => 'nullable|array|max:12',
            'docTypes' => 'nullable|array|max:12', 'idFileNames' => 'nullable|array|max:4',
            'summary' => 'nullable|string|max:8000',
            'photos' => 'nullable|array|max:12',
            'photos.*' => 'file|mimes:jpg,jpeg,png,webp|max:5120',
            'videos' => 'nullable|array|max:2',
            'videos.*' => 'file|mimes:mp4,webm,mov|max:102400',
            'documents' => 'nullable|array|max:12',
            'documents.*' => 'file|mimes:pdf,jpg,jpeg,png,webp,doc,docx|max:10240',
            'idFiles' => 'nullable|array|max:4',
            'idFiles.*' => 'file|mimes:pdf,jpg,jpeg,png,webp|max:10240',
        ];
    }

    public function after(): array
    {
        return [fn (Validator $validator) => Phone::isValid((string) $this->input('phone'))
            ?: $validator->errors()->add('phone', Phone::message())];
    }
}
