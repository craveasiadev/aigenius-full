<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\WPayController;
use App\Http\Controllers\OTPController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\GachaController;
use App\Http\Controllers\AIFamboxController;
use App\Http\Controllers\Api\AIGeniusPaymentController;
use App\Http\Controllers\Api\AIpreneurPricingController;
use App\Http\Controllers\Api\AIpreneurClassController;
use App\Http\Controllers\SuperAdmin\EventWorkshopController;

/*
|--------------------------------------------------------------------------
| Payment Gateway Routes
|--------------------------------------------------------------------------
|
| This Laravel backend serves as a payment gateway proxy for Fiuu
| and handles the WPay wallet system.
|
*/

Route::get('/', function () {
    return response()->json([
        'service' => 'Artventure API',
        'status' => 'ok',
        'timestamp' => now()->toIso8601String(),
    ]);
});

// ========================================
// LEGACY PAYMENT ROUTES (for backward compatibility)
// ========================================
Route::post('/payments/initiate', [PaymentController::class, 'initiate']);
Route::post('/payments/callback', [PaymentController::class, 'callback'])->name('payment.callback');
Route::match(['get', 'post'], '/payments/return', [PaymentController::class, 'return'])->name('payment.return');
Route::get('/payments/transaction/{orderId}', [PaymentController::class, 'getTransaction']);

// ========================================
// WPAY ROUTES (New Payment System)
// ========================================
// Main payment processing endpoint (from Bolt)
Route::post('/wpay/process', [WPayController::class, 'process']);

// Fiuu webhook callback (server-to-server)
Route::post('/wpay/callback', [WPayController::class, 'callback'])->name('wpay.callback');

// User return URL after payment (Fiuu redirect)
Route::match(['get', 'post'], '/wpay/return', [WPayController::class, 'return'])->name('wpay.return');

// Profile and transaction endpoints
Route::get('/wpay/profile/{email}', [WPayController::class, 'getProfile']);
Route::get('/wpay/transaction/{orderId}', [WPayController::class, 'getTransaction']);

// Topup preview (calculate rewards before processing)
Route::post('/wpay/topup-preview', [WPayController::class, 'topupPreview']);

// Tier information
Route::get('/wpay/tiers', [WPayController::class, 'getTiers']);

// Manual complete (for development when Fiuu callback can't reach localhost)
Route::post('/wpay/complete/{orderId}', [WPayController::class, 'manualComplete']);

// Manual sync to Supabase (for fixing data discrepancies)
Route::post('/wpay/sync/{orderId}', [WPayController::class, 'syncToSupabase']);

// Admin/Finance Dashboard Routes (same pattern as /wpay/profile)
Route::get('/wpay/admin/transactions', [WPayController::class, 'getAllTransactions']);
Route::get('/wpay/admin/users', [WPayController::class, 'getAllUsers']);
Route::post('/wpay/admin/users', [WPayController::class, 'createUser']);
Route::get('/wpay/admin/stats', [WPayController::class, 'getStats']);
Route::put('/wpay/admin/transaction/{id}', [WPayController::class, 'updateTransaction']);
Route::delete('/wpay/admin/transaction/{id}', [WPayController::class, 'deleteTransaction']);
Route::post('/wpay/admin/cleanup-duplicates', [WPayController::class, 'cleanupDuplicates']);
Route::post('/wpay/admin/sync', [WPayController::class, 'syncFromSupabase']);
Route::get('/wpay/admin/test-transactions', [WPayController::class, 'getTestTransactions']);
Route::post('/wpay/admin/reconcile', [WPayController::class, 'reconcileMissingTransactions']);
Route::get('/wpay/admin/pending', [WPayController::class, 'getPendingTransactions']);
Route::post('/wpay/admin/sync-payment-status', [WPayController::class, 'syncPaymentStatusToSupabase']);

// ========================================
// AI GENIUS PAYMENT ROUTES
// ========================================
// Separate payment system for AI Genius (AI Tokens & Coins)
// Does not conflict with other payment routes
Route::post('/aigenius/payments/initiate', [AIGeniusPaymentController::class, 'initiate']);
Route::post('/aigenius/payments/callback', [AIGeniusPaymentController::class, 'callback'])->name('aigenius.payment.callback');
Route::match(['get', 'post'], '/aigenius/payments/return', [AIGeniusPaymentController::class, 'return'])->name('aigenius.payment.return');
Route::get('/aigenius/payments/history', [AIGeniusPaymentController::class, 'history']);
Route::get('/aigenius/payments/balance', [AIGeniusPaymentController::class, 'balance']);
Route::get('/aigenius/pricing/catalog', [AIpreneurPricingController::class, 'catalog']);
Route::post('/aigenius/payments/complete/{orderId}', [AIGeniusPaymentController::class, 'manualComplete']); // For testing when Fiuu callback can't reach localhost

// ========================================
// AI PRENEUR CLASS PAYMENT ROUTES
// ========================================
Route::post('/aipreneur/classes/payment/callback', [AIpreneurClassController::class, 'paymentCallback'])->name('aipreneur.classes.payment.callback');
Route::match(['get', 'post'], '/aipreneur/classes/payment/return', [AIpreneurClassController::class, 'paymentReturn'])->name('aipreneur.classes.payment.return');

// ========================================
// GACHA ROUTES
// ========================================
// Process a gacha spin (deduct stars/free spin, award prize)
Route::post('/api/gacha/spin', [GachaController::class, 'spin']);

// Get user's gacha-related balances
Route::get('/api/gacha/balance/{email}', [GachaController::class, 'getBalance']);

// ========================================
// UTILITY ROUTES
// ========================================

// Debug route for auth verification
Route::get('/debug/auth-check', function (\Illuminate\Http\Request $request) {
    $user = \App\Models\User::first();
    if (!$user) return response()->json(['error' => 'No user found'], 404);

    $tokenObj = $user->createToken('debug-check');
    $plainToken = $tokenObj->plainTextToken;
    $parts = explode('|', $plainToken);
    $tokenId = $parts[0];
    $tokenSecret = $parts[1] ?? '';

    $dbToken = \Laravel\Sanctum\PersonalAccessToken::find($tokenId);
    if (!$dbToken) return response()->json(['error' => 'Token not in DB', 'token_id' => $tokenId], 500);

    $hashValid = hash_equals($dbToken->token, hash('sha256', $tokenSecret));

    return response()->json([
        'user_id' => $user->id,
        'user_id_type' => gettype($user->id),
        'tokenable_id' => $dbToken->tokenable_id,
        'tokenable_id_type' => gettype($dbToken->tokenable_id),
        'ids_match' => ($user->id === $dbToken->tokenable_id),
        'ids_match_loose' => ($user->id == $dbToken->tokenable_id),
        'hash_valid' => $hashValid,
        'token_id' => $tokenId,
    ]);
});

// Health check endpoint
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'WPay Payment Gateway',
        'version' => '2.0',
        'timestamp' => now()->toIso8601String()
    ]);
});

// Debug route to check incoming auth
Route::get('/debug/request-info', function (\Illuminate\Http\Request $request) {
    $token = $request->bearerToken();
    $authHeader = $request->header('Authorization');

    $user = null;
    $tokenValid = false;

    if ($token) {
        $parts = explode('|', $token);
        if (count($parts) === 2) {
            $tokenId = $parts[0];
            $plainToken = $parts[1];

            $accessToken = \Laravel\Sanctum\PersonalAccessToken::find($tokenId);
            if ($accessToken) {
                $tokenValid = hash_equals($accessToken->token, hash('sha256', $plainToken));
                if ($tokenValid) {
                    $user = $accessToken->tokenable;
                }
            }
        }
    }

    return response()->json([
        'has_auth_header' => !empty($authHeader),
        'auth_header_preview' => $authHeader ? substr($authHeader, 0, 30) . '...' : null,
        'has_bearer_token' => !empty($token),
        'token_preview' => $token ? substr($token, 0, 20) . '...' : null,
        'token_valid' => $tokenValid,
        'user_found' => $user ? true : false,
        'user_id' => $user?->id,
    ]);
});

// Debug endpoint to check Supabase config
Route::get('/debug/supabase', function () {
    $supabaseUrl = env('SUPABASE_URL');
    $supabaseKey = env('SUPABASE_SERVICE_KEY');

    return response()->json([
        'SUPABASE_URL' => $supabaseUrl ? 'SET (' . substr($supabaseUrl, 0, 30) . '...)' : 'NOT SET',
        'SUPABASE_SERVICE_KEY' => $supabaseKey ? 'SET (' . strlen($supabaseKey) . ' chars)' : 'NOT SET',
        'app_url' => config('app.url'),
    ]);
});

Route::post('/otp/send', [OTPController::class, 'sendOTP']);
Route::post('/otp/verify', [OTPController::class, 'verifyOTP']);

// ========================================
// PUBLIC REWARD IMAGE PROXY (CORS-safe)
// ========================================
Route::get('/reward-images/{filename}', function (string $filename) {
    $path = storage_path('app/public/reward-images/' . $filename);

    if (!file_exists($path)) {
        abort(404);
    }

    $mime = mime_content_type($path) ?: 'image/jpeg';

    return response()->file($path, [
        'Content-Type' => $mime,
        'Access-Control-Allow-Origin' => '*',
        'Cache-Control' => 'public, max-age=31536000',
    ]);
})->where('filename', '[a-zA-Z0-9_\-\.]+')->name('reward.image');

// Password Reset Routes
Route::post('/password/forgot', [PasswordResetController::class, 'sendResetLink']);
Route::post('/password/reset', [PasswordResetController::class, 'resetPassword']);
Route::post('/password/verify-token', [PasswordResetController::class, 'verifyToken']);

// ========================================
// E-INVOICE ROUTES (Malaysia LHDN MyInvois)
// ========================================
Route::get('/einvoice/request/{order_id}', [App\Http\Controllers\EInvoiceController::class, 'requestForm'])
    ->where('order_id', '.*'); // Allow UUIDs and other formats
Route::post('/einvoice/submit/{order_id}', [App\Http\Controllers\EInvoiceController::class, 'submit'])
    ->where('order_id', '.*');
Route::get('/einvoice/qr/{lhdn_uuid}', [App\Http\Controllers\EInvoiceController::class, 'generateQRCode'])
    ->where('lhdn_uuid', '.*');

// ========================================
// ADMIN SYNC ROUTES (One-time migrations)
// ========================================
Route::get('/admin/sync-old-topups', [App\Http\Controllers\AdminSyncController::class, 'syncOldTopups']);
Route::post('/admin/sync-payment-status', [App\Http\Controllers\AdminSyncController::class, 'syncPaymentStatus']);

// ========================================
// AI FAMBOX ROUTES
// ========================================
Route::prefix('aifambox')->name('aifambox.')->group(function () {
    Route::get('/', [AIFamboxController::class, 'index'])->name('index');
    Route::post('/upload', [AIFamboxController::class, 'upload'])->name('upload');
    Route::get('/gallery', [AIFamboxController::class, 'gallery'])->name('gallery');
    Route::get('/preview/{session_id}', [AIFamboxController::class, 'preview'])->name('preview');
    Route::get('/status/{session_id}', [AIFamboxController::class, 'status'])->name('status');
    Route::post('/regenerate/{session_id}', [AIFamboxController::class, 'regenerate'])->name('regenerate');
});

// ========================================
// AIGENIUS / AIPRENEUR ROUTES (moved from api.php)
// ========================================
use App\Http\Controllers\Api\AIpreneurController;
use App\Http\Controllers\Api\EngagementController;
use App\Http\Controllers\Api\AuthController;

// General Auth Routes
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/register/student', [AuthController::class, 'registerStudent']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

// Shop image proxy (no auth, serves images with CORS headers for frontend)
Route::get('/aipreneur/shop-image/{filename}', [AIpreneurController::class, 'getShopImage'])
    ->where('filename', '.*');

// Product image proxy (no auth, serves images with CORS headers for frontend)
Route::get('/aipreneur/product-image/{filename}', [AIpreneurController::class, 'getProductImage'])
    ->where('filename', '.*');

// Interior asset image proxy (no auth, serves images with CORS headers for frontend)
Route::get('/aipreneur/interior-asset/{filename}', [AIpreneurController::class, 'getInteriorAsset'])
    ->where('filename', '.*');

// Marketing asset image proxy (no auth, serves images with CORS headers for frontend)
Route::get('/aipreneur/marketing-asset/{filename}', [AIpreneurController::class, 'getMarketingAsset'])
    ->where('filename', '.*');

// Influencer avatar proxy (no auth, serves images with CORS headers for frontend)
Route::get('/aipreneur/influencer-avatar/{filename}', [AIpreneurController::class, 'getInfluencerAvatar'])
    ->where('filename', '.*');

// Innovation design image proxy (no auth, serves images with CORS headers for frontend)
Route::get('/aipreneur/innovation-image/{filename}', [AIpreneurController::class, 'getInnovationImage'])
    ->where('filename', '.*');

// AIpreneur Public routes (no auth required)
Route::prefix('aipreneur')->group(function () {
    // OpenAI usage logging (called from frontend)
    Route::post('/openai/log-usage', function (\Illuminate\Http\Request $request) {
        try {
            \App\Models\OpenAIUsageLog::create([
                'user_type' => $request->input('user_type', 'genius'),
                'user_id' => $request->input('user_id'),
                'service' => $request->input('service', 'unknown'),
                'model' => $request->input('model', 'gpt-4o-mini'),
                'prompt_tokens' => (int) $request->input('prompt_tokens', 0),
                'completion_tokens' => (int) $request->input('completion_tokens', 0),
                'total_tokens' => (int) $request->input('total_tokens', 0),
                'estimated_cost_usd' => (float) $request->input('estimated_cost', 0),
                'purpose' => $request->input('purpose'),
                'metadata' => $request->input('metadata'),
            ]);
        } catch (\Throwable) {
            // Silent fail — non-critical logging
        }
        return response()->json(['ok' => true]);
    });

    // Authentication
    Route::post('/auth/login', [AIpreneurController::class, 'geniusLogin']);

    // Public shop page (no auth required)
    Route::get('/public-shop/{slug}', [AIpreneurController::class, 'getPublicShop']);
    Route::post('/public-shop/{slug}/like', [AIpreneurController::class, 'likePublicShop']);
    Route::get('/public-shops', [AIpreneurController::class, 'searchPublicShops']);

    // Parent creates child profile (requires parent auth)
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/profiles', [AIpreneurController::class, 'createProfile']);
        Route::post('/profiles/link-existing', [AIpreneurController::class, 'linkExistingChild']);
        Route::get('/profiles', [AIpreneurController::class, 'getProfiles']);
        Route::get('/profiles/{id}', [AIpreneurController::class, 'getProfileById']); // Parent gets single profile
        Route::post('/profiles/{id}', [AIpreneurController::class, 'updateProfileById']); // Parent updates profile
        Route::post('/profiles/{id}/persona-quiz', [AIpreneurController::class, 'submitPersonaQuiz']); // Parent submits quiz
        Route::get('/profiles/{id}/persona', [AIpreneurController::class, 'getPersonaProfileForParent']); // Parent views persona
        Route::post('/auth/parent-login-as-child', [AIpreneurController::class, 'parentLoginAsChild']); // Parent login as child
        Route::get('/ai/token-usage', [AIpreneurController::class, 'getTokenUsage']);
        Route::get('/classes/parent', [AIpreneurClassController::class, 'getParentBookings']);
        Route::get('/classes/catalog', [AIpreneurClassController::class, 'getParentClassCatalog']);
        Route::post('/classes/book-for-child', [AIpreneurClassController::class, 'bookClassForChild']);
    });
});

// AIpreneur Protected routes (genius auth required)
Route::prefix('aipreneur')->middleware('auth.genius')->group(function () {
    // Authentication
    Route::post('/auth/logout', [AIpreneurController::class, 'geniusLogout']);
    Route::get('/auth/me', [AIpreneurController::class, 'getCurrentProfile']);
    Route::get('/auth/session-check', [AIpreneurController::class, 'sessionCheck']);

    // Profile
    Route::put('/profile', [AIpreneurController::class, 'updateProfile']);
    Route::post('/profile/onboarding', [AIpreneurController::class, 'updateOnboarding']);
    Route::post('/persona-quiz', [AIpreneurController::class, 'submitPersonaQuizSelf']);
    Route::get('/persona/profile', [AIpreneurController::class, 'getPersonaProfile']);

    // Business
    Route::get('/business', [AIpreneurController::class, 'getBusiness']);
    Route::put('/business', [AIpreneurController::class, 'updateBusiness']);
    Route::post('/business/progress', [AIpreneurController::class, 'updateModuleProgress']);

    // Products
    Route::get('/products', [AIpreneurController::class, 'getProducts']);
    Route::post('/products', [AIpreneurController::class, 'createProduct']);
    Route::put('/products/{productId}', [AIpreneurController::class, 'updateProduct']);
    Route::delete('/products/{productId}', [AIpreneurController::class, 'deleteProduct']);
    Route::post('/products/{productId}/regenerate-image', [AIpreneurController::class, 'regenerateProductImage']);
    Route::post('/products/{productId}/remix', [AIpreneurController::class, 'remixProductImage']);

    // Staff
    Route::get('/staff', [AIpreneurController::class, 'getStaff']);
    Route::post('/staff', [AIpreneurController::class, 'createStaff']);
    Route::post('/staff/initialize', [AIpreneurController::class, 'initializeStaff']);
    Route::put('/staff/{staffId}', [AIpreneurController::class, 'updateStaff']);
    Route::delete('/staff/{staffId}', [AIpreneurController::class, 'deleteStaff']);
    Route::post('/staff/hire', [AIpreneurController::class, 'hireStaff']);

    // Decorations
    Route::get('/decorations', [AIpreneurController::class, 'getDecorations']);
    Route::post('/decorations', [AIpreneurController::class, 'saveDecoration']);
    Route::post('/decorations/items', [AIpreneurController::class, 'saveDecorationItems']);

    // Interior Assets (AI-generated)
    Route::post('/interior-assets', [AIpreneurController::class, 'generateInteriorAsset']);

    // Interviews
    Route::get('/interviews', [AIpreneurController::class, 'getInterviews']);
    Route::post('/interviews', [AIpreneurController::class, 'startInterview']);
    Route::post('/interviews/{interviewId}/submit', [AIpreneurController::class, 'submitInterviewAnswers']);

    // Campaigns
    Route::get('/campaigns', [AIpreneurController::class, 'getCampaigns']);
    Route::post('/campaigns', [AIpreneurController::class, 'createCampaign']);

    // Marketing Assets
    Route::get('/marketing-assets', [AIpreneurController::class, 'getMarketingAssets']);
    Route::post('/marketing-assets', [AIpreneurController::class, 'createMarketingAsset']);
    Route::post('/marketing-assets/generate', [AIpreneurController::class, 'generateMarketingAsset']);

    // Influencer Campaigns
    Route::get('/influencer-campaigns', [AIpreneurController::class, 'getInfluencerCampaigns']);
    Route::post('/influencer-campaigns', [AIpreneurController::class, 'startInfluencerCampaign']);
    Route::delete('/influencer-campaigns/{campaignId}', [AIpreneurController::class, 'dismissInfluencerCampaign']);

    // Innovations
    Route::get('/innovations', [AIpreneurController::class, 'getInnovations']);
    Route::post('/innovations', [AIpreneurController::class, 'unlockInnovation']);
    Route::post('/innovations/{innovationId}/activate', [AIpreneurController::class, 'activateInnovation']);
    Route::post('/innovations/{innovationId}/deactivate', [AIpreneurController::class, 'deactivateInnovation']);
    Route::post('/innovations/{innovationId}/upgrade', [AIpreneurController::class, 'upgradeInnovation']);

    // Classes & Workshops
    Route::get('/classes', [AIpreneurClassController::class, 'getClasses']);
    Route::post('/classes/book', [AIpreneurClassController::class, 'bookClass']);

    // Leaderboard
    Route::get('/leaderboard', [AIpreneurController::class, 'getLeaderboard']);

    // Multi-user shop worlds (explore other players' shops, 8 per world).
    // `/worlds/count` is declared before `/worlds/{worldNumber}` and the
    // param is digits-only so the literal "count" path never matches it.
    Route::get('/worlds/count', [AIpreneurController::class, 'getWorldCount']);
    Route::get('/worlds/{worldNumber}', [AIpreneurController::class, 'getWorld'])->whereNumber('worldNumber');

    // Rewards
    Route::get('/rewards', [AIpreneurController::class, 'getRewards']);
    Route::post('/rewards/daily', [AIpreneurController::class, 'claimDailyReward']);
    Route::post('/rewards/add-coins', [AIpreneurController::class, 'addCoins']);
    Route::post('/rewards/add-xp', [AIpreneurController::class, 'addXp']);
    Route::post('/rewards/claim-achievement', [AIpreneurController::class, 'claimAchievement']);
    Route::get('/rewards/achievements', [AIpreneurController::class, 'getClaimedAchievements']);
    Route::post('/rewards/spend-coins', [AIpreneurController::class, 'spendCoins']);
    Route::post('/rewards/spend-ai-tokens', [AIpreneurController::class, 'spendAiTokens']);
    Route::get('/rewards/store-items', [AIpreneurController::class, 'getRewardStoreItems']);
    Route::post('/rewards/store-items/redeem', [AIpreneurController::class, 'redeemRewardStoreItem']);

    // Operation-based AI token economy (server-authoritative costs)
    Route::post('/tokens/check', [AIpreneurController::class, 'checkTokenBalance']);
    Route::post('/tokens/consume', [AIpreneurController::class, 'consumeTokens']);

    // Profit-to-Coins Conversion
    Route::get('/conversion/rate', [AIpreneurController::class, 'getConversionRate']);
    Route::post('/conversion/profit-to-coins', [AIpreneurController::class, 'convertProfitToCoins']);

    // CSR
    Route::get('/csr/status', [AIpreneurController::class, 'getCsrStatus']);
    Route::post('/csr/donate', [AIpreneurController::class, 'donateCsr']);

    // Shop Opening Quest & Simulator
    Route::get('/shop-opening-status', [AIpreneurController::class, 'getShopOpeningStatus']);
    Route::post('/ribbon-cutting', [AIpreneurController::class, 'completeRibbonCutting']);
    Route::post('/simulator/sale', [AIpreneurController::class, 'recordSimulatorSale']);
    Route::post('/simulator/visitor', [AIpreneurController::class, 'recordVisitor']);
    Route::get('/simulator/daily-stats', [AIpreneurController::class, 'getDailyStats']);
    Route::get('/traffic-multiplier', [AIpreneurController::class, 'getTrafficMultiplier']);

    // =============================================
    // ONBOARDING ROUTES (New Flow)
    // =============================================
    Route::prefix('onboarding')->group(function () {
        Route::get('/status', [App\Http\Controllers\Api\OnboardingController::class, 'status']);
        Route::post('/boss-intro', [App\Http\Controllers\Api\OnboardingController::class, 'completeBossIntro']);
        Route::post('/selfie', [App\Http\Controllers\Api\OnboardingController::class, 'uploadSelfie']);
        Route::post('/signboard', [App\Http\Controllers\Api\OnboardingController::class, 'uploadSignboard']);
        Route::post('/questionnaire', [App\Http\Controllers\Api\OnboardingController::class, 'saveQuestionnaire']);
        Route::post('/generate-shop', [App\Http\Controllers\Api\OnboardingController::class, 'generateShop']);
        Route::post('/regenerate-shop', [App\Http\Controllers\Api\OnboardingController::class, 'regenerateShop']);
        Route::get('/shop-status', [App\Http\Controllers\Api\OnboardingController::class, 'shopStatus']);
        Route::post('/complete', [App\Http\Controllers\Api\OnboardingController::class, 'complete']);
    });

    // =============================================
    // FINANCE ROUTES
    // =============================================
    Route::prefix('finance')->group(function () {
        Route::get('/', [App\Http\Controllers\Api\OnboardingController::class, 'getFinance']);
        Route::get('/transactions', [App\Http\Controllers\Api\OnboardingController::class, 'getTransactions']);
        Route::get('/game-status', [AIpreneurController::class, 'getFinanceGameStatus']);
        Route::post('/claim-game', [AIpreneurController::class, 'claimFinanceGameReward']);
    });

    // =============================================
    // ENGAGEMENT SYSTEM ROUTES
    // =============================================

    // Events
    Route::get('/events/active', [EngagementController::class, 'getActiveEvents']);
    Route::post('/events/{eventId}/complete', [EngagementController::class, 'completeEvent']);

    // Challenges
    Route::get('/challenges/active', [EngagementController::class, 'getActiveChallenges']);
    Route::post('/challenges/{challengeId}/complete', [EngagementController::class, 'completeChallenge']);
    Route::post('/challenges/{challengeId}/progress', [EngagementController::class, 'updateChallengeProgress']);
    Route::post('/challenges/assign-daily', [EngagementController::class, 'assignDailyChallenges']);

    // Life Events
    Route::get('/life-events/pending', [EngagementController::class, 'getPendingLifeEvents']);
    Route::post('/life-events/{lifeEventId}/resolve', [EngagementController::class, 'resolveLifeEvent']);
    Route::post('/life-events/trigger', [EngagementController::class, 'triggerRandomLifeEvent']);

    // Engagement Stats
    Route::get('/engagement/stats', [EngagementController::class, 'getEngagementStats']);
    Route::post('/engagement/streak', [EngagementController::class, 'updateStreak']);

    // System Config (read-only for students)
    Route::get('/system/config', [EngagementController::class, 'getSystemConfig']);

    // Market & Seasonal
    Route::get('/market/trends', [EngagementController::class, 'getMarketTrends']);
    Route::get('/seasonal/content', [EngagementController::class, 'getSeasonalContent']);

    // Workshop unlocks — student dashboard reads this to populate the
    // globe carousel after a staff scan.
    Route::get('/students/{student}/workshop-unlocks', [EventWorkshopController::class, 'apiUnlocksForStudent']);
});

// ── Workshop catalog (public read for the student globe) ──────────
Route::get('/workshop-shops', [EventWorkshopController::class, 'apiList']);

// Unlock POST — called both from the artventure Blade scanner
// (staff_event session) and from any frontend that knows a student id.
Route::post('/workshop-shops/{shop}/unlock', [EventWorkshopController::class, 'apiUnlock']);

require __DIR__ . '/aipreneur-admin.php';
require __DIR__ . '/superadmin.php';

Route::get('/debug/sanctum-test', function () {
    $user = \App\Models\User::first();
    if (!$user) return response()->json(['error' => 'No users found'], 404);

    $tokenObj = $user->createToken('test');
    $plainText = $tokenObj->plainTextToken;
    $tokenId = $tokenObj->accessToken->id;

    $dbToken = \Laravel\Sanctum\Sanctum::$personalAccessTokenModel::find($tokenId);

    if (!$dbToken) return response()->json(['error' => 'Token not found in DB'], 500);

    $dbTokenStr = $dbToken->token;
    $plainTokenStr = explode('|', $plainText)[1];

    $isValid = hash_equals($dbTokenStr, hash('sha256', $plainTokenStr));

    return response()->json([
        'user_id' => $user->id,
        'user_id_type' => gettype($user->id),
        'tokenable_id' => $dbToken->tokenable_id,
        'tokenable_id_type' => gettype($dbToken->tokenable_id),
        'match' => ($user->id == $dbToken->tokenable_id),
        'check' => $isValid,
        'plain_token' => $plainText,
    ]);
});
