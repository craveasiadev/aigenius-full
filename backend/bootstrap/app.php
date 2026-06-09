<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\CorsMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
        then: function () {
            \Illuminate\Support\Facades\Route::middleware('web')
                ->group(base_path('routes/wpay-test.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Trust the reverse proxy so X-Forwarded-Proto/Host produces correct
        // https:// URLs from url()->to() etc. TRUSTED_PROXIES="*" trusts any
        // hop — fine when only the proxy can reach this container's port.
        if ($proxies = env('TRUSTED_PROXIES')) {
            $middleware->trustProxies(
                at: $proxies === '*' ? '*' : array_map('trim', explode(',', $proxies)),
                headers: \Illuminate\Http\Request::HEADER_X_FORWARDED_FOR
                       | \Illuminate\Http\Request::HEADER_X_FORWARDED_HOST
                       | \Illuminate\Http\Request::HEADER_X_FORWARDED_PORT
                       | \Illuminate\Http\Request::HEADER_X_FORWARDED_PROTO,
            );
        }

        // CRITICAL: Custom CORS middleware to handle OPTIONS preflight FIRST
        // This prevents redirect issues with preflight requests
        $middleware->prepend(CorsMiddleware::class);

        // Disable CSRF for ALL routes - this is an API backend, not a traditional web app
        $middleware->validateCsrfTokens(except: [
            '*',
        ]);

        // Remove session middleware for stateless API requests
        // $middleware->web(remove: [
        //     \Illuminate\Session\Middleware\StartSession::class,
        //     \Illuminate\View\Middleware\ShareErrorsFromSession::class,
        // ]);

        // Register middleware aliases
        $middleware->alias([
            'auth.genius' => \App\Http\Middleware\AuthenticateGenius::class,
            'superadmin.session' => \App\Http\Middleware\EnsureSuperAdminSession::class,
            'staff_event.session' => \App\Http\Middleware\EnsureStaffEventSession::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
