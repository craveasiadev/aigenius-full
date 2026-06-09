<?php

namespace App\Services;

use App\Models\WPayUser;
use App\Models\WPayTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class WPayService
{
    protected $fiuuService;

    public function __construct(FiuuPaymentService $fiuuService)
    {
        $this->fiuuService = $fiuuService;
    }

    public function normalizeAppSource(?string $appSource): string
    {
        $fallback = strtolower((string) config('wpay.default_app_source', 'wonderstar'));
        $normalized = strtolower(trim((string) ($appSource ?? '')));

        if ($normalized === '') {
            return $fallback;
        }

        $normalized = preg_replace('/[^a-z0-9._-]/', '', $normalized) ?: '';

        return $normalized !== '' ? $normalized : $fallback;
    }

    /**
     * Get or create a WPay user by email
     * 
     * @param string $email
     * @return WPayUser
     */
    public function getOrCreateUser(string $email, ?string $appSource = null): WPayUser
    {
        $normalizedEmail = strtolower(trim($email));
        $resolvedSource = $this->normalizeAppSource($appSource);

        $user = WPayUser::where('email', $normalizedEmail)
            ->where('app_source', $resolvedSource)
            ->first();

        if (!$user) {
            Log::info('[WPay] Creating new user', [
                'email' => $email,
                'app_source' => $resolvedSource,
            ]);

            $user = WPayUser::create([
                'email' => $normalizedEmail,
                'app_source' => $resolvedSource,
                'lifetime_topups' => 0,
                'wbalance' => 0,
                'bonus' => 0,
                'stars' => 0,
                'tier_type' => 'bronze',
                'tier_factor' => 1.0,
            ]);
        }

        return $user;
    }

    /**
     * Process a payment request from Bolt
     * 
     * @param array $data Payment data from Bolt
     * @return array Response to send back to Bolt
     */
    public function processPayment(array $data): array
    {
        try {
            Log::info('[WPay] Processing payment request', $data);

            // Validate required fields
            $email = $data['email'] ?? null;
            $paymentCategory = $data['payment_category'] ?? null; // 'topup' or 'checkout'
            $paymentType = $data['payment_type'] ?? null; // 'online', 'wbalance', or 'free'
            $orderId = $data['order_id'] ?? null;
            $amount = (float) ($data['amount'] ?? 0);
            $metadata = is_array($data['metadata'] ?? null) ? $data['metadata'] : [];
            $appSource = $this->normalizeAppSource($data['app_source'] ?? ($metadata['app_source'] ?? null));
            $metadata['app_source'] = $appSource;
            $data['metadata'] = $metadata;
            $data['app_source'] = $appSource;

            if (!$email || !$paymentCategory || !$paymentType || !$orderId) {
                return $this->errorResponse('Missing required fields: email, payment_category, payment_type, order_id');
            }

            if (!in_array($paymentCategory, ['topup', 'checkout'])) {
                return $this->errorResponse('Invalid payment_category. Must be "topup" or "checkout"');
            }

            if (!in_array($paymentType, ['online', 'wbalance', 'free'])) {
                return $this->errorResponse('Invalid payment_type. Must be "online", "wbalance", or "free"');
            }

            // Get or create user
            $user = $this->getOrCreateUser($email, $appSource);

            // Check for duplicate order_id
            if (WPayTransaction::where('order_id', $orderId)->exists()) {
                return $this->errorResponse('Duplicate order_id: ' . $orderId);
            }

            // Process based on payment type
            switch ($paymentType) {
                case 'free':
                    return $this->processFreePayment($user, $paymentCategory, $orderId, $amount, $metadata);

                case 'wbalance':
                    return $this->processWBalancePayment($user, $paymentCategory, $orderId, $amount, $metadata);

                case 'online':
                    return $this->processOnlinePayment($user, $paymentCategory, $orderId, $amount, $metadata, $data);

                default:
                    return $this->errorResponse('Unknown payment type');
            }
        } catch (\Exception $e) {
            Log::error('[WPay] Payment processing error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->errorResponse('Payment processing failed: ' . $e->getMessage());
        }
    }

    /**
     * Process FREE payment (using bonus until RM0)
     */
    protected function processFreePayment(WPayUser $user, string $category, string $orderId, float $amount, array $metadata): array
    {
        Log::info('[WPay] Processing free payment', [
            'email' => $user->email,
            'amount' => $amount,
            'bonus_available' => $user->bonus
        ]);

        // For free payments, the total should be 0 (fully covered by bonus)
        if ($amount > (float) $user->bonus) {
            return $this->errorResponse('Insufficient bonus balance for free payment. Available: RM' . number_format($user->bonus, 2));
        }

        return DB::transaction(function () use ($user, $category, $orderId, $amount, $metadata) {
            // Deduct from bonus
            $bonusUsed = $amount;
            $user->deductBonus($bonusUsed);

            // Create transaction
            $transaction = WPayTransaction::create([
                'wpay_user_id' => $user->id,
                'email' => $user->email,
                'app_source' => $user->app_source,
                'order_id' => $orderId,
                'payment_category' => $category,
                'payment_type' => 'free',
                'amount' => $amount,
                'bonus_used' => $bonusUsed,
                'status' => 'success',
                'completed_at' => now(),
                'metadata' => $metadata,
            ]);

            // NO stars awarded for free/bonus payments (stars only for topup and FPX payments)
            $starsAwarded = 0;

            Log::info('[WPay] Free payment completed', [
                'order_id' => $orderId,
                'bonus_used' => $bonusUsed,
                'stars_awarded' => $starsAwarded
            ]);

            // Sync with Supabase for CMS visibility
            try {
                $this->syncWithSupabase($transaction, $user, $metadata);
            } catch (\Exception $e) {
                // Log the sync failure but don't fail the payment
                Log::error('[WPay] Free payment completed but Supabase sync failed', [
                    'order_id' => $orderId,
                    'error' => $e->getMessage()
                ]);
            }

            return $this->successResponse($user, $transaction);
        });
    }

    /**
     * Process W-Balance payment
     */
    protected function processWBalancePayment(WPayUser $user, string $category, string $orderId, float $amount, array $metadata): array
    {
        Log::info('[WPay] Processing wbalance payment', [
            'email' => $user->email,
            'amount' => $amount,
            'wbalance_available' => $user->wbalance,
            'bonus_available' => $user->bonus
        ]);

        // Calculate how much can be paid from bonus first, then wbalance
        $userRequestedBonus = isset($metadata['use_bonus']) ? (float) $metadata['use_bonus'] : null;

        // If user specified bonus amount, use that as cap (but not more than available or amount)
        if ($userRequestedBonus !== null) {
            $bonusUsed = min((float) $user->bonus, $amount, $userRequestedBonus);
        } else {
            // Default behavior: Maximize bonus usage
            $bonusUsed = min((float) $user->bonus, $amount);
        }

        $remainingAfterBonus = $amount - $bonusUsed;
        $wbalanceUsed = min((float) $user->wbalance, $remainingAfterBonus);
        $totalCovered = $bonusUsed + $wbalanceUsed;

        if ($totalCovered < $amount - 0.01) { // Add small epsilon for float comparison
            return $this->errorResponse('Insufficient balance. Need: RM' . number_format($amount, 2) .
                ', Available: RM' . number_format($totalCovered, 2) .
                ' (WBalance: RM' . number_format($user->wbalance, 2) .
                ', Bonus: RM' . number_format($user->bonus, 2) . ')');
        }

        return DB::transaction(function () use ($user, $category, $orderId, $amount, $metadata, $bonusUsed, $wbalanceUsed) {
            // Deduct from bonus first
            if ($bonusUsed > 0) {
                $user->deductBonus($bonusUsed);
            }

            // Deduct from wbalance
            if ($wbalanceUsed > 0) {
                $user->deductWBalance($wbalanceUsed);
            }

            // Create transaction
            $transaction = WPayTransaction::create([
                'wpay_user_id' => $user->id,
                'email' => $user->email,
                'app_source' => $user->app_source,
                'order_id' => $orderId,
                'payment_category' => $category,
                'payment_type' => 'wbalance',
                'amount' => $amount,
                'wbalance_used' => $wbalanceUsed,
                'bonus_used' => $bonusUsed,
                'status' => 'success',
                'completed_at' => now(),
                'metadata' => $metadata,
            ]);

            // NO stars awarded for W-Balance payments (stars only for topup and FPX payments)
            $starsAwarded = 0;

            Log::info('[WPay] WBalance payment completed', [
                'order_id' => $orderId,
                'wbalance_used' => $wbalanceUsed,
                'bonus_used' => $bonusUsed,
                'stars_awarded' => $starsAwarded
            ]);

            // Sync with Supabase for CMS visibility
            try {
                $this->syncWithSupabase($transaction, $user, $metadata);
            } catch (\Exception $e) {
                // Log the sync failure but don't fail the payment
                Log::error('[WPay] WBalance payment completed but Supabase sync failed', [
                    'order_id' => $orderId,
                    'error' => $e->getMessage()
                ]);
            }

            return $this->successResponse($user, $transaction);
        });
    }

    /**
     * Process Online payment (via Fiuu)
     */
    protected function processOnlinePayment(WPayUser $user, string $category, string $orderId, float $amount, array $metadata, array $originalData): array
    {
        Log::info('[WPay] Processing online payment', [
            'email' => $user->email,
            'amount' => $amount,
            'category' => $category,
            'metadata' => $metadata
        ]);

        // Calculate topup bonus and stars - use package values from metadata if available
        $bonusToAward = 0;
        $baseStars = 0;
        $extraStars = 0;

        if ($category === 'topup') {
            // Use bonus_amount from package metadata if provided, otherwise calculate from tier
            if (isset($metadata['bonus_amount']) && $metadata['bonus_amount'] > 0) {
                $bonusToAward = (float) $metadata['bonus_amount'];
            } else {
                $bonusToAward = $amount * $user->getBonusPercentage();
            }

            // Use base_stars and extra_stars from package metadata if provided
            if (isset($metadata['base_stars'])) {
                $baseStars = (int) $metadata['base_stars'];
            }
            if (isset($metadata['extra_stars'])) {
                $extraStars = (int) $metadata['extra_stars'];
            }
        }

        // Create pending transaction
        $transaction = WPayTransaction::create([
            'wpay_user_id' => $user->id,
            'email' => $user->email,
            'app_source' => $user->app_source,
            'order_id' => $orderId,
            'payment_category' => $category,
            'payment_type' => 'online',
            'amount' => $amount,
            'online_paid' => $amount,
            'status' => 'pending',
            'topup_amount' => $category === 'topup' ? $amount : null,
            'bonus_awarded' => $category === 'topup' ? $bonusToAward : null,
            'stars_awarded' => $category === 'topup' ? ($baseStars + $extraStars) : null,
            'metadata' => $metadata,
        ]);

        // Generate Fiuu payment data with WPay-specific callback URLs
        $paymentMethod = $originalData['payment_method'] ?? 'card';
        $customerName = $originalData['customer_name'] ?? $user->email;
        $customerEmail = $user->email;
        $customerPhone = $originalData['customer_phone'] ?? '';
        $productName = $originalData['product_name'] ?? ($category === 'topup' ? 'WPay Topup' : 'WPay Checkout');
        $customerCountry = $originalData['customer_country'] ?? 'MY';

        // WPay-specific callback URLs
        $wpayCallbackUrl = config('app.url') . '/wpay/callback';
        $wpayReturnUrl = config('app.url') . '/wpay/return';

        $paymentData = $this->fiuuService->generatePaymentData(
            $amount,
            $orderId,
            $customerName,
            $customerEmail,
            $customerPhone,
            $productName,
            $customerCountry,
            $paymentMethod,
            $wpayCallbackUrl,  // Custom callback URL for WPay
            $wpayReturnUrl     // Custom return URL for WPay
        );

        Log::info('[WPay] Online payment initiated', [
            'order_id' => $orderId,
            'payment_url' => $paymentData['payment_url']
        ]);

        return [
            'wpay_status' => 'pending',
            'message' => 'Online payment initiated. Redirect user to payment gateway.',
            'email' => $user->email,
            'order_id' => $orderId,
            'transaction_id' => $transaction->id,
            'payment_url' => $paymentData['payment_url'],
            'payment_data' => $paymentData['form_data'],
            'expected_bonus' => $bonusToAward,
        ];
    }

    /**
     * Handle Fiuu callback (webhook)
     */
    public function handleFiuuCallback(array $data): array
    {
        try {
            Log::info('[WPay] Fiuu callback received', $data);

            // Verify signature (skip if manual complete)
            $skipVerification = $data['skip_verification'] ?? false;
            if (!$skipVerification && !$this->fiuuService->verifyCallback($data)) {
                Log::error('[WPay] Invalid callback signature');
                return ['success' => false, 'message' => 'Invalid signature'];
            }

            $orderId = $data['orderid'] ?? null;
            $status = $data['status'] ?? null;
            $tranId = $data['tranID'] ?? null;
            $statusCode = $data['status_code'] ?? $status;

            if (!$orderId) {
                return ['success' => false, 'message' => 'Missing order_id'];
            }

            $transaction = WPayTransaction::where('order_id', $orderId)->first();
            if (!$transaction) {
                Log::error('[WPay] Transaction not found', ['order_id' => $orderId]);
                return ['success' => false, 'message' => 'Transaction not found'];
            }

            // Check if already processed
            if ($transaction->isCompleted()) {
                Log::info('[WPay] Transaction already completed', ['order_id' => $orderId]);
                return ['success' => true, 'message' => 'Already processed', 'idempotent' => true];
            }

            $isSuccess = ($status == '1' || $statusCode == '00');

            // Update transaction with Fiuu response
            $transaction->update([
                'fiuu_transaction_id' => $tranId,
                'fiuu_status_code' => $statusCode,
                'fiuu_response' => $data,
            ]);

            if ($isSuccess) {
                return $this->completeOnlinePayment($transaction);
            } else {
                $transaction->markAsFailed();
                Log::info('[WPay] Payment failed', ['order_id' => $orderId]);
                return ['success' => true, 'message' => 'Payment marked as failed'];
            }
        } catch (\Exception $e) {
            Log::error('[WPay] Callback error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return ['success' => false, 'message' => 'Callback processing error'];
        }
    }

    /**
     * Complete an online payment after successful Fiuu callback
     */
    protected function completeOnlinePayment(WPayTransaction $transaction): array
    {
        return DB::transaction(function () use ($transaction) {
            $user = $transaction->wpayUser;

            if (!$user) {
                Log::error('[WPay] User not found for transaction', ['transaction_id' => $transaction->id]);
                return ['success' => false, 'message' => 'User not found'];
            }

            $amount = (float) $transaction->amount;
            $category = $transaction->payment_category;
            $metadata = is_array($transaction->metadata) ? $transaction->metadata : json_decode($transaction->metadata ?? '{}', true);

            if ($category === 'topup') {
                // Add to wbalance
                $user->addWBalance($amount);

                // Add to lifetime topups and recalculate tier
                $user->addLifetimeTopup($amount);

                // Award bonus from transaction (set during processOnlinePayment)
                $bonusToAward = (float) ($transaction->bonus_awarded ?? 0);
                if ($bonusToAward > 0) {
                    $user->addBonus($bonusToAward);
                }

                // Award stars from transaction (set during processOnlinePayment from package metadata)
                $starsAwarded = (int) ($transaction->stars_awarded ?? 0);
                if ($starsAwarded > 0) {
                    $user->addStars($starsAwarded);
                }

                Log::info('[WPay] Topup completed - WPay balances updated', [
                    'order_id' => $transaction->order_id,
                    'amount' => $amount,
                    'bonus_awarded' => $bonusToAward,
                    'stars_awarded' => $starsAwarded,
                    'new_wbalance' => $user->fresh()->wbalance,
                    'new_bonus' => $user->fresh()->bonus,
                    'new_stars' => $user->fresh()->stars,
                    'new_tier' => $user->tier_type
                ]);
            } else {
                // Checkout - award stars based on tier factor
                $starsAwarded = $user->calculateStarsForAmount($amount);
                $user->addStars($starsAwarded);
                $transaction->update(['stars_awarded' => $starsAwarded]);

                Log::info('[WPay] Checkout completed', [
                    'order_id' => $transaction->order_id,
                    'amount' => $amount,
                    'stars_awarded' => $starsAwarded
                ]);
            }

            $transaction->markAsSuccess();

            // Sync with Supabase for CMS visibility
            try {
                $this->syncWithSupabase($transaction, $user, $metadata);
            } catch (\Exception $e) {
                // Log the sync failure but don't fail the payment
                // Transaction is marked as success in WPay DB and can be synced later via reconciliation
                Log::error('[WPay] Payment completed but Supabase sync failed', [
                    'order_id' => $transaction->order_id,
                    'error' => $e->getMessage()
                ]);
            }

            return [
                'success' => true,
                'message' => 'Payment completed successfully',
                'wpay_status' => 'success',
                'profile' => $user->fresh()->getProfile(),
            ];
        });
    }

    /**
     * Handle user return from Fiuu (redirect after payment)
     */
    public function handleFiuuReturn(array $data): array
    {
        $orderId = $data['orderid'] ?? null;
        $status = $data['status'] ?? null;
        $statusCode = $data['status_code'] ?? $status;

        if (!$orderId) {
            return [
                'wpay_status' => 'failed',
                'message' => 'Missing order_id',
                'redirect_status' => 'error'
            ];
        }

        $transaction = WPayTransaction::where('order_id', $orderId)->first();
        if (!$transaction) {
            return [
                'wpay_status' => 'failed',
                'message' => 'Transaction not found',
                'redirect_status' => 'error'
            ];
        }

        $isSuccess = ($status == '1' || $statusCode == '00');

        // The callback should have already processed the payment
        // This is just for the user redirect
        return [
            'wpay_status' => $isSuccess ? 'success' : 'failed',
            'message' => $isSuccess ? 'Payment successful' : 'Payment failed',
            'email' => $transaction->email,
            'app_source' => $transaction->app_source,
            'order_id' => $orderId,
            'profile' => $transaction->wpayUser ? $transaction->wpayUser->getProfile() : null,
            'redirect_status' => $isSuccess ? 'success' : 'failed'
        ];
    }

    /**
     * Sync payment completion with Supabase for CMS visibility and frontend balance accuracy
     * Creates proper transactions in wallet_transactions, bonus_transactions, and stars_transactions
     *
     * @throws \Exception if sync fails critically
     */
    protected function syncWithSupabase(WPayTransaction $transaction, WPayUser $user, array $metadata): void
    {
        $supabaseUrl = env('SUPABASE_URL');
        $supabaseKey = env('SUPABASE_SERVICE_KEY');

        if (!$supabaseUrl || !$supabaseKey) {
            $error = '[WPay] Supabase credentials not configured';
            Log::error($error, [
                'order_id' => $transaction->order_id,
                'SUPABASE_URL' => $supabaseUrl ? 'SET' : 'NOT SET',
                'SUPABASE_SERVICE_KEY' => $supabaseKey ? 'SET' : 'NOT SET'
            ]);
            throw new \Exception($error);
        }

        $supabaseUserId = $metadata['user_id'] ?? null;

        if (!$supabaseUserId) {
            $error = '[WPay] No Supabase user_id in metadata - cannot sync';
            Log::error($error, [
                'order_id' => $transaction->order_id,
                'metadata' => $metadata
            ]);
            throw new \Exception($error);
        }

        try {

            $orderId = $transaction->order_id;
            $amount = (float) $transaction->amount;
            $category = $transaction->payment_category;
            $bonusAwarded = (float) ($transaction->bonus_awarded ?? 0);
            $starsAwarded = (int) ($transaction->stars_awarded ?? 0);

            Log::info('[WPay] Starting Supabase sync', [
                'order_id' => $orderId,
                'supabase_user_id' => $supabaseUserId,
                'category' => $category,
                'amount' => $amount,
                'bonus_awarded' => $bonusAwarded,
                'stars_awarded' => $starsAwarded,
                'supabase_url' => $supabaseUrl
            ]);

            // ========== 1. CREATE SHOP_ORDER (for CMS visibility) ==========
            try {
                $shopOrderData = [
                    'user_id' => $supabaseUserId,
                    'outlet_id' => null, // WPay transactions don't have physical outlet
                    'order_number' => $orderId,
                    'items' => [
                        [
                            'product_id' => $metadata['package_id'] ?? 'wpay-topup',
                            'product_name' => $category === 'topup' ? "W-Balance Top-up RM{$amount}" : "WPay Checkout",
                            'quantity' => 1,
                            'unit_price' => (float) $amount,
                            'total_price' => (float) $amount,
                        ]
                    ],
                    'subtotal' => (float) $amount,
                    'discount_amount' => 0,
                    'bonus_discount_amount' => 0,
                    'permanent_discount_amount' => 0,
                    'gross_sales' => (float) $amount,
                    'total_amount' => (float) $amount,
                    'payment_method' => 'card', // Use 'card' instead of 'online' to match Supabase constraint
                    'payment_type' => $category === 'topup' ? 'topup' : 'payment', // Topups get 'topup' type, checkouts get 'payment' type
                    'status' => 'completed',
                    'payment_status' => 'paid', // 'paid' not 'completed'
                    'metadata' => [
                        'is_topup' => $category === 'topup',
                        'wpay_order_id' => $orderId,
                        'wpay_transaction_id' => $transaction->id,
                        'app_source' => $transaction->app_source,
                        'package_id' => $metadata['package_id'] ?? null,
                        'topup_amount' => $category === 'topup' ? (float) $amount : null,
                        'bonus_awarded' => (float) $bonusAwarded,
                        'stars_awarded' => (int) $starsAwarded,
                        'completed_at' => now()->toIso8601String(),
                    ],
                ];

                // Check if this is an AI Genius purchase and generate code
                if (isset($metadata['package_id']) && str_contains($metadata['package_id'], 'aigenius')) {
                    $redemptionCode = $this->generateAIGeniusCode($transaction->email, $metadata['package_id']);
                    if ($redemptionCode) {
                        $shopOrderData['metadata']['redemption_code'] = $redemptionCode;
                        Log::info('[WPay] AI Genius Code Generated', ['code' => $redemptionCode]);
                    }
                }

                $response = \Illuminate\Support\Facades\Http::withHeaders([
                    'apikey' => $supabaseKey,
                    'Authorization' => 'Bearer ' . $supabaseKey,
                    'Content-Type' => 'application/json',
                    'Prefer' => 'return=representation',
                ])->post("{$supabaseUrl}/rest/v1/shop_orders", $shopOrderData);

                if ($response->successful()) {
                    Log::info('[WPay] Created shop_order in Supabase', ['order_id' => $orderId]);
                } else {
                    Log::error('[WPay] Failed to create shop_order', [
                        'status' => $response->status(),
                        'body' => $response->body()
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('[WPay] shop_order sync exception: ' . $e->getMessage());
            }

            // ========== 2. CREATE WALLET_TRANSACTION (for W-Balance calculation) ==========
            if ($category === 'topup') {
                try {
                    $walletData = [
                        'user_id' => $supabaseUserId,
                        'transaction_type' => 'topup',
                        'amount' => $amount,
                        'description' => "W-Balance Top-up RM" . number_format($amount, 2),
                        'status' => 'success',
                        'metadata' => [
                            'order_number' => $orderId,
                            'wpay_transaction_id' => $transaction->id,
                            'app_source' => $transaction->app_source,
                            'package_id' => $metadata['package_id'] ?? null,
                            'bonus_amount' => $bonusAwarded,
                            'base_stars' => $metadata['base_stars'] ?? 0,
                            'extra_stars' => $metadata['extra_stars'] ?? 0,
                        ]
                    ];

                    $response = \Illuminate\Support\Facades\Http::withHeaders([
                        'apikey' => $supabaseKey,
                        'Authorization' => 'Bearer ' . $supabaseKey,
                        'Content-Type' => 'application/json',
                        'Prefer' => 'return=representation',
                    ])->post("{$supabaseUrl}/rest/v1/wallet_transactions", $walletData);

                    if ($response->successful()) {
                        Log::info('[WPay] Created wallet_transaction in Supabase', ['order_id' => $orderId, 'amount' => $amount]);
                    } else {
                        Log::error('[WPay] Failed to create wallet_transaction', [
                            'status' => $response->status(),
                            'body' => $response->body()
                        ]);
                    }
                } catch (\Exception $e) {
                    Log::error('[WPay] wallet_transaction sync exception: ' . $e->getMessage());
                }

                // ========== 3. CREATE BONUS_TRANSACTION (for bonus balance) ==========
                if ($bonusAwarded > 0) {
                    try {
                        $bonusData = [
                            'user_id' => $supabaseUserId,
                            'transaction_type' => 'topup_bonus',
                            'amount' => $bonusAwarded,
                            'description' => "Bonus from RM" . number_format($amount, 2) . " top-up",
                            'source' => 'wallet_topup',
                            'metadata' => [
                                'order_number' => $orderId,
                                'wpay_transaction_id' => $transaction->id,
                                'app_source' => $transaction->app_source,
                                'topup_amount' => $amount,
                                'package_id' => $metadata['package_id'] ?? null,
                            ]
                        ];

                        $response = \Illuminate\Support\Facades\Http::withHeaders([
                            'apikey' => $supabaseKey,
                            'Authorization' => 'Bearer ' . $supabaseKey,
                            'Content-Type' => 'application/json',
                            'Prefer' => 'return=representation',
                        ])->post("{$supabaseUrl}/rest/v1/bonus_transactions", $bonusData);

                        if ($response->successful()) {
                            Log::info('[WPay] Created bonus_transaction in Supabase', ['order_id' => $orderId, 'bonus' => $bonusAwarded]);
                        } else {
                            Log::error('[WPay] Failed to create bonus_transaction', [
                                'status' => $response->status(),
                                'body' => $response->body()
                            ]);
                        }
                    } catch (\Exception $e) {
                        Log::error('[WPay] bonus_transaction sync exception: ' . $e->getMessage());
                    }
                }

                // ========== 4. CREATE STARS_TRANSACTION (for stars balance) ==========
                if ($starsAwarded > 0) {
                    try {
                        $starsData = [
                            'user_id' => $supabaseUserId,
                            'transaction_type' => 'earn',
                            'amount' => $starsAwarded,
                            'description' => "Stars from RM" . number_format($amount, 2) . " top-up",
                            'source' => 'wallet_topup',
                            'metadata' => [
                                'order_number' => $orderId,
                                'wpay_transaction_id' => $transaction->id,
                                'app_source' => $transaction->app_source,
                                'topup_amount' => $amount,
                                'package_id' => $metadata['package_id'] ?? null,
                                'base_stars' => $metadata['base_stars'] ?? 0,
                                'extra_stars' => $metadata['extra_stars'] ?? 0,
                            ]
                        ];

                        $response = \Illuminate\Support\Facades\Http::withHeaders([
                            'apikey' => $supabaseKey,
                            'Authorization' => 'Bearer ' . $supabaseKey,
                            'Content-Type' => 'application/json',
                            'Prefer' => 'return=representation',
                        ])->post("{$supabaseUrl}/rest/v1/stars_transactions", $starsData);

                        if ($response->successful()) {
                            Log::info('[WPay] Created stars_transaction in Supabase', ['order_id' => $orderId, 'stars' => $starsAwarded]);
                        } else {
                            Log::error('[WPay] Failed to create stars_transaction', [
                                'status' => $response->status(),
                                'body' => $response->body()
                            ]);
                        }
                    } catch (\Exception $e) {
                        Log::error('[WPay] stars_transaction sync exception: ' . $e->getMessage());
                    }
                }
            }

            // ========== USER SYNC (lifetime_topups only) ==========
            // NOTE: Supabase calculates balances from transactions (user_balances view)
            // The users table only stores lifetime_topups, not wbalance/bonus/stars columns
            // We already created transaction records above which will update the calculated balances
            try {
                $freshUser = $user->fresh();

                $response = \Illuminate\Support\Facades\Http::withHeaders([
                    'apikey' => $supabaseKey,
                    'Authorization' => 'Bearer ' . $supabaseKey,
                    'Content-Type' => 'application/json',
                    'Prefer' => 'return=representation',
                ])->patch("{$supabaseUrl}/rest/v1/users?id=eq.{$supabaseUserId}", [
                    // Only sync fields that exist as columns in Supabase users table
                    'lifetime_topups' => (float) $freshUser->lifetime_topups,
                    'updated_at' => now()->toIso8601String(),
                ]);

                if ($response->successful()) {
                    Log::info('[WPay] User lifetime_topups synced to Supabase', [
                        'user_id' => $supabaseUserId,
                        'category' => $category,
                        'lifetime_topups' => $freshUser->lifetime_topups,
                        // These are for logging only - actual Supabase balances come from transactions
                        'wpay_wbalance' => $freshUser->wbalance,
                        'wpay_bonus' => $freshUser->bonus,
                        'wpay_stars' => $freshUser->stars,
                        'wpay_tier' => $freshUser->tier_type,
                    ]);
                } else {
                    Log::error('[WPay] Failed to sync user to Supabase', [
                        'status' => $response->status(),
                        'body' => $response->body()
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('[WPay] User sync exception: ' . $e->getMessage());
            }

            Log::info('[WPay] Supabase sync completed', [
                'order_id' => $orderId,
                'supabase_user_id' => $supabaseUserId
            ]);
        } catch (\Exception $e) {
            Log::error('[WPay] Supabase sync failed: ' . $e->getMessage(), [
                'order_id' => $transaction->order_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            // Re-throw to ensure calling code knows sync failed
            throw new \Exception('[WPay] Supabase sync failed for order ' . $transaction->order_id . ': ' . $e->getMessage());
        }
    }

    /**
     * Get user profile by email
     */
    public function getProfile(string $email, ?string $appSource = null): ?array
    {
        $user = WPayUser::where('email', strtolower(trim($email)))
            ->where('app_source', $this->normalizeAppSource($appSource))
            ->first();

        if (!$user) {
            return null;
        }

        // Ensure tier is up to date (handles manual DB edits)
        $user->recalculateTier();

        return $user->getProfile();
    }

    /**
     * Get transaction by order_id
     */
    public function getTransaction(string $orderId, ?string $appSource = null): ?WPayTransaction
    {
        $query = WPayTransaction::where('order_id', $orderId);

        if ($appSource !== null && trim($appSource) !== '') {
            $query->where('app_source', $this->normalizeAppSource($appSource));
        }

        return $query->first();
    }

    /**
     * Public method to manually sync a transaction to Supabase
     */
    public function syncTransactionToSupabase(string $orderId, ?string $appSource = null): array
    {
        $transaction = $this->getTransaction($orderId, $appSource);

        if (!$transaction) {
            return ['wpay_status' => 'failed', 'message' => 'Transaction not found'];
        }

        if ($transaction->status !== 'success') {
            return ['wpay_status' => 'failed', 'message' => 'Transaction is not completed'];
        }

        $user = $transaction->wpayUser;
        if (!$user) {
            return ['wpay_status' => 'failed', 'message' => 'User not found'];
        }

        $metadata = is_array($transaction->metadata) ? $transaction->metadata : json_decode($transaction->metadata ?? '{}', true);

        // Call the sync method
        $this->syncWithSupabase($transaction, $user, $metadata);

        return [
            'wpay_status' => 'success',
            'message' => 'Sync completed - check Laravel logs for details',
            'order_id' => $orderId,
            'user_id' => $metadata['user_id'] ?? null,
            'amount' => $transaction->amount,
            'bonus_awarded' => $transaction->bonus_awarded,
            'stars_awarded' => $transaction->stars_awarded,
        ];
    }

    /**
     * Success response helper
     */
    protected function successResponse(WPayUser $user, WPayTransaction $transaction): array
    {
        return [
            'wpay_status' => 'success',
            'message' => 'Payment completed successfully',
            'email' => $user->email,
            'order_id' => $transaction->order_id,
            'app_source' => $transaction->app_source,
            'transaction_id' => $transaction->id,
            'profile' => $user->fresh()->getProfile(),
            'transaction_details' => [
                'amount' => (float) $transaction->amount,
                'wbalance_used' => (float) $transaction->wbalance_used,
                'bonus_used' => (float) $transaction->bonus_used,
                'stars_awarded' => (int) $transaction->stars_awarded,
            ],
        ];
    }

    /**
     * Error response helper
     */
    protected function errorResponse(string $message): array
    {
        return [
            'wpay_status' => 'failed',
            'message' => $message,
        ];
    }

    /**
     * Call AI Genius API to generate redemption code
     */
    protected function generateAIGeniusCode(string $email, string $packageId): ?string
    {
        try {
            // URL of AI Genius Service (Assumed running on port 8001 or configured env)
            $baseUrl = env('AIGENIUS_API_URL', 'http://127.0.0.1:8001');
            $url = $baseUrl . '/api/generate-code';

            Log::info('[WPay] Calling AI Genius API', ['url' => $url, 'email' => $email]);

            $response = \Illuminate\Support\Facades\Http::post($url, [
                'email' => $email,
                'package_type' => $packageId,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return $data['code'] ?? null;
            } else {
                Log::error('[WPay] AI Genius API Failed', ['status' => $response->status(), 'body' => $response->body()]);
                return null;
            }
        } catch (\Exception $e) {
            Log::error('[WPay] AI Genius API Exception', ['error' => $e->getMessage()]);
            return null;
        }
    }
}
