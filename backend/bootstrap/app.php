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
