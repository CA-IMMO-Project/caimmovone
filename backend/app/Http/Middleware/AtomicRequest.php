<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/** Run one HTTP mutation atomically at database level. */
class AtomicRequest
{
    public function handle(Request $request, Closure $next): Response
    {
        return DB::transaction(fn (): Response => $next($request), attempts: 3);
    }
}
