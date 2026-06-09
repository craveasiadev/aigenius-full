<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AIGeniusPurchase;
use App\Models\AIpreneurClass;
use App\Models\AIpreneurClassBooking;
use App\Models\AIpreneurClassSlot;
use App\Models\AIpreneurPricingPackage;
use App\Models\AIpreneurPricingRule;
use App\Models\AIpreneurPopularityRange;
use App\Models\GeniusProfile;
use App\Models\OpenAIUsageLog;
use App\Models\Redemption;
use App\Models\StoreItem;
use App\Models\SystemConfig;
use App\Models\User;
use App\Models\WPayTransaction;
use App\Services\AIpreneurPricingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\View\View;

class SuperAdminController extends Controller
{
    protected function wpaySource(): string
    {
        return strtolower((string) config('wpay.superadmin_app_source', 'artventure'));
    }

    // ─── Auth ─────────────────────────────────────────────────

    public function showLogin(Request $request): View|RedirectResponse
    {
        if ($request->session()->has('superadmin_user_id')) {
            return redirect()->route('superadmin.dashboard');
        }

        return view('superadmin.login');
    }

    public function login(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $loginDebugEnabled = $this->isSuperadminLoginDebugEnabled();
        $reasonCode = null;

        $user = User::query()
            ->where('email', $validated['email'])
            ->first();

        if (!$user) {
            $reasonCode = 'USER_NOT_FOUND';
        } elseif ($user->role !== 'master') {
            $reasonCode = 'ROLE_NOT_MASTER';
        } elseif (!(bool) $user->is_superadmin) {
            $reasonCode = 'NOT_SUPERADMIN';
        } elseif (!Hash::check($validated['password'], $user->password_hash)) {
            $reasonCode = 'PASSWORD_MISMATCH';
        }

        if ($reasonCode !== null) {
            Log::warning('Superadmin login failed', [
                'reason' => $reasonCode,
                'email' => $validated['email'],
                'user_id' => $user?->id,
                'role' => $user?->role,
                'is_superadmin' => $user?->is_superadmin,
                'ip' => $request->ip(),
                'user_agent' => (string) $request->userAgent(),
            ]);

            $message = $loginDebugEnabled
                ? "[{$reasonCode}] " . $this->superadminLoginReasonText($reasonCode)
                : 'Invalid superadmin credentials.';

            return back()
                ->withInput($request->only('email'))
                ->with('superadmin_login_debug_message', $message)
                ->withErrors(['email' => $message]);
        }

        $request->session()->regenerate();
        $request->session()->put('superadmin_user_id', $user->id);
        $sessionUserId = $request->session()->get('superadmin_user_id');

        if ((string) $sessionUserId !== (string) $user->id) {
            $reasonCode = 'SESSION_WRITE_FAILED';
            Log::error('Superadmin login session write failed', [
                'reason' => $reasonCode,
                'email' => $validated['email'],
                'expected_user_id' => $user->id,
                'stored_user_id' => $sessionUserId,
                'session_driver' => config('session.driver'),
                'session_domain' => config('session.domain'),
                'session_secure' => config('session.secure'),
                'ip' => $request->ip(),
                'user_agent' => (string) $request->userAgent(),
            ]);

            $message = $loginDebugEnabled
                ? "[{$reasonCode}] " . $this->superadminLoginReasonText($reasonCode)
                : 'Login failed. Please try again.';

            return back()
                ->withInput($request->only('email'))
                ->with('superadmin_login_debug_message', $message)
                ->withErrors(['email' => $message]);
        }

        return redirect()->route('superadmin.dashboard');
    }

    private function isSuperadminLoginDebugEnabled(): bool
    {
        return (bool) config('app.superadmin_login_debug', false) || (bool) config('app.debug', false);
    }

    private function superadminLoginReasonText(string $reasonCode): string
    {
        return match ($reasonCode) {
            'USER_NOT_FOUND' => 'No user exists for this email.',
            'ROLE_NOT_MASTER' => 'User exists but role is not master.',
            'NOT_SUPERADMIN' => 'User exists but is_superadmin is false.',
            'PASSWORD_MISMATCH' => 'Password does not match password_hash.',
            'SESSION_WRITE_FAILED' => 'Credentials accepted but session did not persist.',
            default => 'Unknown login failure.',
        };
    }

    public function logout(Request $request): RedirectResponse
    {
        $request->session()->forget('superadmin_user_id');
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('superadmin.login');
    }

    // ─── Dashboard ────────────────────────────────────────────

    public function dashboard(Request $request): View
    {
        $wpaySource = $this->wpaySource();

        $stats = [
            'parents' => User::where('role', 'parent')->count(),
            'kids' => GeniusProfile::count(),
            'admins' => User::where('role', 'master')->count(),
            'bookings' => AIpreneurClassBooking::count(),
            'orders' => AIGeniusPurchase::count() + WPayTransaction::where('app_source', $wpaySource)->count(),
            'total_sales' => round(
                (float) AIGeniusPurchase::where('status', 'completed')->sum('amount_paid')
                + (float) WPayTransaction::where('app_source', $wpaySource)->where('status', 'success')->sum('amount')
                + (float) AIpreneurClassBooking::whereIn('payment_status', ['completed', 'pay_later'])->sum('amount'),
                2
            ),
        ];

        $recentBookings = AIpreneurClassBooking::query()
            ->with(['slot.course', 'student', 'parent'])
            ->orderByDesc('created_at')
            ->limit(8)
            ->get();

        $recentOrders = $this->buildCombinedOrders(8);

        return view('superadmin.dashboard', [
            'superadmin' => $request->attributes->get('superadmin'),
            'stats' => $stats,
            'recentBookings' => $recentBookings,
            'recentOrders' => $recentOrders,
        ]);
    }

    // ─── Finance ──────────────────────────────────────────────

    public function finance(Request $request): View
    {
        $wpaySource = $this->wpaySource();

        $walletRevenue = (float) WPayTransaction::where('app_source', $wpaySource)
            ->where('status', 'success')
            ->sum('amount');
        $tokenRevenue = (float) AIGeniusPurchase::where('status', 'completed')->sum('amount_paid');
        $classPaidRevenue = (float) AIpreneurClassBooking::where('payment_status', 'completed')->sum('amount');
        $classPayLaterRevenue = (float) AIpreneurClassBooking::where('payment_status', 'pay_later')->sum('amount');

        $financeRows = $this->buildCombinedOrders(60);

        return view('superadmin.finance', [
            'superadmin' => $request->attributes->get('superadmin'),
            'walletRevenue' => $walletRevenue,
            'tokenRevenue' => $tokenRevenue,
            'classPaidRevenue' => $classPaidRevenue,
            'classPayLaterRevenue' => $classPayLaterRevenue,
            'overallRevenue' => round($walletRevenue + $tokenRevenue + $classPaidRevenue + $classPayLaterRevenue, 2),
            'financeRows' => $financeRows,
        ]);
    }

    public function exportFinance(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $rows = $this->buildCombinedOrders(9999);

        return response()->streamDownload(function () use ($rows) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Source', 'Order ID', 'Customer', 'Amount (RM)', 'Status', 'Date']);
            foreach ($rows as $row) {
                fputcsv($handle, [
                    $row['source'],
                    $row['order_id'],
                    $row['customer'] ?? '-',
                    number_format((float) $row['amount'], 2),
                    $row['status'],
                    optional($row['created_at'])->format('Y-m-d H:i:s'),
                ]);
            }
            fclose($handle);
        }, 'finance-report-' . now()->format('Y-m-d') . '.csv');
    }

    public function updateOrderStatus(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'source' => 'required|in:wpay,token,workshop',
            'order_id' => 'required|string',
            'status' => 'required|string',
        ]);

        match ($validated['source']) {
            'wpay' => WPayTransaction::where('order_id', $validated['order_id'])
                ->update(['status' => $validated['status']]),
            'token' => AIGeniusPurchase::where('order_id', $validated['order_id'])
                ->update(['status' => $validated['status']]),
            'workshop' => AIpreneurClassBooking::where('order_id', $validated['order_id'])
                ->update(['payment_status' => $validated['status']]),
        };

        return back()->with('status', 'Order status updated.');
    }

    // ─── Orders ───────────────────────────────────────────────

    public function orders(Request $request): View
    {
        $wpaySource = $this->wpaySource();

        $classBookings = AIpreneurClassBooking::query()
            ->with(['slot.course', 'student', 'parent'])
            ->orderByDesc('created_at')
            ->paginate(20, ['*'], 'class_page');

        $tokenOrders = AIGeniusPurchase::query()
            ->with('student')
            ->orderByDesc('created_at')
            ->paginate(20, ['*'], 'token_page');

        $walletOrders = WPayTransaction::query()
            ->where('app_source', $wpaySource)
            ->orderByDesc('created_at')
            ->paginate(20, ['*'], 'wallet_page');

        return view('superadmin.orders', [
            'superadmin' => $request->attributes->get('superadmin'),
            'classBookings' => $classBookings,
            'tokenOrders' => $tokenOrders,
            'walletOrders' => $walletOrders,
        ]);
    }

    // ─── Families ─────────────────────────────────────────────

    public function families(Request $request): View
    {
        $parents = User::query()
            ->where('role', 'parent')
            ->withCount('geniusProfiles')
            ->with([
                'geniusProfiles' => function ($query) {
                    $query->with(['business', 'rewards'])->orderBy('created_at');
                },
            ])
            ->orderByDesc('created_at')
            ->paginate(20, ['*'], 'parents_page');

        $kids = GeniusProfile::query()
            ->with(['parent', 'business', 'rewards', 'aiTokens'])
            ->withCount(['products', 'staff', 'campaigns'])
            ->orderByDesc('created_at')
            ->paginate(20, ['*'], 'kids_page');

        return view('superadmin.families', [
            'superadmin' => $request->attributes->get('superadmin'),
            'parents' => $parents,
            'kids' => $kids,
        ]);
    }

    // ─── Admins ───────────────────────────────────────────────

    public function admins(Request $request): View
    {
        $admins = User::query()
            ->where('role', 'master')
            ->orderByDesc('created_at')
            ->get();

        return view('superadmin.admins', [
            'superadmin' => $request->attributes->get('superadmin'),
            'admins' => $admins,
        ]);
    }

    public function storeAdmin(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'is_superadmin' => 'nullable|boolean',
        ]);

        User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password_hash' => Hash::make($validated['password']),
            'role' => 'master',
            'is_superadmin' => (bool) ($validated['is_superadmin'] ?? false),
        ]);

        return redirect()
            ->route('superadmin.admins')
            ->with('status', 'Admin account created.');
    }

    public function updateAdmin(Request $request, string $adminId): RedirectResponse
    {
        $admin = User::query()
            ->where('id', $adminId)
            ->where('role', 'master')
            ->firstOrFail();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $admin->id,
            'password' => 'nullable|string|min:8',
            'is_superadmin' => 'nullable|boolean',
        ]);

        $currentSuperadmin = $request->attributes->get('superadmin');
        if ($admin->id === $currentSuperadmin?->id && !($validated['is_superadmin'] ?? false)) {
            return redirect()
                ->route('superadmin.admins')
                ->with('error', 'You cannot remove superadmin access from your own account.');
        }

        $admin->name = $validated['name'];
        $admin->email = $validated['email'];
        $admin->is_superadmin = (bool) ($validated['is_superadmin'] ?? false);

        if (!empty($validated['password'])) {
            $admin->password_hash = Hash::make($validated['password']);
        }

        $admin->save();

        return redirect()
            ->route('superadmin.admins')
            ->with('status', 'Admin account updated.');
    }

    public function deleteAdmin(Request $request, string $adminId): RedirectResponse
    {
        $admin = User::query()
            ->where('id', $adminId)
            ->where('role', 'master')
            ->firstOrFail();

        $currentSuperadmin = $request->attributes->get('superadmin');
        if ($admin->id === $currentSuperadmin?->id) {
            return redirect()
                ->route('superadmin.admins')
                ->with('error', 'You cannot delete your own account.');
        }

        if ($admin->is_superadmin && User::where('role', 'master')->where('is_superadmin', true)->count() <= 1) {
            return redirect()
                ->route('superadmin.admins')
                ->with('error', 'At least one superadmin account is required.');
        }

        $admin->delete();

        return redirect()
            ->route('superadmin.admins')
            ->with('status', 'Admin account removed.');
    }

    // ─── Settings ─────────────────────────────────────────────

    public function rewards(Request $request): View
    {
        $items = StoreItem::query()
            ->orderBy('sort_order')
            ->orderByDesc('created_at')
            ->paginate(20);

        $recentRedemptions = Redemption::query()
            ->with(['item:id,name', 'student:id,genius_name,genius_id'])
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        $stats = [
            'active_items' => (int) StoreItem::query()->where('is_active', true)->count(),
            'total_stock' => (int) StoreItem::query()->where('is_active', true)->sum('stock'),
            'total_redemptions' => (int) Redemption::query()->count(),
        ];

        return view('superadmin.rewards', [
            'superadmin' => $request->attributes->get('superadmin'),
            'items' => $items,
            'recentRedemptions' => $recentRedemptions,
            'stats' => $stats,
        ]);
    }

    public function storeRewardItem(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'details' => 'nullable|string',
            'type' => 'required|string|in:ticket,merch,voucher',
            'category' => 'required|string|in:theme_park,food,beauty,health,travel,more',
            'price_coins' => 'required|integer|min:1|max:1000000',
            'stock' => 'required|integer|min:0|max:1000000',
            'image_url' => 'nullable|string|max:1000',
            'partner' => 'nullable|string|max:120',
            'sort_order' => 'nullable|integer|min:0|max:100000',
        ]);

        StoreItem::query()->create([
            'name' => $validated['name'],
            'description' => $validated['description'],
            'details' => $validated['details'] ?? null,
            'type' => $validated['type'],
            'category' => $validated['category'],
            'price_coins' => (int) $validated['price_coins'],
            'stock' => (int) $validated['stock'],
            'image_url' => $validated['image_url'] ?? null,
            'partner' => $validated['partner'] ?? null,
            'is_active' => $request->boolean('is_active', true),
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
        ]);

        return redirect()
            ->route('superadmin.rewards')
            ->with('status', 'Reward item created.');
    }

    public function updateRewardItem(Request $request, string $itemId): RedirectResponse
    {
        $item = StoreItem::query()->where('id', $itemId)->firstOrFail();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'details' => 'nullable|string',
            'type' => 'required|string|in:ticket,merch,voucher',
            'category' => 'required|string|in:theme_park,food,beauty,health,travel,more',
            'price_coins' => 'required|integer|min:1|max:1000000',
            'stock' => 'required|integer|min:0|max:1000000',
            'image_url' => 'nullable|string|max:1000',
            'partner' => 'nullable|string|max:120',
            'sort_order' => 'nullable|integer|min:0|max:100000',
        ]);

        $item->fill([
            'name' => $validated['name'],
            'description' => $validated['description'],
            'details' => $validated['details'] ?? null,
            'type' => $validated['type'],
            'category' => $validated['category'],
            'price_coins' => (int) $validated['price_coins'],
            'stock' => (int) $validated['stock'],
            'image_url' => $validated['image_url'] ?? null,
            'partner' => $validated['partner'] ?? null,
            'is_active' => $request->boolean('is_active'),
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
        ]);
        $item->save();

        return redirect()
            ->route('superadmin.rewards')
            ->with('status', 'Reward item updated.');
    }

    public function deleteRewardItem(Request $request, string $itemId): RedirectResponse
    {
        $item = StoreItem::query()->where('id', $itemId)->firstOrFail();

        if ($item->redemptions()->exists()) {
            return redirect()
                ->route('superadmin.rewards')
                ->with('error', 'This item has redemption history and cannot be deleted. Set it as inactive instead.');
        }

        $item->delete();

        return redirect()
            ->route('superadmin.rewards')
            ->with('status', 'Reward item deleted.');
    }

    public function uploadRewardImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $file = $request->file('image');
        $filename = 'reward_' . uniqid() . '_' . time() . '.' . $file->getClientOriginalExtension();
        $file->storeAs('reward-images', $filename, 'public');

        // Use the CORS-safe public proxy route URL
        $url = url('/reward-images/' . $filename);

        return response()->json([
            'success' => true,
            'url' => $url,
        ]);
    }

    public function pricing(Request $request): View
    {
        $pricingService = app(AIpreneurPricingService::class);

        $packages = AIpreneurPricingPackage::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $rules = AIpreneurPricingRule::query()
            ->orderBy('sort_order')
            ->orderBy('operation_name')
            ->get();
        $popularityRanges = AIpreneurPopularityRange::query()
            ->orderBy('sort_order')
            ->orderBy('min_popularity')
            ->get();

        $stats = [
            'active_packages' => (int) $packages->where('is_active', true)->count(),
            'active_rules' => (int) $rules->where('is_active', true)->count(),
            'avg_token_price_rm' => (float) round(
                $packages->where('is_active', true)->filter(fn($pkg) => ((int) $pkg->tokens_amount + (int) $pkg->bonus_tokens) > 0)
                    ->avg(function (AIpreneurPricingPackage $pkg) {
                        $totalTokens = (int) $pkg->tokens_amount + (int) $pkg->bonus_tokens;
                        return $totalTokens > 0 ? ((float) $pkg->price_rm / $totalTokens) : null;
                    }) ?? 0,
                4
            ),
        ];

        $catalog = $pricingService->getPricingCatalog();
        $economy = is_array($catalog['economy'] ?? null) ? $catalog['economy'] : [];
        $profitPerVisitor = is_array($economy['profit_per_visitor'] ?? null)
            ? $economy['profit_per_visitor']
            : ['min' => 0, 'max' => 0];
        $dailyVisitors = is_array($economy['daily_visitors'] ?? null) ? $economy['daily_visitors'] : [];
        $popularityPreview = is_array($dailyVisitors['preview'] ?? null) ? $dailyVisitors['preview'] : [];
        $influencerConfig = is_array($economy['influencer'] ?? null) ? $economy['influencer'] : [];
        $influencerTiers = is_array($influencerConfig['tiers'] ?? null) ? $influencerConfig['tiers'] : [];
        $influencerDurationMultipliers = is_array($influencerConfig['duration_multipliers'] ?? null)
            ? $influencerConfig['duration_multipliers']
            : [];
        $conversion = is_array($economy['conversion'] ?? null)
            ? $economy['conversion']
            : ['profit_per_ai_token' => 0, 'min_profit' => 0];
        $economyEditor = [
            'profit_per_visitor_min' => (int) ($profitPerVisitor['min'] ?? 0),
            'profit_per_visitor_max' => (int) ($profitPerVisitor['max'] ?? 0),
            'conversion_profit_per_token' => (int) ($conversion['profit_per_ai_token'] ?? 0),
            'conversion_min_profit' => (int) ($conversion['min_profit'] ?? 0),
            'visitor_purchase_chance_percent' => (int) ($economy['visitor_purchase_chance_percent'] ?? 0),
            'passive_visitor_interval_seconds' => (int) ($economy['passive_visitor_interval_seconds'] ?? 0),
            'target_profit_percent' => (int) ($economy['target_profit_percent'] ?? 60),
        ];
        $influencerEditor = [];
        foreach (['nano', 'micro', 'macro', 'mega'] as $tier) {
            $tierConfig = is_array($influencerTiers[$tier] ?? null) ? $influencerTiers[$tier] : [];
            $boostRange = is_array($tierConfig['boost_percent_range'] ?? null)
                ? $tierConfig['boost_percent_range']
                : ['min' => 0, 'max' => 0];

            $influencerEditor[$tier] = [
                'token_per_day' => (int) ($tierConfig['token_per_day'] ?? 0),
                'boost_min_percent' => (int) ($boostRange['min'] ?? 0),
                'boost_max_percent' => (int) ($boostRange['max'] ?? 0),
            ];
        }
        $influencerDurationEditor = [
            'duration_default_hours' => (int) ($influencerConfig['duration_default_hours'] ?? AIpreneurPricingService::DEFAULT_ECONOMY_RULES['influencer_duration_default_hours']),
            'marketing_boost_cap_percent' => (int) ($influencerConfig['marketing_boost_cap_percent'] ?? AIpreneurPricingService::DEFAULT_ECONOMY_RULES['influencer_marketing_boost_cap_percent']),
            '1h_percent' => (int) ($influencerDurationMultipliers['1h_percent'] ?? AIpreneurPricingService::DEFAULT_INFLUENCER_DURATION_MULTIPLIERS_PERCENT['1h']),
            '6h_percent' => (int) ($influencerDurationMultipliers['6h_percent'] ?? AIpreneurPricingService::DEFAULT_INFLUENCER_DURATION_MULTIPLIERS_PERCENT['6h']),
            '12h_percent' => (int) ($influencerDurationMultipliers['12h_percent'] ?? AIpreneurPricingService::DEFAULT_INFLUENCER_DURATION_MULTIPLIERS_PERCENT['12h']),
            '24h_percent' => (int) ($influencerDurationMultipliers['24h_percent'] ?? AIpreneurPricingService::DEFAULT_INFLUENCER_DURATION_MULTIPLIERS_PERCENT['24h']),
            '72h_percent' => (int) ($influencerDurationMultipliers['72h_percent'] ?? AIpreneurPricingService::DEFAULT_INFLUENCER_DURATION_MULTIPLIERS_PERCENT['72h']),
            '168h_percent' => (int) ($influencerDurationMultipliers['168h_percent'] ?? AIpreneurPricingService::DEFAULT_INFLUENCER_DURATION_MULTIPLIERS_PERCENT['168h']),
        ];
        $rewardItems = StoreItem::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->limit(30)
            ->get(['id', 'name', 'price_coins', 'image_url', 'stock', 'is_active']);
        $featureAccess = $pricingService->getFeatureAccessSettings();

        return view('superadmin.pricing', [
            'superadmin' => $request->attributes->get('superadmin'),
            'packages' => $packages,
            'rules' => $rules,
            'popularityRanges' => $popularityRanges,
            'stats' => $stats,
            'catalog' => $catalog,
            'economy' => $economy,
            'economyEditor' => $economyEditor,
            'profitPerVisitor' => $profitPerVisitor,
            'popularityPreview' => $popularityPreview,
            'influencerTiers' => $influencerTiers,
            'influencerEditor' => $influencerEditor,
            'influencerDurationEditor' => $influencerDurationEditor,
            'conversion' => $conversion,
            'rewardItems' => $rewardItems,
            'featureAccess' => $featureAccess,
        ]);
    }

    public function storePricingPackage(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:100|regex:/^[a-z0-9_]+$/|unique:aipreneur_pricing_packages,code',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'package_type' => 'required|string|in:ai_tokens',
            'tokens_amount' => 'required|integer|min:1|max:1000000',
            'bonus_tokens' => 'nullable|integer|min:0|max:1000000',
            'price_rm' => 'required|numeric|min:0.01|max:1000000',
            'original_price_rm' => 'nullable|numeric|min:0.01|max:1000000',
            'badge' => 'nullable|string|in:none,popular,best_value',
            'sort_order' => 'nullable|integer|min:0|max:100000',
        ]);

        $superadmin = $request->attributes->get('superadmin');

        AIpreneurPricingPackage::query()->create([
            'code' => $validated['code'],
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'package_type' => $validated['package_type'],
            'tokens_amount' => (int) $validated['tokens_amount'],
            'bonus_tokens' => (int) ($validated['bonus_tokens'] ?? 0),
            'price_rm' => (float) $validated['price_rm'],
            'original_price_rm' => $validated['original_price_rm'] ?? null,
            'badge' => $validated['badge'] ?? 'none',
            'is_active' => $request->boolean('is_active', true),
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'created_by' => $superadmin?->id,
            'updated_by' => $superadmin?->id,
        ]);

        return redirect()
            ->route('superadmin.pricing')
            ->with('status', 'Pricing package created.');
    }

    public function updatePricingPackage(Request $request, string $packageId): RedirectResponse
    {
        $package = AIpreneurPricingPackage::query()->where('id', $packageId)->firstOrFail();

        $validated = $request->validate([
            'code' => 'required|string|max:100|regex:/^[a-z0-9_]+$/|unique:aipreneur_pricing_packages,code,' . $package->id,
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'package_type' => 'required|string|in:ai_tokens',
            'tokens_amount' => 'required|integer|min:1|max:1000000',
            'bonus_tokens' => 'nullable|integer|min:0|max:1000000',
            'price_rm' => 'required|numeric|min:0.01|max:1000000',
            'original_price_rm' => 'nullable|numeric|min:0.01|max:1000000',
            'badge' => 'nullable|string|in:none,popular,best_value',
            'sort_order' => 'nullable|integer|min:0|max:100000',
        ]);

        $superadmin = $request->attributes->get('superadmin');

        $package->fill([
            'code' => $validated['code'],
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'package_type' => $validated['package_type'],
            'tokens_amount' => (int) $validated['tokens_amount'],
            'bonus_tokens' => (int) ($validated['bonus_tokens'] ?? 0),
            'price_rm' => (float) $validated['price_rm'],
            'original_price_rm' => $validated['original_price_rm'] ?? null,
            'badge' => $validated['badge'] ?? 'none',
            'is_active' => $request->boolean('is_active'),
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'updated_by' => $superadmin?->id,
        ]);
        $package->save();

        return redirect()
            ->route('superadmin.pricing')
            ->with('status', 'Pricing package updated.');
    }

    public function deletePricingPackage(Request $request, string $packageId): RedirectResponse
    {
        $package = AIpreneurPricingPackage::query()->where('id', $packageId)->firstOrFail();

        if ($package->is_active && AIpreneurPricingPackage::query()->where('is_active', true)->count() <= 1) {
            return redirect()
                ->route('superadmin.pricing')
                ->with('error', 'At least one active package is required.');
        }

        $package->delete();

        return redirect()
            ->route('superadmin.pricing')
            ->with('status', 'Pricing package deleted.');
    }

    public function storePricingRule(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'operation_key' => 'required|string|max:120|regex:/^[a-z0-9_]+$/|unique:aipreneur_pricing_rules,operation_key',
            'operation_name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'token_cost' => 'required|integer|min:0|max:1000000',
            'sort_order' => 'nullable|integer|min:0|max:100000',
        ]);

        $superadmin = $request->attributes->get('superadmin');

        AIpreneurPricingRule::query()->create([
            'operation_key' => $validated['operation_key'],
            'operation_name' => $validated['operation_name'],
            'description' => $validated['description'] ?? null,
            'token_cost' => (int) $validated['token_cost'],
            'metadata' => null,
            'is_active' => $request->boolean('is_active', true),
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'created_by' => $superadmin?->id,
            'updated_by' => $superadmin?->id,
        ]);

        return redirect()
            ->route('superadmin.pricing')
            ->with('status', 'Pricing rule created.');
    }

    public function updatePricingRule(Request $request, string $ruleId): RedirectResponse
    {
        $rule = AIpreneurPricingRule::query()->where('id', $ruleId)->firstOrFail();

        $validated = $request->validate([
            'operation_key' => 'required|string|max:120|regex:/^[a-z0-9_]+$/|unique:aipreneur_pricing_rules,operation_key,' . $rule->id,
            'operation_name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'token_cost' => 'required|integer|min:0|max:1000000',
            'sort_order' => 'nullable|integer|min:0|max:100000',
        ]);

        $superadmin = $request->attributes->get('superadmin');

        $rule->fill([
            'operation_key' => $validated['operation_key'],
            'operation_name' => $validated['operation_name'],
            'description' => $validated['description'] ?? null,
            'token_cost' => (int) $validated['token_cost'],
            'is_active' => $request->boolean('is_active'),
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'updated_by' => $superadmin?->id,
        ]);
        $rule->save();

        return redirect()
            ->route('superadmin.pricing')
            ->with('status', 'Pricing rule updated.');
    }

    public function deletePricingRule(Request $request, string $ruleId): RedirectResponse
    {
        $rule = AIpreneurPricingRule::query()->where('id', $ruleId)->firstOrFail();
        $rule->delete();

        return redirect()
            ->route('superadmin.pricing')
            ->with('status', 'Pricing rule deleted.');
    }

    public function updatePricingEconomySettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'profit_per_visitor_min' => 'sometimes|integer|min:0|max:100000',
            'profit_per_visitor_max' => 'sometimes|integer|min:0|max:100000',
            'conversion_profit_per_token' => 'sometimes|integer|min:1|max:1000000',
            'conversion_min_profit' => 'sometimes|integer|min:1|max:1000000',
            'visitor_purchase_chance_percent' => 'sometimes|integer|min:1|max:100',
            'passive_visitor_interval_seconds' => 'sometimes|integer|min:15|max:3600',
            'target_profit_percent' => 'nullable|integer|min:5|max:95',
            'influencer_duration_default_hours' => 'sometimes|integer|min:1|max:168',
            'influencer_marketing_boost_cap_percent' => 'sometimes|integer|min:0|max:500',
            'influencer_duration_multiplier_1h_percent' => 'sometimes|integer|min:1|max:1000000',
            'influencer_duration_multiplier_6h_percent' => 'sometimes|integer|min:1|max:1000000',
            'influencer_duration_multiplier_12h_percent' => 'sometimes|integer|min:1|max:1000000',
            'influencer_duration_multiplier_24h_percent' => 'sometimes|integer|min:1|max:1000000',
            'influencer_duration_multiplier_72h_percent' => 'sometimes|integer|min:1|max:1000000',
            'influencer_duration_multiplier_168h_percent' => 'sometimes|integer|min:1|max:1000000',
            'influencer_token_per_day_nano' => 'sometimes|integer|min:1|max:1000000',
            'influencer_token_per_day_micro' => 'sometimes|integer|min:1|max:1000000',
            'influencer_token_per_day_macro' => 'sometimes|integer|min:1|max:1000000',
            'influencer_token_per_day_mega' => 'sometimes|integer|min:1|max:1000000',
            'influencer_boost_min_nano' => 'sometimes|integer|min:0|max:500',
            'influencer_boost_max_nano' => 'sometimes|integer|min:0|max:500',
            'influencer_boost_min_micro' => 'sometimes|integer|min:0|max:500',
            'influencer_boost_max_micro' => 'sometimes|integer|min:0|max:500',
            'influencer_boost_min_macro' => 'sometimes|integer|min:0|max:500',
            'influencer_boost_max_macro' => 'sometimes|integer|min:0|max:500',
            'influencer_boost_min_mega' => 'sometimes|integer|min:0|max:500',
            'influencer_boost_max_mega' => 'sometimes|integer|min:0|max:500',
        ]);

        if (count($validated) === 0) {
            return redirect()
                ->route('superadmin.pricing')
                ->with('error', 'No economy changes were submitted.');
        }

        $pricingService = app(AIpreneurPricingService::class);

        $currentProfitRange = $pricingService->getProfitPerVisitorRange();
        $profitMin = array_key_exists('profit_per_visitor_min', $validated)
            ? (int) $validated['profit_per_visitor_min']
            : (int) ($currentProfitRange['min'] ?? 0);
        $profitMax = array_key_exists('profit_per_visitor_max', $validated)
            ? (int) $validated['profit_per_visitor_max']
            : (int) ($currentProfitRange['max'] ?? 0);

        if ($profitMax < $profitMin) {
            return redirect()
                ->route('superadmin.pricing')
                ->with('error', 'Profit-per-visitor max must be greater than or equal to min.');
        }

        foreach (['nano', 'micro', 'macro', 'mega'] as $tier) {
            $currentBoostRange = $pricingService->getInfluencerBoostPercentRange($tier);
            $minKey = "influencer_boost_min_{$tier}";
            $maxKey = "influencer_boost_max_{$tier}";
            $boostMin = array_key_exists($minKey, $validated)
                ? (int) $validated[$minKey]
                : (int) ($currentBoostRange['min'] ?? 0);
            $boostMax = array_key_exists($maxKey, $validated)
                ? (int) $validated[$maxKey]
                : (int) ($currentBoostRange['max'] ?? 0);

            if ($boostMax < $boostMin) {
                return redirect()
                    ->route('superadmin.pricing')
                    ->with('error', ucfirst($tier) . ' boost max must be greater than or equal to min.');
            }
        }

        $superadmin = $request->attributes->get('superadmin');
        $superadminId = $superadmin?->id;

        if (array_key_exists('profit_per_visitor_min', $validated)) {
            $this->upsertPricingRuleValue(
                'economy_profit_per_visitor_min',
                (int) $validated['profit_per_visitor_min'],
                'Economy: Profit Per Visitor (Min)',
                'Minimum simulated profit value per converted visitor.',
                500,
                $superadminId
            );
        }
        if (array_key_exists('profit_per_visitor_max', $validated)) {
            $this->upsertPricingRuleValue(
                'economy_profit_per_visitor_max',
                (int) $validated['profit_per_visitor_max'],
                'Economy: Profit Per Visitor (Max)',
                'Maximum simulated profit value per converted visitor.',
                510,
                $superadminId
            );
        }
        if (array_key_exists('conversion_profit_per_token', $validated)) {
            $this->upsertPricingRuleValue(
                'economy_conversion_profit_per_token',
                (int) $validated['conversion_profit_per_token'],
                'Economy: Profit To AI Token Rate',
                'Profit required to mint 1 AI token.',
                660,
                $superadminId
            );
        }
        if (array_key_exists('conversion_min_profit', $validated)) {
            $this->upsertPricingRuleValue(
                'economy_conversion_min_profit',
                (int) $validated['conversion_min_profit'],
                'Economy: Minimum Convertible Profit',
                'Minimum profit amount allowed for conversion.',
                670,
                $superadminId
            );
        }
        if (array_key_exists('visitor_purchase_chance_percent', $validated)) {
            $this->upsertPricingRuleValue(
                'economy_visitor_purchase_chance_percent',
                (int) $validated['visitor_purchase_chance_percent'],
                'Economy: Visitor Purchase Chance (%)',
                'Chance that a passive visitor converts into a sale tick.',
                520,
                $superadminId
            );
        }
        if (array_key_exists('passive_visitor_interval_seconds', $validated)) {
            $this->upsertPricingRuleValue(
                'economy_passive_visitor_interval_seconds',
                (int) $validated['passive_visitor_interval_seconds'],
                'Economy: Passive Visitor Interval (Seconds)',
                'Interval for passive visitor recording while shift is open.',
                530,
                $superadminId
            );
        }

        if (array_key_exists('target_profit_percent', $validated) && $validated['target_profit_percent'] !== null) {
            $this->upsertPricingRuleValue(
                'economy_target_profit_percent',
                (int) $validated['target_profit_percent'],
                'Economy: Target Profit Percent',
                'Target net-profit capture percentage used by preset.',
                675,
                $superadminId
            );
        }

        $influencerTierSortOrders = [
            'nano' => 610,
            'micro' => 620,
            'macro' => 630,
            'mega' => 640,
        ];
        $influencerBoostSortOrders = [
            'nano' => ['min' => 700, 'max' => 701],
            'micro' => ['min' => 702, 'max' => 703],
            'macro' => ['min' => 704, 'max' => 705],
            'mega' => ['min' => 706, 'max' => 707],
        ];

        foreach (['nano', 'micro', 'macro', 'mega'] as $tier) {
            $tierKey = "influencer_token_per_day_{$tier}";
            if (array_key_exists($tierKey, $validated)) {
                $this->upsertPricingRuleValue(
                    "influencer_{$tier}",
                    (int) $validated[$tierKey],
                    'Influencer Tier: ' . ucfirst($tier) . ' Token / Day',
                    'Daily AI token cost for ' . $tier . ' influencer campaigns.',
                    $influencerTierSortOrders[$tier],
                    $superadminId
                );
            }

            $boostMinKey = "influencer_boost_min_{$tier}";
            if (array_key_exists($boostMinKey, $validated)) {
                $this->upsertPricingRuleValue(
                    "influencer_popularity_boost_{$tier}_min_percent",
                    (int) $validated[$boostMinKey],
                    'Influencer Boost: ' . ucfirst($tier) . ' Min (%)',
                    'Minimum popularity boost percentage for ' . $tier . ' tier.',
                    $influencerBoostSortOrders[$tier]['min'],
                    $superadminId
                );
            }

            $boostMaxKey = "influencer_boost_max_{$tier}";
            if (array_key_exists($boostMaxKey, $validated)) {
                $this->upsertPricingRuleValue(
                    "influencer_popularity_boost_{$tier}_max_percent",
                    (int) $validated[$boostMaxKey],
                    'Influencer Boost: ' . ucfirst($tier) . ' Max (%)',
                    'Maximum popularity boost percentage for ' . $tier . ' tier.',
                    $influencerBoostSortOrders[$tier]['max'],
                    $superadminId
                );
            }
        }

        if (array_key_exists('influencer_duration_default_hours', $validated)) {
            $this->upsertPricingRuleValue(
                'influencer_duration_default_hours',
                (int) $validated['influencer_duration_default_hours'],
                'Influencer Duration Default (Hours)',
                'Default campaign duration in hours.',
                750,
                $superadminId
            );
        }

        $durationMultiplierFields = [
            'influencer_duration_multiplier_1h_percent' => ['label' => '1h', 'sort' => 760],
            'influencer_duration_multiplier_6h_percent' => ['label' => '6h', 'sort' => 761],
            'influencer_duration_multiplier_12h_percent' => ['label' => '12h', 'sort' => 762],
            'influencer_duration_multiplier_24h_percent' => ['label' => '24h', 'sort' => 763],
            'influencer_duration_multiplier_72h_percent' => ['label' => '72h', 'sort' => 764],
            'influencer_duration_multiplier_168h_percent' => ['label' => '168h', 'sort' => 765],
        ];
        foreach ($durationMultiplierFields as $field => $meta) {
            if (!array_key_exists($field, $validated)) {
                continue;
            }

            $this->upsertPricingRuleValue(
                $field,
                (int) $validated[$field],
                'Influencer Duration Multiplier: ' . $meta['label'] . ' (%)',
                'Campaign cost multiplier percentage for ' . $meta['label'] . ' influencer duration.',
                $meta['sort'],
                $superadminId
            );
        }

        if (array_key_exists('influencer_marketing_boost_cap_percent', $validated)) {
            $this->upsertPricingRuleValue(
                'influencer_marketing_boost_cap_percent',
                (int) $validated['influencer_marketing_boost_cap_percent'],
                'Influencer Marketing Boost Cap (%)',
                'Maximum total popularity boost from active influencer campaigns.',
                770,
                $superadminId
            );
        }

        return redirect()
            ->route('superadmin.pricing')
            ->with('status', 'Economy settings updated.');
    }

    public function updatePricingFeatureAccess(Request $request): RedirectResponse
    {
        $validationRules = [];
        foreach (array_keys(AIpreneurPricingService::FREE_ACCESS_FEATURES) as $featureKey) {
            $validationRules[$featureKey] = 'nullable|boolean';
        }

        $request->validate($validationRules);

        $superadmin = $request->attributes->get('superadmin');
        $superadminId = $superadmin?->id;

        foreach (AIpreneurPricingService::FREE_ACCESS_FEATURES as $featureKey => $meta) {
            $this->upsertSystemConfigValue(
                (string) $meta['config_key'],
                $request->boolean($featureKey),
                (string) $meta['description'],
                'gameplay',
                'boolean',
                $superadminId,
                false
            );
        }

        return redirect()
            ->route('superadmin.pricing')
            ->with('status', 'Free feature access updated.');
    }

    public function storePopularityRange(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'min_popularity' => 'required|integer|min:1|max:100',
            'max_popularity' => 'required|integer|min:1|max:100|gte:min_popularity',
            'daily_visitors' => 'required|integer|min:1|max:1000',
            'sort_order' => 'nullable|integer|min:0|max:100000',
        ]);

        $overlapExists = AIpreneurPopularityRange::query()
            ->where('is_active', true)
            ->where('min_popularity', '<=', (int) $validated['max_popularity'])
            ->where('max_popularity', '>=', (int) $validated['min_popularity'])
            ->exists();

        if ($overlapExists) {
            return redirect()
                ->route('superadmin.pricing')
                ->with('error', 'Popularity ranges cannot overlap.');
        }

        $superadmin = $request->attributes->get('superadmin');

        AIpreneurPopularityRange::query()->create([
            'min_popularity' => (int) $validated['min_popularity'],
            'max_popularity' => (int) $validated['max_popularity'],
            'daily_visitors' => (int) $validated['daily_visitors'],
            'is_active' => $request->boolean('is_active', true),
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'created_by' => $superadmin?->id,
            'updated_by' => $superadmin?->id,
        ]);

        return redirect()
            ->route('superadmin.pricing')
            ->with('status', 'Popularity range created.');
    }

    public function updatePopularityRange(Request $request, string $rangeId): RedirectResponse
    {
        $range = AIpreneurPopularityRange::query()->where('id', $rangeId)->firstOrFail();

        $validated = $request->validate([
            'min_popularity' => 'required|integer|min:1|max:100',
            'max_popularity' => 'required|integer|min:1|max:100|gte:min_popularity',
            'daily_visitors' => 'required|integer|min:1|max:1000',
            'sort_order' => 'nullable|integer|min:0|max:100000',
        ]);

        $overlapExists = AIpreneurPopularityRange::query()
            ->where('id', '!=', $range->id)
            ->where('is_active', true)
            ->where('min_popularity', '<=', (int) $validated['max_popularity'])
            ->where('max_popularity', '>=', (int) $validated['min_popularity'])
            ->exists();

        if ($overlapExists) {
            return redirect()
                ->route('superadmin.pricing')
                ->with('error', 'Popularity ranges cannot overlap.');
        }

        $newIsActive = $request->boolean('is_active');
        if (!$newIsActive && $range->is_active && AIpreneurPopularityRange::query()->where('is_active', true)->count() <= 1) {
            return redirect()
                ->route('superadmin.pricing')
                ->with('error', 'At least one active popularity range is required.');
        }

        $superadmin = $request->attributes->get('superadmin');
        $range->fill([
            'min_popularity' => (int) $validated['min_popularity'],
            'max_popularity' => (int) $validated['max_popularity'],
            'daily_visitors' => (int) $validated['daily_visitors'],
            'is_active' => $newIsActive,
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'updated_by' => $superadmin?->id,
        ]);
        $range->save();

        return redirect()
            ->route('superadmin.pricing')
            ->with('status', 'Popularity range updated.');
    }

    public function deletePopularityRange(Request $request, string $rangeId): RedirectResponse
    {
        $range = AIpreneurPopularityRange::query()->where('id', $rangeId)->firstOrFail();

        if ($range->is_active && AIpreneurPopularityRange::query()->where('is_active', true)->count() <= 1) {
            return redirect()
                ->route('superadmin.pricing')
                ->with('error', 'At least one active popularity range is required.');
        }

        $range->delete();

        return redirect()
            ->route('superadmin.pricing')
            ->with('status', 'Popularity range deleted.');
    }

    public function applyPricingPreset(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'target_profit_percent' => 'required|integer|min:5|max:95',
        ]);

        $targetProfitPercent = (int) $validated['target_profit_percent'];
        $superadmin = $request->attributes->get('superadmin');
        $superadminId = $superadmin?->id;

        $profitFactor = $targetProfitPercent / 60;
        $tokenScale = max(0.6, min(2.2, $targetProfitPercent / 60));
        $visitorScale = max(0.45, min(1.4, 1.1 - (($targetProfitPercent - 50) / 100)));

        $profitMin = (int) round(max(1, min(40, 2 * $profitFactor)));
        $profitMax = (int) round(max($profitMin + 1, min(90, 8 * $profitFactor)));
        $purchaseChance = (int) round(max(15, min(80, 55 - (($targetProfitPercent - 60) * 0.6))));
        $passiveIntervalSeconds = (int) round(max(60, min(900, 240 + (($targetProfitPercent - 60) * 6))));
        $conversionRate = (int) round(max(8, min(150, 25 * $profitFactor)));

        $this->upsertPricingRuleValue('economy_target_profit_percent', $targetProfitPercent, 'Economy: Target Profit Percent', 'Target net-profit capture percentage used by preset.', 675, $superadminId);
        $this->upsertPricingRuleValue('economy_profit_per_visitor_min', $profitMin, 'Economy: Profit Per Visitor (Min)', 'Minimum simulated profit value per converted visitor.', 500, $superadminId);
        $this->upsertPricingRuleValue('economy_profit_per_visitor_max', $profitMax, 'Economy: Profit Per Visitor (Max)', 'Maximum simulated profit value per converted visitor.', 510, $superadminId);
        $this->upsertPricingRuleValue('economy_visitor_purchase_chance_percent', $purchaseChance, 'Economy: Visitor Purchase Chance (%)', 'Chance that a passive visitor converts into a sale tick.', 520, $superadminId);
        $this->upsertPricingRuleValue('economy_passive_visitor_interval_seconds', $passiveIntervalSeconds, 'Economy: Passive Visitor Interval (Seconds)', 'Interval for passive visitor recording while shift is open.', 530, $superadminId);
        $this->upsertPricingRuleValue('economy_conversion_profit_per_token', $conversionRate, 'Economy: Profit To AI Token Rate', 'Profit required to mint 1 AI token.', 660, $superadminId);
        $this->upsertPricingRuleValue('economy_conversion_min_profit', $conversionRate, 'Economy: Minimum Convertible Profit', 'Minimum profit amount allowed for conversion.', 670, $superadminId);

        foreach (AIpreneurPricingService::DEFAULT_TOKEN_COSTS as $operationKey => $defaultCost) {
            $scaled = (int) round($defaultCost * $tokenScale);
            $this->upsertPricingRuleValue($operationKey, max($defaultCost > 0 ? 1 : 0, $scaled), null, null, null, $superadminId);
        }

        foreach (AIpreneurPricingService::DEFAULT_INFLUENCER_TIER_COSTS as $tier => $defaultCost) {
            $scaled = (int) round($defaultCost * $tokenScale);
            $this->upsertPricingRuleValue("influencer_{$tier}", max(1, $scaled), null, null, null, $superadminId);
        }

        $this->upsertPricingRuleValue('staff_hire', max(1, (int) round(AIpreneurPricingService::DEFAULT_STAFF_HIRE_COST * $tokenScale)), null, null, null, $superadminId);
        $this->upsertPricingRuleValue('innovation_upgrade_step', max(1, (int) round(AIpreneurPricingService::DEFAULT_INNOVATION_UPGRADE_STEP_COST * $tokenScale)), null, null, null, $superadminId);

        $pricingService = app(AIpreneurPricingService::class);
        $bracketSize = max(1, $pricingService->getPopularityBracketSize());
        $baseVisitors = max(1, $pricingService->getDailyVisitorsBase());
        $incrementPerBracket = max(0, $pricingService->getDailyVisitorsIncrementPerBracket());

        $ranges = AIpreneurPopularityRange::query()
            ->orderBy('sort_order')
            ->orderBy('min_popularity')
            ->get();

        $maxVisitors = 1;
        foreach ($ranges as $range) {
            $midpointPopularity = (int) floor(((int) $range->min_popularity + (int) $range->max_popularity) / 2);
            $bracket = (int) ceil(max(1, $midpointPopularity) / $bracketSize);
            $baselineVisitors = max(1, $baseVisitors + max(0, $bracket - 1) * $incrementPerBracket);
            $scaledVisitors = max(1, (int) round($baselineVisitors * $visitorScale));
            $range->daily_visitors = $scaledVisitors;
            $range->updated_by = $superadminId;
            $range->save();
            $maxVisitors = max($maxVisitors, $scaledVisitors);
        }

        $this->upsertPricingRuleValue(
            'economy_daily_visitors_cap',
            max(10, $maxVisitors + 25),
            'Economy: Daily Visitors Cap',
            'Maximum daily visitor budget before bonuses.',
            570,
            $superadminId
        );

        return redirect()
            ->route('superadmin.pricing')
            ->with('status', "Profit preset applied at {$targetProfitPercent}% target.");
    }

    public function settings(Request $request): View
    {
        $settings = SystemConfig::query()
            ->orderBy('category')
            ->orderBy('config_key')
            ->paginate(40);

        $openaiStats = $this->getOpenAIStats();
        $openaiLogs = OpenAIUsageLog::query()
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        return view('superadmin.settings', [
            'superadmin' => $request->attributes->get('superadmin'),
            'settings' => $settings,
            'openaiStats' => $openaiStats,
            'openaiLogs' => $openaiLogs,
        ]);
    }

    public function updateAccount(Request $request): RedirectResponse
    {
        $superadmin = $request->attributes->get('superadmin');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $superadmin->id,
            'current_password' => 'nullable|string',
            'new_password' => 'nullable|string|min:8|confirmed',
        ]);

        $superadmin->name = $validated['name'];
        $superadmin->email = $validated['email'];

        if (!empty($validated['new_password'])) {
            if (empty($validated['current_password']) || !Hash::check($validated['current_password'], $superadmin->password_hash)) {
                return back()->with('error', 'Current password is incorrect.');
            }
            $superadmin->password_hash = Hash::make($validated['new_password']);
        }

        $superadmin->save();

        return back()->with('status', 'Account updated successfully.');
    }

    public function updateSettings(Request $request): RedirectResponse
    {
        $request->validate([
            'settings' => 'array',
        ]);

        $settings = $request->input('settings', []);
        $updated = 0;
        $failed = [];
        $superadmin = $request->attributes->get('superadmin');

        foreach ($settings as $configKey => $rawValue) {
            $config = SystemConfig::where('config_key', $configKey)->first();
            if (!$config) {
                continue;
            }

            try {
                $config->config_value = $this->parseConfigValue($config, (string) $rawValue);
                $config->updated_at = now();
                $config->updated_by = $superadmin?->id;
                $config->save();
                $updated++;
            } catch (\Throwable $exception) {
                $failed[] = $configKey;
            }
        }

        if (!empty($failed)) {
            return redirect()
                ->route('superadmin.settings')
                ->with('error', 'Some settings were not saved: ' . implode(', ', $failed));
        }

        return redirect()
            ->route('superadmin.settings')
            ->with('status', "Settings updated ({$updated}).");
    }

    // ─── Academy ──────────────────────────────────────────────

    public function academy(Request $request): View
    {
        $classes = AIpreneurClass::query()
            ->with(['slots.bookings'])
            ->orderByDesc('created_at')
            ->get();

        $bookings = AIpreneurClassBooking::query()
            ->with(['slot.course', 'student', 'parent'])
            ->orderByDesc('created_at')
            ->paginate(20);

        return view('superadmin.academy', [
            'superadmin' => $request->attributes->get('superadmin'),
            'classes' => $classes,
            'bookings' => $bookings,
        ]);
    }

    public function storeClass(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'description' => 'nullable|string',
            'level' => 'nullable|string|max:50',
            'price' => 'nullable|numeric|min:0',
            'duration_minutes' => 'nullable|integer|min:1',
            'cover_image_url' => 'nullable|url',
        ]);

        AIpreneurClass::create([
            'title' => $validated['title'],
            'category' => $validated['category'],
            'description' => $validated['description'] ?? null,
            'level' => $validated['level'] ?? 'Beginner',
            'price' => $validated['price'] ?? 0,
            'duration_minutes' => $validated['duration_minutes'] ?? 60,
            'cover_image_url' => $validated['cover_image_url'] ?? null,
            'is_active' => true,
        ]);

        return back()->with('status', 'Class created successfully.');
    }

    public function updateClass(Request $request, string $classId): RedirectResponse
    {
        $class = AIpreneurClass::findOrFail($classId);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'level' => 'nullable|string|max:50',
            'price' => 'nullable|numeric|min:0',
            'duration_minutes' => 'nullable|integer|min:1',
            'is_active' => 'nullable',
        ]);

        $class->title = $validated['title'];
        if (isset($validated['category'])) $class->category = $validated['category'];
        if (array_key_exists('description', $validated)) $class->description = $validated['description'];
        if (isset($validated['level'])) $class->level = $validated['level'];
        if (isset($validated['price'])) $class->price = $validated['price'];
        if (isset($validated['duration_minutes'])) $class->duration_minutes = $validated['duration_minutes'];
        $class->is_active = $request->has('is_active');
        $class->save();

        return back()->with('status', 'Class updated successfully.');
    }

    public function deleteClass(string $classId): RedirectResponse
    {
        $class = AIpreneurClass::findOrFail($classId);

        $hasBookings = AIpreneurClassBooking::whereHas('slot', function ($q) use ($classId) {
            $q->where('class_id', $classId);
        })->exists();

        if ($hasBookings) {
            return back()->with('error', 'Cannot delete class with existing bookings.');
        }

        AIpreneurClassSlot::where('class_id', $classId)->delete();
        $class->delete();

        return back()->with('status', 'Class deleted successfully.');
    }

    public function storeSlot(Request $request, string $classId): RedirectResponse
    {
        AIpreneurClass::findOrFail($classId);

        $validated = $request->validate([
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'capacity' => 'nullable|integer|min:1',
            'location' => 'nullable|string|max:255',
        ]);

        AIpreneurClassSlot::create([
            'class_id' => $classId,
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'capacity' => $validated['capacity'] ?? 20,
            'location' => $validated['location'] ?? null,
            'status' => 'open',
        ]);

        return back()->with('status', 'Time slot added successfully.');
    }

    public function updateSlot(Request $request, string $slotId): RedirectResponse
    {
        $slot = AIpreneurClassSlot::findOrFail($slotId);

        $validated = $request->validate([
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'capacity' => 'nullable|integer|min:1',
            'location' => 'nullable|string|max:255',
            'status' => 'nullable|in:open,full,closed',
        ]);

        $slot->start_time = $validated['start_time'];
        $slot->end_time = $validated['end_time'];
        if (isset($validated['capacity'])) $slot->capacity = $validated['capacity'];
        $slot->location = $validated['location'] ?? null;
        if (isset($validated['status'])) $slot->status = $validated['status'];
        $slot->save();

        return back()->with('status', 'Time slot updated successfully.');
    }

    public function deleteSlot(string $slotId): RedirectResponse
    {
        $slot = AIpreneurClassSlot::findOrFail($slotId);

        if (AIpreneurClassBooking::where('slot_id', $slotId)->exists()) {
            return back()->with('error', 'Cannot delete slot with existing bookings.');
        }

        $slot->delete();

        return back()->with('status', 'Time slot deleted successfully.');
    }

    // ─── Helpers ──────────────────────────────────────────────

    private function upsertPricingRuleValue(
        string $operationKey,
        int $tokenCost,
        ?string $operationName = null,
        ?string $description = null,
        ?int $sortOrder = null,
        ?string $superadminId = null
    ): void {
        $rule = AIpreneurPricingRule::query()
            ->where('operation_key', $operationKey)
            ->first();

        if (!$rule) {
            $rule = new AIpreneurPricingRule();
            $rule->operation_key = $operationKey;
            $rule->operation_name = $operationName ?? ucwords(str_replace('_', ' ', $operationKey));
            $rule->description = $description;
            $rule->sort_order = $sortOrder ?? 900;
            $rule->created_by = $superadminId;
        } else {
            if ($operationName !== null) {
                $rule->operation_name = $operationName;
            }
            if ($description !== null) {
                $rule->description = $description;
            }
            if ($sortOrder !== null) {
                $rule->sort_order = $sortOrder;
            }
        }

        $rule->token_cost = max(0, $tokenCost);
        $rule->is_active = true;
        $rule->updated_by = $superadminId;
        $rule->save();
    }

    private function upsertSystemConfigValue(
        string $configKey,
        mixed $configValue,
        ?string $description,
        string $category,
        string $dataType,
        ?string $superadminId = null,
        mixed $defaultValue = null
    ): void {
        $config = SystemConfig::query()->firstOrNew([
            'config_key' => $configKey,
        ]);

        if (!$config->exists) {
            $config->id = (string) \Illuminate\Support\Str::uuid();
        }

        $config->category = $category;
        $config->data_type = $dataType;
        $config->description = $description;
        $config->default_value = $defaultValue;
        $config->config_value = $configValue;
        $config->updated_at = now();
        $config->updated_by = $superadminId;
        $config->save();
    }

    protected function parseConfigValue(SystemConfig $config, string $rawValue)
    {
        return match ($config->data_type) {
            'boolean' => filter_var($rawValue, FILTER_VALIDATE_BOOLEAN),
            'number' => is_numeric($rawValue) ? (float) $rawValue : 0,
            'string' => $rawValue,
            'json' => json_decode($rawValue, true, 512, JSON_THROW_ON_ERROR),
            default => $rawValue,
        };
    }

    protected function buildCombinedOrders(int $limit): Collection
    {
        $wpaySource = $this->wpaySource();

        $walletOrders = WPayTransaction::query()
            ->where('app_source', $wpaySource)
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(function (WPayTransaction $row) {
                return [
                    'source' => 'WPay',
                    'order_id' => $row->order_id,
                    'customer' => $row->email,
                    'amount' => (float) $row->amount,
                    'status' => $row->status,
                    'created_at' => $row->created_at,
                ];
            });

        $tokenOrders = AIGeniusPurchase::query()
            ->with('student')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(function (AIGeniusPurchase $row) {
                return [
                    'source' => 'AI Tokens',
                    'order_id' => $row->order_id,
                    'customer' => $row->student?->genius_name ?? $row->student_id,
                    'amount' => (float) $row->amount_paid,
                    'status' => $row->status,
                    'created_at' => $row->created_at,
                ];
            });

        $classBookings = AIpreneurClassBooking::query()
            ->with('student')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(function (AIpreneurClassBooking $row) {
                return [
                    'source' => 'Workshop',
                    'order_id' => $row->order_id,
                    'customer' => $row->customer_name ?: ($row->student?->genius_name ?? $row->student_id),
                    'amount' => (float) $row->amount,
                    'status' => $row->payment_status,
                    'created_at' => $row->created_at,
                ];
            });

        return collect([$walletOrders, $tokenOrders, $classBookings])
            ->flatten(1)
            ->sortByDesc('created_at')
            ->take($limit)
            ->values();
    }

    protected function getOpenAIStats(): array
    {
        $today = now()->startOfDay();
        $monthStart = now()->startOfMonth();

        try {
            $todayCalls = OpenAIUsageLog::where('created_at', '>=', $today)->count();
            $todayTokens = (int) OpenAIUsageLog::where('created_at', '>=', $today)->sum('total_tokens');
            $monthCalls = OpenAIUsageLog::where('created_at', '>=', $monthStart)->count();
            $monthTokens = (int) OpenAIUsageLog::where('created_at', '>=', $monthStart)->sum('total_tokens');
            $totalCalls = OpenAIUsageLog::count();
            $totalTokens = (int) OpenAIUsageLog::sum('total_tokens');
            $totalCost = (float) OpenAIUsageLog::sum('estimated_cost_usd');

            $byService = OpenAIUsageLog::query()
                ->select('service', DB::raw('COUNT(*) as count'), DB::raw('SUM(total_tokens) as tokens'))
                ->groupBy('service')
                ->orderByDesc('count')
                ->get();
        } catch (\Throwable) {
            return [
                'today_calls' => 0, 'today_tokens' => 0,
                'month_calls' => 0, 'month_tokens' => 0,
                'total_calls' => 0, 'total_tokens' => 0,
                'total_cost' => 0, 'by_service' => [],
            ];
        }

        return [
            'today_calls' => $todayCalls,
            'today_tokens' => $todayTokens,
            'month_calls' => $monthCalls,
            'month_tokens' => $monthTokens,
            'total_calls' => $totalCalls,
            'total_tokens' => $totalTokens,
            'total_cost' => $totalCost,
            'by_service' => $byService,
        ];
    }
}
