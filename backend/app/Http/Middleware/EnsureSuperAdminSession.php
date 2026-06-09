<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\Response;

class EnsureSuperAdminSession
{
    public function handle(Request $request, Closure $next): Response
    {
        $superadminId = $request->session()->get('superadmin_user_id');

        if (!$superadminId) {
            $redirect = redirect()->route('superadmin.login');
            if ($this->isSuperadminLoginDebugEnabled()) {
                $redirect->with(
                    'superadmin_login_debug_message',
                    '[SESSION_MISSING] No superadmin session found on protected route. Cookie/session may not be persisting across requests.'
                );
            }
            return $redirect;
        }

        $user = User::query()
            ->where('id', $superadminId)
            ->where('role', 'master')
            ->where('is_superadmin', true)
            ->first();

        if (!$user) {
            $request->session()->forget('superadmin_user_id');
            $redirect = redirect()->route('superadmin.login');
            if ($this->isSuperadminLoginDebugEnabled()) {
                $redirect->with(
                    'superadmin_login_debug_message',
                    '[SESSION_USER_INVALID] Session contains a user id that is no longer a valid superadmin.'
                );
            }
            return $redirect;
        }

        $request->attributes->set('superadmin', $user);
        View::share('superadmin', $user);

        return $next($request);
    }

    private function isSuperadminLoginDebugEnabled(): bool
    {
        return (bool) config('app.superadmin_login_debug', false) || (bool) config('app.debug', false);
    }
}
