<?php

/*
|--------------------------------------------------------------------------
| CORS — API CA IMMO
|--------------------------------------------------------------------------
| En développement, le frontend Vite proxifie /api vers le backend (aucun
| CORS nécessaire). En production, renseignez l'origine du frontend :
|   FRONTEND_URL=https://votre-site.mg
*/

$frontend = env('FRONTEND_URL', 'http://localhost:3000');

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => $frontend === '*' ? ['*'] : [$frontend],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => $frontend !== '*',
];
