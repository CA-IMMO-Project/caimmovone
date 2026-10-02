<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
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
