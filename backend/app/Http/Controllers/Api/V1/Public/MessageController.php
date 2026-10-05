<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StoreMessageRequest;
use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;

/** POST /api/v1/messages — message de contact (visible dans le back office). */
class MessageController extends Controller
{
    public function store(StoreMessageRequest $request): JsonResponse
    {
        $data = $request->validated();

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
