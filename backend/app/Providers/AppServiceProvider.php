<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        if (! app()->environment('production')) {
            return;
        }

        $origins = (array) config('cors.allowed_origins', []);
        if ($origins === [] || in_array('*', $origins, true)) {
            throw new RuntimeException('FRONTEND_URL doit être une origine explicite en production.');
        }

        if ((bool) config('app.debug')) {
            throw new RuntimeException('APP_DEBUG doit être désactivé en production.');
        }
    }
}
