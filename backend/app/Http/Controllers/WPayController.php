<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Services\WPayService;

class WPayController extends Controller
{
    protected $wpayService;

    public function __construct(WPayService $wpayService)
    {
        $this->wpayService = $wpayService;
        // CORS is handled by .htaccess - do not duplicate headers here
    }

    protected function resolveAppSource(Request $request): string
    {
        $raw = $request->input('app_source')
            ?? $request->query('app_source')
            ?? $request->header('X-App-Source');

        return $this->wpayService->normalizeAppSource($raw);
    }

    /**
     * @param array<string, mixed> $validated
     * @return array<string, mixed>
     */
    protected function injectAppSource(array $validated, string $appSource): array
    {
        $metadata = is_array($validated['metadata'] ?? null) ? $validated['metadata'] : [];
        $metadata['app_source'] = $appSource;

        $validated['metadata'] = $metadata;
        $validated['app_source'] = $appSource;

        return $validated;
    }


    /**
     * POST /wpay/process
     * 
     * Main endpoint for processing payments from Bolt.
     * 
     * Request body:
     * {
     *   "email": "user@example.com",           // Required: User's email
     *   "payment_category": "topup|checkout",  // Required: Type of payment
     *   "payment_type": "online|wbalance|free", // Required: Payment method
     *   "order_id": "ORD-123456",              // Required: Unique order ID
     *   "amount": 100.00,                      // Required: Transaction amount
     *   "payment_method": "card|fpx|grabpay|tng", // Optional: For online payments
     *   "customer_name": "John Doe",           // Optional: Customer name
     *   "customer_phone": "0123456789",        // Optional: Customer phone
     *   "product_name": "Product Description", // Optional: Product description
     *   "customer_country": "MY",              // Optional: Country code
     *   "metadata": {}                         // Optional: Additional data
     * }
     */
    public function process(Request $request)
    {
        try {
            Log::info('[WPay Controller] Payment process request received', $request->all());

            $validated = $request->validate([
                'email' => 'required|email',
                'payment_category' => 'required|in:topup,checkout',
                'payment_type' => 'required|in:online,wbalance,free',
                'order_id' => 'required|string',
                'amount' => 'required|numeric|min:0',
                'payment_method' => 'nullable|string',
                'customer_name' => 'nullable|string',
                'customer_phone' => 'nullable|string',
                'product_name' => 'nullable|string',
                'customer_country' => 'nullable|string',
                'metadata' => 'nullable|array',
                'app_source' => 'nullable|string|max:64',
            ]);

            $validated = $this->injectAppSource($validated, $this->resolveAppSource($request));
            $result = $this->wpayService->processPayment($validated);

            $statusCode = $result['wpay_status'] === 'success' ? 200 : ($result['wpay_status'] === 'pending' ? 201 : 400);

            return response()->json($result, $statusCode);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('[WPay Controller] Validation error', ['errors' => $e->errors()]);
            return response()->json([
                'wpay_status' => 'failed',
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('[WPay Controller] Process error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'wpay_status' => 'failed',
                'message' => 'Internal server error'
            ], 500);
        }
    }

    /**
     * POST /wpay/callback
     * 
     * Fiuu webhook callback endpoint (server-to-server).
     * This is called by Fiuu after payment is completed.
     */
    public function callback(Request $request)
    {
        try {
            Log::info('[WPay Controller] Fiuu callback received', $request->all());

            $result = $this->wpayService->handleFiuuCallback($request->all());

            if ($result['success']) {
                return response('RECEIVEOK', 200);
            } else {
                return response($result['message'], 400);
            }
        } catch (\Exception $e) {
            Log::error('[WPay Controller] Callback error', [
                'error' => $e->getMessage()
            ]);
            return response('ERROR', 500);
        }
    }

    /**
     * GET|POST /wpay/return
     * 
     * User return URL after payment completion.
     * Redirects user back to Bolt with payment status.
     */
    public function return(Request $request)
    {
        try {
            Log::info('[WPay Controller] Payment return', $request->all());

            $result = $this->wpayService->handleFiuuReturn($request->all());

            // Build redirect URL to Bolt
            $frontendUrl = config('app.frontend_url', 'http://localhost:5173');
            $redirectUrl = $frontendUrl . '/wpay/callback?' . http_build_query([
                'order_id' => $result['order_id'] ?? '',
                'wpay_status' => $result['wpay_status'],
                'email' => $result['email'] ?? '',
                'app_source' => $result['app_source'] ?? null,
            ]);

            Log::info('[WPay Controller] Redirecting to frontend', ['url' => $redirectUrl]);

            return redirect($redirectUrl);
        } catch (\Exception $e) {
            Log::error('[WPay Controller] Return error', [
                'error' => $e->getMessage()
            ]);

            $frontendUrl = config('app.frontend_url', 'http://localhost:5173');
            return redirect($frontendUrl . '/wpay/callback?wpay_status=failed&error=system_error');
        }
    }

    /**
     * GET /wpay/profile/{email}
     * 
     * Get user profile by email.
     */
    public function getProfile(Request $request, string $email)
    {
        try {
            $appSource = $this->resolveAppSource($request);
            $profile = $this->wpayService->getProfile($email, $appSource);

            if (!$profile) {
                return response()->json([
                    'wpay_status' => 'failed',
                    'message' => 'User not found'
                ], 404);
            }

            return response()->json([
                'wpay_status' => 'success',
                'profile' => $profile
            ]);
        } catch (\Exception $e) {
            Log::error('[WPay Controller] Get profile error', [
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'wpay_status' => 'failed',
                'message' => 'Internal server error'
            ], 500);
        }
    }

    /**
     * GET /wpay/transaction/{orderId}
     * 
     * Get transaction details by order ID.
     */
    public function getTransaction(Request $request, string $orderId)
    {
        try {
            $appSource = $this->resolveAppSource($request);
            $transaction = $this->wpayService->getTransaction($orderId, $appSource);

            if (!$transaction) {
                return response()->json([
                    'wpay_status' => 'failed',
                    'message' => 'Transaction not found'
                ], 404);
            }

            return response()->json([
                'wpay_status' => 'success',
                'transaction' => [
                    'id' => $transaction->id,
                    'order_id' => $transaction->order_id,
                    'email' => $transaction->email,
                    'app_source' => $transaction->app_source,
                    'payment_category' => $transaction->payment_category,
                    'payment_type' => $transaction->payment_type,
                    'amount' => (float) $transaction->amount,
                    'status' => $transaction->status,
                    'wbalance_used' => (float) $transaction->wbalance_used,
                    'bonus_used' => (float) $transaction->bonus_used,
                    'stars_awarded' => (int) $transaction->stars_awarded,
                    'completed_at' => $transaction->completed_at,
                    'created_at' => $transaction->created_at,
                ],
                'profile' => $transaction->wpayUser ? $transaction->wpayUser->getProfile() : null
            ]);
        } catch (\Exception $e) {
            Log::error('[WPay Controller] Get transaction error', [
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'wpay_status' => 'failed',
                'message' => 'Internal server error'
            ], 500);
        }
    }

    /**
     * POST /wpay/topup-preview
     * 
     * Preview topup rewards before processing.
     * Returns expected bonus, stars, and tier progression.
     */
    public function topupPreview(Request $request)
    {
        try {
            $validated = $request->validate([
                'email' => 'required|email',
                'amount' => 'required|numeric|min:1',
                'app_source' => 'nullable|string|max:64',
            ]);

            $appSource = $this->resolveAppSource($request);
            $user = $this->wpayService->getOrCreateUser($validated['email'], $appSource);
            $amount = (float) $validated['amount'];

            // Calculate preview
            $currentLifetimeTopups = (float) $user->lifetime_topups;
            $newLifetimeTopups = $currentLifetimeTopups + $amount;

            // Calculate new tier
            $newTier = 'bronze';
            if ($newLifetimeTopups >= 5000) $newTier = 'vip';
            elseif ($newLifetimeTopups >= 2500) $newTier = 'platinum';
            elseif ($newLifetimeTopups >= 1000) $newTier = 'gold';
            elseif ($newLifetimeTopups >= 300) $newTier = 'silver';

            $tierFactors = [
                'bronze' => 1.0,
                'silver' => 1.2,
                'gold' => 1.5,
                'platinum' => 2.0,
                'vip' => 3.0,
            ];

            $bonusPercentages = [
                'bronze' => 0.00,
                'silver' => 0.05,
                'gold' => 0.10,
                'platinum' => 0.15,
                'vip' => 0.20,
            ];

            $bonusToAward = $amount * $user->getBonusPercentage();
            $starsToAward = (int) floor($amount * $user->tier_factor);
            $tierUpgrade = $newTier !== $user->tier_type;

            return response()->json([
                'wpay_status' => 'success',
                'preview' => [
                    'topup_amount' => $amount,
                    'bonus_to_award' => $bonusToAward,
                    'stars_to_award' => $starsToAward,
                    'current_tier' => $user->tier_type,
                    'current_tier_factor' => (float) $user->tier_factor,
                    'new_tier' => $newTier,
                    'new_tier_factor' => $tierFactors[$newTier],
                    'tier_upgrade' => $tierUpgrade,
                    'current_lifetime_topups' => $currentLifetimeTopups,
                    'new_lifetime_topups' => $newLifetimeTopups,
                ],
                'profile' => $user->getProfile(),
            ]);
        } catch (\Exception $e) {
            Log::error('[WPay Controller] Topup preview error', [
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'wpay_status' => 'failed',
                'message' => 'Preview failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /wpay/tiers
     * 
     * Get tier information and thresholds from Supabase.
     */
    public function getTiers()
    {
        try {
            // Fetch tiers from Supabase for consistency with frontend
            $supabaseUrl = env('SUPABASE_URL');
            $supabaseKey = env('SUPABASE_SERVICE_KEY');

            $response = \Illuminate\Support\Facades\Http::withHeaders([
                'apikey' => $supabaseKey,
                'Authorization' => 'Bearer ' . $supabaseKey,
            ])->get("{$supabaseUrl}/rest/v1/membership_tiers?order=sort_order.asc");

            if ($response->successful() && !empty($response->json())) {
                $tiers = $response->json();

                // Transform to expected format
                $formattedTiers = [];
                foreach ($tiers as $tier) {
                    $formattedTiers[] = [
                        'id' => $tier['id'] ?? null,
                        'name' => $tier['name'],
                        'key' => strtolower($tier['name']),
                        'threshold' => (float)($tier['threshold'] ?? 0),
                        'min_topups' => (float)($tier['threshold'] ?? 0),
                        'earn_multiplier' => (float)($tier['earn_multiplier'] ?? 1.0),
                        'tier_factor' => (float)($tier['earn_multiplier'] ?? 1.0),
                        'topup_bonus_pct' => (float)($tier['topup_bonus_pct'] ?? 0),
                        'bonus_percentage' => (float)($tier['topup_bonus_pct'] ?? 0),
                        'workshop_discount_pct' => (float)($tier['workshop_discount_pct'] ?? 0),
                        'redemption_discount_pct' => (float)($tier['redemption_discount_pct'] ?? 0),
                        'shop_discount_pct' => (float)($tier['shop_discount_pct'] ?? 0),
                        'mission_bonus_stars' => (int)($tier['mission_bonus_stars'] ?? 0),
                        'color' => $tier['color'] ?? '#666666',
                        'sort_order' => (int)($tier['sort_order'] ?? 0),
                    ];
                }

                return response()->json([
                    'wpay_status' => 'success',
                    'source' => 'supabase',
                    'tiers' => $formattedTiers
                ]);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('[WPay] Failed to fetch tiers from Supabase, using fallback', [
                'error' => $e->getMessage()
            ]);
        }

        // Fallback to hardcoded tiers if Supabase fetch fails
        return response()->json([
            'wpay_status' => 'success',
            'source' => 'fallback',
            'tiers' => [
                [
                    'name' => 'Bronze',
                    'key' => 'bronze',
                    'threshold' => 0,
                    'min_topups' => 0,
                    'earn_multiplier' => 1.0,
                    'tier_factor' => 1.0,
                    'bonus_percentage' => 0,
                    'benefits' => ['1x Star earning rate']
                ],
                [
                    'name' => 'Silver',
                    'key' => 'silver',
                    'threshold' => 300,
                    'min_topups' => 300,
                    'earn_multiplier' => 1.2,
                    'tier_factor' => 1.2,
                    'bonus_percentage' => 5,
                    'benefits' => ['1.2x Star earning rate', '5% Topup bonus']
                ],
                [
                    'name' => 'Gold',
                    'key' => 'gold',
                    'threshold' => 1000,
                    'min_topups' => 1000,
                    'earn_multiplier' => 1.5,
                    'tier_factor' => 1.5,
                    'bonus_percentage' => 10,
                    'benefits' => ['1.5x Star earning rate', '10% Topup bonus']
                ],
                [
                    'name' => 'Platinum',
                    'key' => 'platinum',
                    'threshold' => 2500,
                    'min_topups' => 2500,
                    'earn_multiplier' => 2.0,
                    'tier_factor' => 2.0,
                    'bonus_percentage' => 15,
                    'benefits' => ['2x Star earning rate', '15% Topup bonus']
                ],
                [
                    'name' => 'VIP',
                    'key' => 'vip',
                    'threshold' => 5000,
                    'min_topups' => 5000,
                    'earn_multiplier' => 3.0,
                    'tier_factor' => 3.0,
                    'bonus_percentage' => 20,
                    'benefits' => ['3x Star earning rate', '20% Topup bonus', 'Exclusive VIP perks']
                ],
            ]
        ]);
    }

    /**
     * POST /wpay/complete/{orderId}
     * 
     * Manually complete a pending transaction.
     * This is useful for development/testing when Fiuu callback can't reach localhost.
     */
    public function manualComplete(Request $request, string $orderId)
    {
        try {
            $appSource = $this->resolveAppSource($request);
            Log::info('[WPay Controller] Manual complete request', [
                'order_id' => $orderId,
                'app_source' => $appSource,
            ]);

            $transaction = $this->wpayService->getTransaction($orderId, $appSource);

            if (!$transaction) {
                return response()->json([
                    'wpay_status' => 'failed',
                    'message' => 'Transaction not found'
                ], 404);
            }

            if ($transaction->status === 'success') {
                return response()->json([
                    'wpay_status' => 'success',
                    'message' => 'Transaction already completed',
                    'profile' => $transaction->wpayUser ? $transaction->wpayUser->getProfile() : null
                ]);
            }

            // Simulate a successful Fiuu callback
            $result = $this->wpayService->handleFiuuCallback([
                'orderid' => $orderId,
                'status' => '1',
                'status_code' => '00',
                'tranID' => 'MANUAL-' . time(),
                'skip_verification' => true, // Skip signature verification for manual complete
            ]);

            if ($result['success']) {
                // Fetch updated transaction and profile
                $transaction = $this->wpayService->getTransaction($orderId, $appSource);

                return response()->json([
                    'wpay_status' => 'success',
                    'message' => 'Transaction completed manually',
                    'transaction' => $transaction ? [
                        'id' => $transaction->id,
                        'order_id' => $transaction->order_id,
                        'status' => $transaction->status,
                        'stars_awarded' => $transaction->stars_awarded,
                    ] : null,
                    'profile' => $transaction && $transaction->wpayUser ? $transaction->wpayUser->getProfile() : null
                ]);
            } else {
                return response()->json([
                    'wpay_status' => 'failed',
                    'message' => $result['message'] ?? 'Failed to complete transaction'
                ], 400);
            }
        } catch (\Exception $e) {
            Log::error('[WPay Controller] Manual complete error', [
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'wpay_status' => 'failed',
                'message' => 'Internal server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST /wpay/sync/{orderId}
     * 
     * Manually trigger Supabase sync for an existing transaction.
     * Useful for fixing data discrepancies.
     */
    public function syncToSupabase(Request $request, string $orderId)
    {
        try {
            $appSource = $this->resolveAppSource($request);
            Log::info('[WPay Controller] Manual Supabase sync requested', [
                'order_id' => $orderId,
                'app_source' => $appSource,
            ]);

            $result = $this->wpayService->syncTransactionToSupabase($orderId, $appSource);

            return response()->json($result);
        } catch (\Exception $e) {
            Log::error('[WPay Controller] Sync error', [
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'wpay_status' => 'failed',
                'message' => 'Sync failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /wpay/admin/transactions
     *
     * Get all transactions for admin/finance dashboard.
     * Excludes test emails and provides detailed financial data.
     */
    public function getAllTransactions(Request $request)
    {
        try {
            $appSource = $this->resolveAppSource($request);
            $testEmails = [
                'fitri@demo.com',
                'seancreative@gmail.com',
                'dansonhar8@gmail.com',
                'izzulfitreee@gmail.com',
                'fitri@gmail.com'
            ];

            $query = \App\Models\WPayTransaction::with('wpayUser')
                ->whereNotIn('email', $testEmails)
                ->where('app_source', $appSource)
                ->orderBy('created_at', 'desc');

            // Optional filters
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('payment_category')) {
                $query->where('payment_category', $request->payment_category);
            }

            if ($request->has('from_date')) {
                $query->where('created_at', '>=', $request->from_date);
            }

            if ($request->has('to_date')) {
                $query->where('created_at', '<=', $request->to_date);
            }

            $transactions = $query->get();

            return response()->json([
                'wpay_status' => 'success',
                'app_source' => $appSource,
                'transactions' => $transactions,
                'count' => $transactions->count()
            ])->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        } catch (\Exception $e) {
            Log::error('[WPay Controller] Get transactions error', [
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'wpay_status' => 'failed',
                'message' => 'Failed to fetch transactions: ' . $e->getMessage()
            ], 500)->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        }
    }

    /**
     * GET /wpay/admin/users
     *
     * Get all users with their wallet stats.
     * Excludes test emails and provides lifetime stats.
     */
    public function getAllUsers(Request $request)
    {
        try {
            $appSource = $this->resolveAppSource($request);
            $testEmails = [
                'fitri@demo.com',
                'seancreative@gmail.com',
                'dansonhar8@gmail.com',
                'izzulfitreee@gmail.com',
                'fitri@gmail.com'
            ];

            $users = \App\Models\WPayUser::whereNotIn('email', $testEmails)
                ->where('app_source', $appSource)
                ->orderBy('lifetime_topups', 'desc')
                ->get();

            return response()->json([
                'wpay_status' => 'success',
                'app_source' => $appSource,
                'users' => $users,
                'count' => $users->count()
            ])->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        } catch (\Exception $e) {
            Log::error('[WPay Controller] Get users error', [
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'wpay_status' => 'failed',
                'message' => 'Failed to fetch users: ' . $e->getMessage()
            ], 500)->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        }
    }

    /**
     * POST /wpay/admin/users
     *
     * Create a new WPay user account (called during signup).
     */
    public function createUser(Request $request)
    {
        try {
            $appSource = $this->resolveAppSource($request);
            $validated = $request->validate([
                'email' => 'required|email',
                'supabase_user_id' => 'required|string',
                'name' => 'nullable|string',
                'phone' => 'nullable|string',
                'app_source' => 'nullable|string|max:64',
            ]);

            $email = strtolower(trim($validated['email']));

            // Check if user already exists
            $existingUser = \App\Models\WPayUser::where('email', $email)
                ->where('app_source', $appSource)
                ->first();
            if ($existingUser) {
                return response()->json([
                    'wpay_status' => 'success',
                    'message' => 'User already exists',
                    'app_source' => $appSource,
                    'user' => $existingUser
                ])->header('Access-Control-Allow-Origin', '*')
                  ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                  ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
            }

            // Create new WPay user
            $user = \App\Models\WPayUser::create([
                'email' => $email,
                'app_source' => $appSource,
                'wbalance' => 0,
                'bonus' => 0,
                'stars' => 0,
                'lifetime_topups' => 0,
                'tier_type' => 'bronze',
            ]);

            Log::info('[WPay Controller] New user created', [
                'email' => $email,
                'supabase_user_id' => $validated['supabase_user_id'],
                'app_source' => $appSource,
            ]);

            return response()->json([
                'wpay_status' => 'success',
                'message' => 'WPay user created successfully',
                'app_source' => $appSource,
                'user' => $user
            ])->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');

        } catch (\Exception $e) {
            Log::error('[WPay Controller] Create user error', [
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'wpay_status' => 'failed',
                'message' => 'Failed to create user: ' . $e->getMessage()
            ], 500)->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        }
    }

    /**
     * GET /wpay/admin/stats
     *
     * Get aggregated financial statistics with deduplication.
     *
     * Cash Flow Tracking:
     * - Money IN: Wallet topups (customers adding funds via online payment)
     * - Money OUT: Sales from both W-Balance and online payments (deduplicated)
     *
     * Payment Types Explained:
     * - payment (Supabase): Online payment (FPX, Card) - Direct to business
     * - deduction (Supabase): W-Balance payment - Using wallet funds (EXISTS IN BOTH DBs)
     * - topup: Adding money to wallet
     *
     * Deduplication Logic:
     * W-Balance transactions appear in BOTH databases:
     * - Laravel WPay: payment_category='checkout', payment_type='wbalance'
     * - Supabase: payment_type='deduction'
     * We match by order_id to avoid double-counting.
     */
    public function getStats(Request $request)
    {
        try {
            $appSource = $this->resolveAppSource($request);
            $testEmails = [
                'fitri@demo.com',
                'seancreative@gmail.com',
                'dansonhar8@gmail.com',
                'izzulfitreee@gmail.com',
                'fitri@gmail.com'
            ];

            // ========================================
            // MONEY IN: Wallet Topups
            // ========================================
            $topupQuery = \App\Models\WPayTransaction::whereNotIn('email', $testEmails)
                ->where('app_source', $appSource)
                ->where('payment_category', 'topup')
                ->where('status', 'success');

            $totalWalletTopups = (clone $topupQuery)->sum('topup_amount');
            $totalTopupCount = (clone $topupQuery)->count();

            // ========================================
            // MONEY OUT: Sales (with Deduplication)
            // ========================================

            // Get W-Balance checkout transactions from Laravel WPay
            $wpayCheckouts = \App\Models\WPayTransaction::whereNotIn('email', $testEmails)
                ->where('app_source', $appSource)
                ->where('payment_category', 'checkout')
                ->where('status', 'success')
                ->get(['order_id', 'amount']);

            // Create a map of WPay order_ids for quick lookup
            $wpayOrderIds = $wpayCheckouts->pluck('order_id')->toArray();
            $wpaySales = $wpayCheckouts->sum('amount');

            // Fetch Supabase shop_orders
            $supabaseOnlinePaymentSales = 0;
            $supabaseWBalanceSales = 0;
            $duplicateCount = 0;

            $supabaseUrl = env('SUPABASE_URL');
            $supabaseKey = env('SUPABASE_SERVICE_KEY');

            // Supabase shop_orders are currently Wonderstar data.
            // Do not merge them into other app sources to avoid cross-app clashes.
            if ($appSource === 'wonderstar' && $supabaseUrl && $supabaseKey) {
                try {
                    // Get all users from Supabase to filter by email
                    $usersResponse = \Illuminate\Support\Facades\Http::withHeaders([
                        'apikey' => $supabaseKey,
                        'Authorization' => 'Bearer ' . $supabaseKey,
                    ])->get("{$supabaseUrl}/rest/v1/users?select=id,email");

                    if ($usersResponse->successful()) {
                        $users = $usersResponse->json();
                        $excludeUserIds = collect($users)
                            ->whereIn('email', $testEmails)
                            ->pluck('id')
                            ->toArray();

                        // Query shop_orders for BOTH payment types (payment and deduction)
                        $ordersUrl = "{$supabaseUrl}/rest/v1/shop_orders?select=order_number,total_amount,payment_type";

                        // Exclude test user orders if we found any test user IDs
                        if (!empty($excludeUserIds)) {
                            $ordersUrl .= '&user_id=not.in.(' . implode(',', $excludeUserIds) . ')';
                        }

                        $ordersResponse = \Illuminate\Support\Facades\Http::withHeaders([
                            'apikey' => $supabaseKey,
                            'Authorization' => 'Bearer ' . $supabaseKey,
                        ])->get($ordersUrl);

                        if ($ordersResponse->successful()) {
                            $orders = $ordersResponse->json();

                            foreach ($orders as $order) {
                                $orderNumber = $order['order_number'] ?? null;
                                $amount = (float)($order['total_amount'] ?? 0);
                                $paymentType = $order['payment_type'] ?? null;

                                if ($paymentType === 'payment') {
                                    // Online payment (FPX, Card) - Only in Supabase, always count
                                    $supabaseOnlinePaymentSales += $amount;
                                } elseif ($paymentType === 'deduction') {
                                    // W-Balance payment - Check if it exists in WPay to avoid duplicate
                                    if (in_array($orderNumber, $wpayOrderIds)) {
                                        // This W-Balance transaction exists in BOTH databases
                                        // Skip it here since we already counted it in $wpaySales
                                        $duplicateCount++;
                                        Log::debug('[WPay Stats] Duplicate W-Balance transaction found', [
                                            'order_id' => $orderNumber,
                                            'amount' => $amount
                                        ]);
                                    } else {
                                        // W-Balance transaction only in Supabase (legacy or missing in WPay)
                                        $supabaseWBalanceSales += $amount;
                                    }
                                }
                                // Note: 'topup' transactions are already counted in the WPay topup query above
                                // No need to add them here again as they represent wallet topups, not sales
                            }
                        }
                    }
                } catch (\Exception $e) {
                    Log::warning('[WPay Stats] Failed to fetch Supabase sales', ['error' => $e->getMessage()]);
                }
            }

            // ========================================
            // CALCULATE DEDUPLICATED TOTAL SALES
            // ========================================
            // Total Sales = WPay W-Balance Sales + Supabase Online Payment Sales + Supabase-only W-Balance Sales
            $totalSales = $wpaySales + $supabaseOnlinePaymentSales + $supabaseWBalanceSales;

            // ========================================
            // OTHER FINANCIAL METRICS
            // ========================================

            // Total spent (all completed transactions - topup + checkout)
            $totalSpent = \App\Models\WPayTransaction::whereNotIn('email', $testEmails)
                ->where('app_source', $appSource)
                ->where('status', 'success')
                ->sum('amount');

            // Total current balance (sum of all user balances)
            $totalBalance = \App\Models\WPayUser::whereNotIn('email', $testEmails)
                ->where('app_source', $appSource)
                ->sum('wbalance');

            // Total bonus balance
            $totalBonus = \App\Models\WPayUser::whereNotIn('email', $testEmails)
                ->where('app_source', $appSource)
                ->sum('bonus');

            // Transaction counts
            $totalTransactions = \App\Models\WPayTransaction::whereNotIn('email', $testEmails)
                ->where('app_source', $appSource)
                ->count();
            $successfulTransactions = \App\Models\WPayTransaction::whereNotIn('email', $testEmails)
                ->where('app_source', $appSource)
                ->where('status', 'success')->count();
            $pendingTransactions = \App\Models\WPayTransaction::whereNotIn('email', $testEmails)
                ->where('app_source', $appSource)
                ->where('status', 'pending')->count();

            // Get total users count (for total wallets)
            $totalWallets = \App\Models\WPayUser::whereNotIn('email', $testEmails)
                ->where('app_source', $appSource)
                ->count();

            return response()->json([
                'wpay_status' => 'success',
                'app_source' => $appSource,
                'stats' => [
                    'total_wallet_topups' => (float) $totalWalletTopups,
                    'total_topup_count' => $totalTopupCount,
                    'total_wallets' => $totalWallets,
                    'total_sales' => (float) $totalSales,
                    'total_spent' => (float) $totalSpent,
                    'total_balance' => (float) $totalBalance,
                    'total_bonus' => (float) $totalBonus,
                    'total_transactions' => $totalTransactions,
                    'successful_transactions' => $successfulTransactions,
                    'pending_transactions' => $pendingTransactions,
                    // Additional breakdown for transparency
                    'sales_breakdown' => [
                        'wpay_wbalance_sales' => (float) $wpaySales,
                        'supabase_online_payment_sales' => (float) $supabaseOnlinePaymentSales,
                        'supabase_wbalance_sales' => (float) $supabaseWBalanceSales,
                        'duplicates_found' => $duplicateCount,
                    ]
                ]
            ])->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        } catch (\Exception $e) {
            Log::error('[WPay Controller] Get stats error', [
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'wpay_status' => 'failed',
                'message' => 'Failed to fetch stats: ' . $e->getMessage()
            ], 500)->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        }
    }

    /**
     * PUT /wpay/admin/transaction/{id}
     *
     * Update a transaction (for admin corrections).
     */
    public function updateTransaction(Request $request, string $id)
    {
        try {
            $appSource = $this->resolveAppSource($request);
            $transaction = \App\Models\WPayTransaction::where('id', $id)
                ->where('app_source', $appSource)
                ->firstOrFail();

            $validated = $request->validate([
                'status' => 'nullable|in:pending,processing,success,failed,cancelled',
                'amount' => 'nullable|numeric|min:0',
                'metadata' => 'nullable|array',
            ]);

            $transaction->update($validated);

            Log::info('[WPay Controller] Transaction updated', [
                'id' => $id,
                'app_source' => $appSource,
                'updates' => $validated
            ]);

            return response()->json([
                'wpay_status' => 'success',
                'app_source' => $appSource,
                'message' => 'Transaction updated successfully',
                'data' => $transaction->fresh()
            ])->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'wpay_status' => 'failed',
                'message' => 'Transaction not found'
            ], 404)->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        } catch (\Exception $e) {
            Log::error('[WPay Controller] Update transaction error', [
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'wpay_status' => 'failed',
                'message' => 'Failed to update transaction: ' . $e->getMessage()
            ], 500)->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        }
    }

    /**
     * DELETE /wpay/admin/transaction/{id}
     *
     * Delete a transaction (for removing test data).
     */
    public function deleteTransaction(Request $request, string $id)
    {
        try {
            $appSource = $this->resolveAppSource($request);
            $transaction = \App\Models\WPayTransaction::where('id', $id)
                ->where('app_source', $appSource)
                ->firstOrFail();

            Log::info('[WPay Controller] Deleting transaction', [
                'id' => $id,
                'order_id' => $transaction->order_id,
                'app_source' => $appSource,
            ]);

            $transaction->delete();

            return response()->json([
                'wpay_status' => 'success',
                'app_source' => $appSource,
                'message' => 'Transaction deleted successfully'
            ])->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'wpay_status' => 'failed',
                'message' => 'Transaction not found'
            ], 404)->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        } catch (\Exception $e) {
            Log::error('[WPay Controller] Delete transaction error', [
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'wpay_status' => 'failed',
                'message' => 'Failed to delete transaction: ' . $e->getMessage()
            ], 500)->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        }
    }

    /**
     * POST /wpay/admin/cleanup-duplicates
     *
     * Remove all synced duplicate transactions from Laravel.
     * Only keeps transactions that were created via WPay (topups and organic checkouts).
     */
    public function cleanupDuplicates(Request $request)
    {
        try {
            $appSource = $this->resolveAppSource($request);
            // Delete all transactions that were synced from Supabase
            $deleted = \App\Models\WPayTransaction::where('app_source', $appSource)
                ->where('metadata->synced_from_supabase', true)
                ->delete();

            Log::info('[WPay Controller] Cleanup completed', [
                'deleted' => $deleted,
                'app_source' => $appSource,
            ]);

            return response()->json([
                'wpay_status' => 'success',
                'app_source' => $appSource,
                'message' => "Cleanup completed: {$deleted} synced transactions removed",
                'deleted' => $deleted
            ])->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');

        } catch (\Exception $e) {
            Log::error('[WPay Controller] Cleanup error', [
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'wpay_status' => 'failed',
                'message' => 'Cleanup failed: ' . $e->getMessage()
            ], 500)->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        }
    }

    /**
     * POST /wpay/admin/sync
     *
     * Sync transactions from Supabase to Laravel WPay database.
     * Uses Supabase as source of truth.
     * Matches by: order_id, email, amount, and date to avoid duplicates.
     */
    public function syncFromSupabase(Request $request)
    {
        try {
            $appSource = $this->resolveAppSource($request);
            $testEmails = [
                'fitri@demo.com',
                'seancreative@gmail.com',
                'dansonhar8@gmail.com',
                'izzulfitreee@gmail.com',
                'fitri@gmail.com'
            ];

            $supabaseUrl = env('SUPABASE_URL');
            $supabaseKey = env('SUPABASE_SERVICE_KEY');

            if (!$supabaseUrl || !$supabaseKey) {
                return response()->json([
                    'wpay_status' => 'failed',
                    'message' => 'Supabase credentials not configured'
                ], 500)->header('Access-Control-Allow-Origin', '*')
                  ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                  ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
            }

            $synced = 0;
            $skipped = 0;
            $errors = [];

            // Fetch users from Supabase to get emails
            $usersResponse = \Illuminate\Support\Facades\Http::withHeaders([
                'apikey' => $supabaseKey,
                'Authorization' => 'Bearer ' . $supabaseKey,
            ])->get("{$supabaseUrl}/rest/v1/users?select=id,email");

            if (!$usersResponse->successful()) {
                throw new \Exception('Failed to fetch users from Supabase');
            }

            $users = $usersResponse->json();
            $userEmailMap = collect($users)->keyBy('id')->map(fn($u) => $u['email'])->toArray();

            // Exclude test user IDs
            $excludeUserIds = collect($users)
                ->whereIn('email', $testEmails)
                ->pluck('id')
                ->toArray();

            // Fetch shop_orders from Supabase (payment, deduction, and topup types)
            $ordersUrl = "{$supabaseUrl}/rest/v1/shop_orders?select=order_number,user_id,total_amount,payment_type,payment_status,created_at&or=(payment_type.eq.payment,payment_type.eq.deduction,payment_type.eq.topup)";

            if (!empty($excludeUserIds)) {
                $ordersUrl .= '&user_id=not.in.(' . implode(',', $excludeUserIds) . ')';
            }

            $ordersResponse = \Illuminate\Support\Facades\Http::withHeaders([
                'apikey' => $supabaseKey,
                'Authorization' => 'Bearer ' . $supabaseKey,
            ])->get($ordersUrl);

            if (!$ordersResponse->successful()) {
                throw new \Exception('Failed to fetch orders from Supabase');
            }

            $orders = $ordersResponse->json();

            foreach ($orders as $order) {
                $orderNumber = $order['order_number'] ?? null;
                $userId = $order['user_id'] ?? null;
                $amount = (float)($order['total_amount'] ?? 0);
                $paymentType = $order['payment_type'] ?? null;
                $paymentStatus = $order['payment_status'] ?? null;
                $createdAt = $order['created_at'] ?? null;

                if (!$orderNumber) {
                    $skipped++;
                    continue;
                }

                // Get email from user map
                $email = $userEmailMap[$userId] ?? null;
                if (!$email) {
                    $errors[] = "Order {$orderNumber}: User email not found";
                    continue;
                }

                // Parse created date
                $orderDate = $createdAt ? date('Y-m-d', strtotime($createdAt)) : null;

                // Check if this transaction already exists using multiple criteria
                $existingQuery = \App\Models\WPayTransaction::where('email', $email)
                    ->where('app_source', $appSource)
                    ->where('amount', $amount);

                // Match by order_id OR by date+email+amount
                $existingQuery->where(function($query) use ($orderNumber, $orderDate) {
                    $query->where('order_id', $orderNumber);
                    if ($orderDate) {
                        $query->orWhere(function($q) use ($orderDate) {
                            $q->whereDate('created_at', $orderDate);
                        });
                    }
                });

                $existing = $existingQuery->first();

                if ($existing) {
                    $skipped++;
                    Log::debug('[WPay Sync] Skipping duplicate', [
                        'order_id' => $orderNumber,
                        'email' => $email,
                        'amount' => $amount,
                        'existing_id' => $existing->id
                    ]);
                    continue;
                }

                // Determine WPay transaction category and type
                if ($paymentType === 'payment') {
                    // Online payment
                    $wpayCategory = 'checkout';
                    $wpayType = 'online';
                } elseif ($paymentType === 'deduction') {
                    // W-Balance payment
                    $wpayCategory = 'checkout';
                    $wpayType = 'wbalance';
                } elseif ($paymentType === 'topup') {
                    // Wallet topup
                    $wpayCategory = 'topup';
                    $wpayType = 'online';
                } else {
                    $skipped++;
                    continue;
                }

                // Map payment status
                $status = 'success';
                if ($paymentStatus === 'pending') {
                    $status = 'pending';
                } elseif ($paymentStatus === 'failed') {
                    $status = 'failed';
                }

                // Only sync successful transactions
                if ($status !== 'success') {
                    $skipped++;
                    continue;
                }

                // Create or get user
                $wpayUser = $this->wpayService->getOrCreateUser($email, $appSource);

                // Create transaction
                try {
                    \App\Models\WPayTransaction::create([
                        'wpay_user_id' => $wpayUser->id,
                        'email' => $email,
                        'app_source' => $appSource,
                        'order_id' => $orderNumber,
                        'payment_category' => $wpayCategory,
                        'payment_type' => $wpayType,
                        'amount' => $amount,
                        'wbalance_used' => $wpayType === 'wbalance' ? $amount : 0,
                        'bonus_used' => 0,
                        'online_paid' => $wpayType === 'online' ? $amount : 0,
                        'status' => $status,
                        'topup_amount' => $wpayCategory === 'topup' ? $amount : 0,
                        'bonus_awarded' => 0,
                        'stars_awarded' => 0,
                        'metadata' => [
                            'synced_from_supabase' => true,
                            'payment_type' => $paymentType,
                            'app_source' => $appSource,
                        ],
                        'created_at' => $createdAt ?: now(),
                        'updated_at' => now(),
                    ]);

                    $synced++;
                    Log::info('[WPay Sync] Created transaction', [
                        'order_id' => $orderNumber,
                        'email' => $email,
                        'amount' => $amount,
                        'type' => $wpayType
                    ]);
                } catch (\Exception $e) {
                    $errors[] = "Order {$orderNumber}: " . $e->getMessage();
                    Log::error('[WPay Sync] Failed to create transaction', [
                        'order_id' => $orderNumber,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            return response()->json([
                'wpay_status' => 'success',
                'app_source' => $appSource,
                'message' => "Sync completed: {$synced} transactions synced, {$skipped} skipped",
                'synced' => $synced,
                'skipped' => $skipped,
                'errors' => $errors
            ])->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');

        } catch (\Exception $e) {
            Log::error('[WPay Controller] Sync error', [
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'wpay_status' => 'failed',
                'message' => 'Sync failed: ' . $e->getMessage()
            ], 500)->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        }
    }

    /**
     * POST /wpay/admin/reconcile
     *
     * Find and sync successful transactions that exist in Laravel but not in Supabase.
     * This fixes the issue where Fiuu callback succeeded but Supabase sync failed.
     */
    public function reconcileMissingTransactions(Request $request)
    {
        try {
            $appSource = $this->resolveAppSource($request);
            $testEmails = [
                'fitri@demo.com',
                'seancreative@gmail.com',
                'dansonhar8@gmail.com',
                'izzulfitreee@gmail.com',
                'fitri@gmail.com'
            ];

            $supabaseUrl = env('SUPABASE_URL');
            $supabaseKey = env('SUPABASE_SERVICE_KEY');

            if (!$supabaseUrl || !$supabaseKey) {
                return response()->json([
                    'wpay_status' => 'failed',
                    'message' => 'Supabase credentials not configured'
                ], 500);
            }

            // Get all successful transactions from Laravel that have user_id in metadata
            $transactions = \App\Models\WPayTransaction::whereNotIn('email', $testEmails)
                ->where('app_source', $appSource)
                ->where('status', 'success')
                ->whereNotNull('metadata')
                ->orderBy('created_at', 'desc')
                ->get();

            Log::info('[WPay Reconcile] Found transactions to check', ['count' => $transactions->count()]);

            // Fetch existing order_numbers from Supabase to compare
            $ordersResponse = \Illuminate\Support\Facades\Http::withHeaders([
                'apikey' => $supabaseKey,
                'Authorization' => 'Bearer ' . $supabaseKey,
            ])->get("{$supabaseUrl}/rest/v1/shop_orders?select=order_number");

            $existingOrderNumbers = [];
            if ($ordersResponse->successful()) {
                $existingOrderNumbers = collect($ordersResponse->json())->pluck('order_number')->toArray();
            }

            $missing = [];
            $synced = 0;
            $skipped = 0;
            $errors = [];

            foreach ($transactions as $transaction) {
                $orderId = $transaction->order_id;
                $metadata = is_array($transaction->metadata)
                    ? $transaction->metadata
                    : json_decode($transaction->metadata ?? '{}', true);

                // Check if order exists in Supabase
                if (in_array($orderId, $existingOrderNumbers)) {
                    $skipped++;
                    continue;
                }

                // Check if we have user_id in metadata
                $supabaseUserId = $metadata['user_id'] ?? null;
                if (!$supabaseUserId) {
                    $missing[] = [
                        'order_id' => $orderId,
                        'email' => $transaction->email,
                        'amount' => $transaction->amount,
                        'reason' => 'Missing user_id in metadata',
                        'created_at' => $transaction->created_at,
                    ];
                    continue;
                }

                // Try to sync this transaction
                try {
                    $this->wpayService->syncTransactionToSupabase($orderId, $appSource);
                    $synced++;
                    Log::info('[WPay Reconcile] Synced transaction', ['order_id' => $orderId]);
                } catch (\Exception $e) {
                    $errors[] = "Order {$orderId}: " . $e->getMessage();
                    Log::error('[WPay Reconcile] Failed to sync', [
                        'order_id' => $orderId,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            return response()->json([
                'wpay_status' => 'success',
                'app_source' => $appSource,
                'message' => "Reconciliation completed: {$synced} synced, {$skipped} already exist",
                'synced' => $synced,
                'skipped' => $skipped,
                'missing_user_id' => $missing,
                'missing_count' => count($missing),
                'errors' => $errors
            ])->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');

        } catch (\Exception $e) {
            Log::error('[WPay Controller] Reconcile error', [
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'wpay_status' => 'failed',
                'message' => 'Reconciliation failed: ' . $e->getMessage()
            ], 500)->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        }
    }

    /**
     * GET /wpay/admin/pending
     *
     * Get all pending transactions that may need manual intervention.
     * These are transactions where Fiuu callback may have failed.
     */
    public function getPendingTransactions(Request $request)
    {
        try {
            $appSource = $this->resolveAppSource($request);
            $testEmails = [
                'fitri@demo.com',
                'seancreative@gmail.com',
                'dansonhar8@gmail.com',
                'izzulfitreee@gmail.com',
                'fitri@gmail.com'
            ];

            $transactions = \App\Models\WPayTransaction::with('wpayUser')
                ->whereNotIn('email', $testEmails)
                ->where('app_source', $appSource)
                ->where('status', 'pending')
                ->where('payment_type', 'online') // Only online payments can be pending
                ->where('created_at', '>=', now()->subDays(7)) // Last 7 days
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'wpay_status' => 'success',
                'app_source' => $appSource,
                'transactions' => $transactions,
                'count' => $transactions->count(),
                'message' => 'These transactions may need manual verification in Fiuu dashboard'
            ])->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');

        } catch (\Exception $e) {
            Log::error('[WPay Controller] Get pending error', [
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'wpay_status' => 'failed',
                'message' => 'Failed to fetch pending transactions: ' . $e->getMessage()
            ], 500)->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        }
    }

    /**
     * GET /wpay/admin/test-transactions
     *
     * Get test user transactions (topup only).
     */
    public function getTestTransactions(Request $request)
    {
        try {
            $appSource = $this->resolveAppSource($request);
            $testEmails = [
                'fitri@demo.com',
                'seancreative@gmail.com',
                'dansonhar8@gmail.com',
                'izzulfitreee@gmail.com',
                'fitri@gmail.com'
            ];

            $query = \App\Models\WPayTransaction::with('wpayUser')
                ->whereIn('email', $testEmails)
                ->where('app_source', $appSource)
                ->where('payment_category', 'topup')
                ->orderBy('created_at', 'desc');

            $transactions = $query->get();

            return response()->json([
                'wpay_status' => 'success',
                'app_source' => $appSource,
                'transactions' => $transactions,
                'count' => $transactions->count()
            ])->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        } catch (\Exception $e) {
            Log::error('[WPay Controller] Get test transactions error', [
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'wpay_status' => 'failed',
                'message' => 'Failed to fetch test transactions: ' . $e->getMessage()
            ], 500)->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        }
    }

    /**
     * Sync payment statuses from WPay to Supabase shop_orders
     *
     * Finds WPay transactions with status='success' where the corresponding
     * Supabase shop_order has a mismatched payment_status (e.g. 'pending' instead of 'paid')
     * and updates Supabase to match WPay's correct status.
     */
    public function syncPaymentStatusToSupabase(Request $request)
    {
        try {
            $appSource = $this->resolveAppSource($request);
            $supabaseUrl = env('SUPABASE_URL');
            $supabaseKey = env('SUPABASE_SERVICE_KEY');

            if (!$supabaseUrl || !$supabaseKey) {
                return response()->json([
                    'wpay_status' => 'failed',
                    'message' => 'Supabase credentials not configured'
                ], 500)->header('Access-Control-Allow-Origin', '*')
                  ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                  ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
            }

            $headers = [
                'apikey' => $supabaseKey,
                'Authorization' => 'Bearer ' . $supabaseKey,
                'Content-Type' => 'application/json',
            ];

            // Step 1: Get all successful WPay transactions
            $wpayTransactions = \App\Models\WPayTransaction::where('app_source', $appSource)
                ->where('status', 'success')
                ->get();

            $updated = 0;
            $alreadyCorrect = 0;
            $notFound = 0;
            $errors = [];
            $details = [];

            foreach ($wpayTransactions as $transaction) {
                $orderNumber = $transaction->order_id;

                try {
                    // Step 2: Find matching shop_order in Supabase by order_number
                    $findResponse = \Illuminate\Support\Facades\Http::withHeaders([
                        'apikey' => $supabaseKey,
                        'Authorization' => 'Bearer ' . $supabaseKey,
                    ])->get("{$supabaseUrl}/rest/v1/shop_orders", [
                        'select' => 'id,order_number,status,payment_status',
                        'order_number' => "eq.{$orderNumber}",
                    ]);

                    if (!$findResponse->successful()) {
                        $errors[] = "Failed to query Supabase for order {$orderNumber}";
                        continue;
                    }

                    $supabaseOrders = $findResponse->json();

                    if (empty($supabaseOrders)) {
                        $notFound++;
                        continue;
                    }

                    $supabaseOrder = $supabaseOrders[0];

                    // Step 3: Check if status needs updating
                    $needsUpdate = false;
                    $updateData = [];

                    if ($supabaseOrder['payment_status'] !== 'paid') {
                        $updateData['payment_status'] = 'paid';
                        $needsUpdate = true;
                    }

                    if ($supabaseOrder['status'] !== 'completed') {
                        $updateData['status'] = 'completed';
                        $needsUpdate = true;
                    }

                    if (!$needsUpdate) {
                        $alreadyCorrect++;
                        continue;
                    }

                    // Step 4: Update the Supabase order
                    $updateResponse = \Illuminate\Support\Facades\Http::withHeaders($headers + [
                        'Prefer' => 'return=representation',
                    ])->patch("{$supabaseUrl}/rest/v1/shop_orders?id=eq.{$supabaseOrder['id']}", $updateData);

                    if ($updateResponse->successful()) {
                        $updated++;
                        $details[] = [
                            'order_number' => $orderNumber,
                            'old_payment_status' => $supabaseOrder['payment_status'],
                            'old_status' => $supabaseOrder['status'],
                            'new_payment_status' => $updateData['payment_status'] ?? $supabaseOrder['payment_status'],
                            'new_status' => $updateData['status'] ?? $supabaseOrder['status'],
                        ];
                    } else {
                        $errors[] = "Failed to update order {$orderNumber}: " . $updateResponse->body();
                    }
                } catch (\Exception $e) {
                    $errors[] = "Error processing order {$orderNumber}: " . $e->getMessage();
                }
            }

            Log::info('[WPay] Payment status sync completed', [
                'total_wpay_success' => $wpayTransactions->count(),
                'updated' => $updated,
                'already_correct' => $alreadyCorrect,
                'not_found_in_supabase' => $notFound,
                'errors' => count($errors),
            ]);

            return response()->json([
                'wpay_status' => 'success',
                'message' => "Sync completed. Updated {$updated} orders.",
                'total_wpay_success_transactions' => $wpayTransactions->count(),
                'updated' => $updated,
                'already_correct' => $alreadyCorrect,
                'not_found_in_supabase' => $notFound,
                'errors' => $errors,
                'details' => $details,
            ])->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        } catch (\Exception $e) {
            Log::error('[WPay] Payment status sync error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'wpay_status' => 'failed',
                'message' => 'Sync failed: ' . $e->getMessage()
            ], 500)->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        }
    }
}
