<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\WorkshopShop;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\View\View;

/**
 * Workshop staff (role: staff_event) — limited session-based auth.
 * Lives next to the superadmin session flow but in its own namespace
 * with its own session key so the two cannot accidentally cross-auth.
 *
 * Endpoints:
 *   GET  /staff-event/login    → show login
 *   POST /staff-event/login    → submit
 *   POST /staff-event/logout
 *   GET  /staff-event/scanner  → the actual scanner UI (gated)
 */
class StaffEventController extends Controller
{
    public function showLogin(Request $request): View|RedirectResponse
    {
        if ($request->session()->has('staff_event_user_id')) {
            return redirect()->route('staff-event.scanner');
        }
        return view('superadmin.event-workshops.staff-login');
    }

    public function login(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();
        if (! $user || $user->role !== 'staff_event' || ! Hash::check($data['password'], $user->password_hash)) {
            Log::info('[staff-event] login rejected', [
                'email' => $data['email'],
                'has_user' => (bool) $user,
                'role' => optional($user)->role,
            ]);
            return back()
                ->withErrors(['email' => 'Invalid credentials or this account is not a workshop staff account.'])
                ->withInput($request->only('email'));
        }

        $request->session()->regenerate();
        $request->session()->put('staff_event_user_id', $user->id);

        return redirect()->route('staff-event.scanner');
    }

    public function logout(Request $request): RedirectResponse
    {
        $request->session()->forget('staff_event_user_id');
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect()->route('staff-event.login');
    }

    /**
     * Render the scanner UI. Catalog is filtered to the shops this
     * staff member is authorised for — falls back to "any active
     * shop" when the pivot is empty (handy for fresh staff accounts
     * before they're tied to specific shops).
     */
    public function scanner(Request $request): View
    {
        $user = $request->attributes->get('staff_event_user');
        if (! $user) {
            $user = User::find($request->session()->get('staff_event_user_id'));
        }

        $shopIds = \DB::table('workshop_shop_staff')
            ->where('user_id', $user->id)
            ->pluck('workshop_shop_id');

        $query = WorkshopShop::where('is_active', true)->orderBy('name');
        if ($shopIds->isNotEmpty()) {
            $query->whereIn('id', $shopIds);
        }
        $shops = $query->get();

        // Pre-shape for the Alpine script so the Blade view can pass
        // a plain array to @json(...) without nested arrow-fn syntax
        // (which trips up Blade's directive parser at compile time).
        $shopsForJs = $shops->map(fn (WorkshopShop $s) => [
            'id'             => $s->id,
            'name'           => $s->name,
            'companyName'    => $s->company_name,
            'businessNature' => $s->business_nature ?? '',
            'shopImageUrl'   => $s->shop_image_url,
        ])->values()->all();

        return view('superadmin.event-workshops.scanner', [
            'shops'      => $shops,
            'shopsForJs' => $shopsForJs,
        ]);
    }
}
