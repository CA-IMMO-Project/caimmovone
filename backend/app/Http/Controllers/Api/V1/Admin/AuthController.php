<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

/** Connexion du back office (jeton Sanctum, ability « admin »). */
class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        $user = User::whereRaw('lower(email) = lower(?)', [$credentials['email']])->first();
        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json(['message' => 'Identifiants incorrects.'], 401);
        }

        // Une seule session d'administration active par compte : les anciens
        // jetons sont révoqués afin de limiter l'exposition en cas de fuite.
        $user->tokens()->delete();
        $expiresAt = now()->addMinutes((int) config('sanctum.expiration', 480));
        $token = $user->createToken('admin', ['admin'], $expiresAt)->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => ['id' => (string) $user->id, 'name' => $user->name, 'email' => $user->email],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => ['id' => (string) $user->id, 'name' => $user->name, 'email' => $user->email],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnexion effectuée.']);
    }
}
