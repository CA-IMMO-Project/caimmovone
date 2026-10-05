<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

/*
|--------------------------------------------------------------------------
| Fichiers publics uploadés (images catalogue, médias back office)
|--------------------------------------------------------------------------
| Sécurise l'accès en développement même si `php artisan storage:link`
| n'a pas encore été exécuté : la route sert le fichier depuis le disque
| `public`. En production, un vrai lien public /storage reste recommandé.
*/
Route::get('/storage/{path}', function (string $path) {
    abort_unless(Storage::disk('public')->exists($path), 404);

    return Storage::disk('public')->response($path);
})->where('path', '.*');
