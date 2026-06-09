<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gate for the workshop scanner UI. Same shape as the superadmin
 * session middleware but with its own session key so the two flows
 * stay isolated. Allows `master` users to scan too (handy for
 * superadmins testing on-site).
 */
class EnsureStaffEventSession
{
    public function handle(Request $request, Closure $next): Response
    {
        // Superadmins can also scan — short-circuit when their session
        // is already established.
        if ($request->session()->has('superadmin_user_id')) {
            $admin = User::find($request->session()->get('superadmin_user_id'));
            if ($admin) {
                $request->attributes->set('staff_event_user', $admin);
                View::share('staff_event_user', $admin);
                return $next($request);
            }
        }

        $staffId = $request->session()->get('staff_event_user_id');
        if (! $staffId) {
            return redirect()->route('staff-event.login');
        }

        $user = User::where('id', $staffId)
            ->whereIn('role', ['staff_event', 'master'])
            ->first();

        if (! $user) {
            $request->session()->forget('staff_event_user_id');
            return redirect()->route('staff-event.login');
        }

        $request->attributes->set('staff_event_user', $user);
        View::share('staff_event_user', $user);

        return $next($request);
    }
}
