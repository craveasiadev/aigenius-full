<?php

use Illuminate\Support\Facades\Route;
use App\Models\WPayUser;
use App\Models\WPayTransaction;
use App\Services\WPayService;
use App\Services\FiuuPaymentService;
use Illuminate\Support\Facades\DB;

/*
|--------------------------------------------------------------------------
| WPay Test Routes
|--------------------------------------------------------------------------
|
| These routes are for testing the WPay API manually.
| Access via: /wpay-test/{test-name}
|
| ⚠️ REMOVE OR PROTECT THESE IN PRODUCTION!
|
*/

Route::prefix('wpay-test')->group(function () {

    /**
     * Test 1: Create a test user
     */
    Route::get('/create-user', function () {
        $user = WPayUser::create([
            'email' => 'test-' . time() . '@example.com',
            'lifetime_topups' => 0,
            'wbalance' => 100,
            'bonus' => 20,
            'stars' => 50,
            'tier_type' => 'bronze',
            'tier_factor' => 1.0,
        ]);

        return response()->json([
            'message' => 'Test user created',
            'user' => $user
        ]);
    });

    /**
     * Test 2: Process a FREE payment
     */
    Route::get('/test-free-payment', function () {
        $service = app(WPayService::class);

        // Create test user with bonus
        $email = 'test-free-' . time() . '@example.com';
        $user = WPayUser::create([
            'email' => $email,
            'wbalance' => 0,
            'bonus' => 50,
            'stars' => 0,
            'tier_type' => 'bronze',
            'tier_factor' => 1.0,
        ]);

        $result = $service->processPayment([
            'email' => $email,
            'payment_category' => 'checkout',
            'payment_type' => 'free',
            'order_id' => 'TEST-FREE-' . time(),
            'amount' => 25.00,
            'metadata' => ['test' => true]
        ]);

        return response()->json([
            'test' => 'Free Payment',
            'result' => $result,
            'user_after' => WPayUser::where('email', $email)->first()
        ]);
    });

    /**
     * Test 3: Process a W-Balance payment
     */
    Route::get('/test-wbalance-payment', function () {
        $service = app(WPayService::class);

        // Create test user with wbalance
        $email = 'test-wbalance-' . time() . '@example.com';
        $user = WPayUser::create([
            'email' => $email,
            'wbalance' => 100,
            'bonus' => 30,
            'stars' => 0,
            'tier_type' => 'silver',
            'tier_factor' => 1.2,
        ]);

        $result = $service->processPayment([
            'email' => $email,
            'payment_category' => 'checkout',
            'payment_type' => 'wbalance',
            'order_id' => 'TEST-WBAL-' . time(),
            'amount' => 80.00,
            'metadata' => ['test' => true]
        ]);

        return response()->json([
            'test' => 'W-Balance Payment',
            'result' => $result,
            'user_after' => WPayUser::where('email', $email)->first()
        ]);
    });

    /**
     * Test 4: Process an Online payment (initiation only)
     */
    Route::get('/test-online-payment', function () {
        $service = app(WPayService::class);

        $email = 'test-online-' . time() . '@example.com';

        $result = $service->processPayment([
            'email' => $email,
            'payment_category' => 'topup',
            'payment_type' => 'online',
            'order_id' => 'TEST-ONLINE-' . time(),
            'amount' => 50.00,
            'payment_method' => 'card',
            'customer_name' => 'Test User',
            'customer_phone' => '0123456789',
            'product_name' => 'WPay Topup RM50',
            'metadata' => ['test' => true]
        ]);

        return response()->json([
            'test' => 'Online Payment Initiation',
            'result' => $result,
            'note' => 'This creates a pending transaction. Use the payment_url to complete the payment.'
        ]);
    });

    /**
     * Test 5: Test tier calculation
     */
    Route::get('/test-tiers', function () {
        $tests = [];

        $amounts = [0, 100, 299, 300, 500, 999, 1000, 2000, 2499, 2500, 4000, 4999, 5000, 10000];

        foreach ($amounts as $amount) {
            $email = 'test-tier-' . $amount . '-' . time() . '@example.com';
            $user = WPayUser::create([
                'email' => $email,
                'lifetime_topups' => $amount,
                'wbalance' => 0,
                'bonus' => 0,
                'stars' => 0,
                'tier_type' => 'bronze',
                'tier_factor' => 1.0,
            ]);

            $user->recalculateTier();
            $user->refresh();

            $tests[] = [
                'lifetime_topups' => $amount,
                'tier' => $user->tier_type,
                'tier_factor' => $user->tier_factor,
                'bonus_pct' => $user->getBonusPercentage() * 100 . '%',
            ];
        }

        return response()->json([
            'test' => 'Tier Calculation',
            'tier_thresholds' => WPayUser::TIER_THRESHOLDS,
            'results' => $tests
        ]);
    });

    /**
     * Test 6: View all WPay users
     */
    Route::get('/users', function () {
        return response()->json([
            'users' => WPayUser::orderBy('created_at', 'desc')->limit(20)->get()
        ]);
    });

    /**
     * Test 7: View all WPay transactions
     */
    Route::get('/transactions', function () {
        return response()->json([
            'transactions' => WPayTransaction::with('wpayUser')->orderBy('created_at', 'desc')->limit(20)->get()
        ]);
    });

    /**
     * Test 8: Simulate Fiuu callback (for testing without actual payment)
     */
    Route::get('/simulate-callback/{orderId}', function (string $orderId) {
        $transaction = WPayTransaction::where('order_id', $orderId)->first();

        if (!$transaction) {
            return response()->json(['error' => 'Transaction not found'], 404);
        }

        // Simulate successful callback
        $service = app(WPayService::class);

        // Note: This bypasses signature verification for testing
        $transaction->update([
            'fiuu_transaction_id' => 'SIM-' . time(),
            'fiuu_status_code' => '00',
            'fiuu_response' => ['simulated' => true, 'status' => '1'],
        ]);

        // Mark as success and process rewards
        DB::transaction(function () use ($transaction) {
            $user = $transaction->wpayUser;
            $amount = (float) $transaction->amount;
            $category = $transaction->payment_category;

            if ($category === 'topup') {
                $user->addWBalance($amount);
                $user->addLifetimeTopup($amount);

                $bonusToAward = (float) $transaction->bonus_awarded;
                if ($bonusToAward > 0) {
                    $user->addBonus($bonusToAward);
                }

                $starsAwarded = $user->calculateStarsForAmount($amount);
                $user->addStars($starsAwarded);
                $transaction->update(['stars_awarded' => $starsAwarded]);
            } else {
                $starsAwarded = $user->calculateStarsForAmount($amount);
                $user->addStars($starsAwarded);
                $transaction->update(['stars_awarded' => $starsAwarded]);
            }

            $transaction->markAsSuccess();
        });

        $transaction->refresh();

        return response()->json([
            'message' => 'Callback simulated successfully',
            'transaction' => $transaction,
            'user' => $transaction->wpayUser->getProfile()
        ]);
    });

    /**
     * Test 9: Cleanup test data
     */
    Route::get('/cleanup', function () {
        $deletedUsers = WPayUser::where('email', 'like', 'test-%')->delete();
        $deletedTx = WPayTransaction::where('order_id', 'like', 'TEST-%')->delete();

        return response()->json([
            'message' => 'Test data cleaned up',
            'deleted_users' => $deletedUsers,
            'deleted_transactions' => $deletedTx
        ]);
    });

    /**
     * Test 10: Full flow test
     */
    Route::get('/full-flow', function () {
        $service = app(WPayService::class);
        $results = [];
        $email = 'fulltest-' . time() . '@example.com';

        // Step 1: Get/create user (new user)
        $user = $service->getOrCreateUser($email);
        $results['step1_user_created'] = $user->toArray();

        // Step 2: Add some wbalance and bonus manually
        $user->addWBalance(200);
        $user->addBonus(50);
        $user->save();
        $results['step2_balances_added'] = $user->fresh()->toArray();

        // Step 3: Make a checkout payment using wbalance
        $checkoutResult = $service->processPayment([
            'email' => $email,
            'payment_category' => 'checkout',
            'payment_type' => 'wbalance',
            'order_id' => 'FULLTEST-' . time() . '-1',
            'amount' => 75.00,
        ]);
        $results['step3_checkout'] = $checkoutResult;

        // Step 4: Check user profile after checkout
        $results['step4_after_checkout'] = $user->fresh()->getProfile();

        // Step 5: Make a free payment using bonus
        $freeResult = $service->processPayment([
            'email' => $email,
            'payment_category' => 'checkout',
            'payment_type' => 'free',
            'order_id' => 'FULLTEST-' . time() . '-2',
            'amount' => 25.00,
        ]);
        $results['step5_free_payment'] = $freeResult;

        // Step 6: Final profile
        $results['step6_final_profile'] = $user->fresh()->getProfile();

        return response()->json([
            'test' => 'Full Flow Test',
            'email' => $email,
            'results' => $results
        ]);
    });
});
