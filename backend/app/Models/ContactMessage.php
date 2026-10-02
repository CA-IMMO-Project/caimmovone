<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContactMessage extends Model
{
    protected $table = 'messages';

    protected $fillable = ['full_name', 'phone', 'email', 'subject', 'body', 'read'];

    protected function casts(): array
    {
        return ['read' => 'boolean'];
    }

    /** Shape attendu par le back office (ContactMessage du front). */
    public function toAdminArray(): array
    {
        [$firstName, $lastName] = preg_split('/\s+/', trim($this->full_name ?? '') ?: '', 2) + ['', ''];

        return [
            'id' => (string) $this->id,
            'firstName' => $firstName,
            'lastName' => $lastName[0] ?? '',
            'phone' => $this->phone,
            'email' => $this->email,
            'subject' => $this->subject,
            'message' => $this->body,
            'status' => $this->read ? 'traité' : 'nouveau',
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
