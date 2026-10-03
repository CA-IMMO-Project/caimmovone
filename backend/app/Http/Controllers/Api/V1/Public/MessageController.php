<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Support\Phone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** POST /api/v1/messages — message de contact (visible dans le back office). */
class MessageController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'fullName' => 'required|string|max:150',
            'phone' => 'nullable|string|max:40',
            'email' => 'nullable|email|max:160',
            'subject' => 'nullable|string|max:200',
            'message' => 'required|string|max:5000',
        ]);

        if (! empty($data['phone'])) {
            $data['phone'] = Phone::normalize($data['phone']);
            if (! Phone::isValid($data['phone'])) {
                return response()->json(['message' => Phone::message(), 'errors' => ['phone' => [Phone::message()]]], 422);
            }
        }

        // Anti-doublon : le même message renvoyé (double-clic, rechargement,
        // impatience) dans les dernières 24 h n'est enregistré qu'une fois.
        $dupe = ContactMessage::query()
            ->where('body', $data['message'])
            ->where('created_at', '>=', now()->subDay())
            ->where(function ($q) use ($data) {
                $q->where('full_name', $data['fullName']);
                if (! empty($data['phone'])) {
                    $q->orWhere('phone', $data['phone']);
                }
                if (! empty($data['email'])) {
                    $q->orWhere('email', $data['email']);
                }
            })
            ->exists();

        if ($dupe) {
            return response()->json([
                'updated' => true,
                'message' => 'Votre message nous est déjà bien parvenu — notre équipe vous répond rapidement.',
            ], 200);
        }

        ContactMessage::create([
            'full_name' => $data['fullName'],
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'subject' => $data['subject'] ?? 'Message du site',
            'body' => $data['message'],
        ]);

        return response()->json(['message' => 'Votre message a bien été envoyé.'], 201);
    }
}
