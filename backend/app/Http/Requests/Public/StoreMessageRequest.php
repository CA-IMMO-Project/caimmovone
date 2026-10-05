<?php

namespace App\Http\Requests\Public;

use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('phone')) {
            $this->merge(['phone' => Phone::normalize($this->input('phone'))]);
        }
    }

    public function rules(): array
    {
        return [
            'fullName' => 'required|string|max:150', 'phone' => 'nullable|string|max:40',
            'email' => 'nullable|email|max:160', 'subject' => 'nullable|string|max:200',
            'message' => 'required|string|max:5000',
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($this->filled('phone') && ! Phone::isValid((string) $this->input('phone'))) {
                $validator->errors()->add('phone', Phone::message());
            }
        }];
    }
}
