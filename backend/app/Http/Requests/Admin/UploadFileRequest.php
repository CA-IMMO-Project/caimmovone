<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UploadFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->tokenCan('admin') === true;
    }

    public function rules(): array
    {
        return [
            'visibility' => 'required|in:public,private',
            'file' => [
                'required', 'file', 'max:51200',
                'mimes:jpg,jpeg,png,webp,pdf,doc,docx,xls,xlsx,mp4,webm',
            ],
        ];
    }
}
