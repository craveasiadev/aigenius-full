<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CorsMiddleware
{
    /**
     * Handle CORS for all requests.
     * Note: CORS headers are primarily set in public/index.php BEFORE Laravel boots.
     * This middleware is a fallback and should NOT duplicate headers.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // OPTIONS requests are now handled by Laravel's built-in HandleCors middleware
        // configured via config/cors.php


        return $next($request);
    }
}
