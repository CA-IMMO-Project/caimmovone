<?php

namespace App\Http\Requests\Admin;

use App\Models\Client;
use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $merged = [];

        if ($this->hasAny(['fullName', 'firstName', 'lastName'])) {
            $composed = trim(($this->input('firstName') ?? '').' '.($this->input('lastName') ?? ''));
            $fullName = trim((string) ($this->input('fullName') ?: $composed));
            $merged['fullName'] = $fullName;
        }

        if ($this->exists('phone')) {
            $merged['phone'] = Phone::normalize((string) $this->input('phone'));
        }

        if ($this->exists('email')) {
            $email = mb_strtolower(trim((string) $this->input('email')));
            $merged['email'] = $email !== '' ? $email : null;
        }

        if ($this->exists('age') && $this->input('age') !== null) {
            $age = trim((string) $this->input('age'));
            $merged['age'] = $age !== '' ? $age : null;
        }

        if ($merged !== []) {
            $this->merge($merged);
        }
    }

    public function rules(): array
    {
        $isCreate = $this->isMethod('post');

        return [
            'id' => ['nullable', 'string', 'max:64'],
            'ref' => ['nullable', 'string', 'max:40'],
            'createdAt' => ['nullable', 'string', 'max:64'],
            'fullName' => $isCreate
                ? ['required', 'string', 'max:150']
                : ['sometimes', 'required', 'string', 'max:150'],
            'firstName' => ['nullable', 'string', 'max:100'],
            'lastName' => ['nullable', 'string', 'max:100'],
            'phone' => $isCreate
                ? ['required', 'string', 'max:40']
                : ['sometimes', 'required', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:160'],
            'source' => ['nullable', 'string', Rule::in(Client::SOURCES)],
            'budget' => ['nullable', 'string', 'max:120'],
            'profession' => ['nullable', 'string', 'max:120'],
            'age' => ['nullable', 'integer', 'between:1,120'],
            'nationality' => ['nullable', 'string', 'max:80'],
            'bankAccount' => ['nullable', 'string', 'max:160'],
            'message' => ['nullable', 'string', 'max:5000'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if (($this->isMethod('post') || $this->exists('phone'))
                && ! Phone::isValid((string) $this->input('phone'))) {
                $validator->errors()->add('phone', Phone::message());
            }
        }];
    }
}
