<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GeniusProfile;
use App\Models\AIpreneurBusiness;
use App\Models\AIpreneurReward;
use App\Models\AIpreneurToken;
use App\Models\AIpreneurTransaction;
use App\Jobs\GenerateShopImageJob;
use App\Services\AIpreneurPricingService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class OnboardingController extends Controller
{
    // Starting amounts
    const STARTING_COINS = 0;
    const STARTING_TOKENS = 0;

    public function __construct(
        private readonly AIpreneurPricingService $pricingService
    ) {
    }

    /**
     * Get current onboarding status.
     */
    public function status(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;

        return response()->json([
            'success' => true,
            'stage' => $profile->onboarding_stage ?? 'not_started',
            'selfie_url' => $profile->selfie_url,
            'signboard_url' => $profile->signboard_url,
            'shop_image_status' => $profile->business?->shop_image_status ?? 'pending',
            'shop_image_url' => $profile->business?->shop_image_url,
        ]);
    }

    /**
     * Update onboarding stage (boss intro completed).
     */
    public function completeBossIntro(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;

        $profile->update([
            'onboarding_stage' => 'boss_intro_completed',
        ]);

        return response()->json([
            'success' => true,
            'stage' => 'boss_intro_completed',
        ]);
    }

    /**
     * Upload selfie image.
     */
    public function uploadSelfie(Request $request): JsonResponse
    {
        $request->validate([
            'selfie' => 'required|string', // Base64 encoded image
        ]);

        $profile = $request->genius_profile;

        // Decode base64 image
        $imageData = $request->selfie;

        // Remove data URL prefix if present
        if (preg_match('/^data:image\/(\w+);base64,/', $imageData, $matches)) {
            $imageData = substr($imageData, strpos($imageData, ',') + 1);
        }

        $imageData = base64_decode($imageData);

        if ($imageData === false) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid image data',
            ], 400);
        }

        // Generate filename and save
        $filename = 'selfies/' . $profile->id . '_' . time() . '.png';
        Storage::disk('public')->put($filename, $imageData);

        // Update profile
        $profile->update([
            'selfie_url' => Storage::disk('public')->url($filename),
            'onboarding_stage' => 'selfie_completed',
        ]);

        return response()->json([
            'success' => true,
            'selfie_url' => $profile->selfie_url,
            'stage' => 'selfie_completed',
        ]);
    }

    /**
     * Upload signboard drawing.
     */
    public function uploadSignboard(Request $request): JsonResponse
    {
        $request->validate([
            'signboard' => 'required|string', // Base64 encoded image
        ]);

        $profile = $request->genius_profile;

        // Decode base64 image
        $imageData = $request->signboard;

        // Remove data URL prefix if present
        if (preg_match('/^data:image\/(\w+);base64,/', $imageData, $matches)) {
            $imageData = substr($imageData, strpos($imageData, ',') + 1);
        }

        $imageData = base64_decode($imageData);

        if ($imageData === false) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid image data',
            ], 400);
        }

        // Generate filename and save
        $filename = 'signboards/' . $profile->id . '_' . time() . '.png';
        Storage::disk('public')->put($filename, $imageData);

        // Update profile
        $profile->update([
            'signboard_url' => Storage::disk('public')->url($filename),
            'onboarding_stage' => 'signboard_completed',
        ]);

        return response()->json([
            'success' => true,
            'signboard_url' => $profile->signboard_url,
            'stage' => 'signboard_completed',
        ]);
    }

    /**
     * Save questionnaire answers and trigger shop generation.
     */
    public function saveQuestionnaire(Request $request): JsonResponse
    {
        $request->validate([
            'passion_category' => 'required|string',
            'shop_theme' => 'required|string',
            'color_palette' => 'required|array',
            'unique_selling_point' => 'required|string',
            'shop_name' => 'required|string|min:3|max:50',
        ]);

        $profile = $request->genius_profile;

        // Update profile with shop name and passion
        $profile->update([
            'passion_category' => $request->passion_category,
            'aipreneur_shop_name' => $request->shop_name,
            'onboarding_stage' => 'questionnaire_completed',
        ]);

        // Generate unique shop URL slug from shop name
        $baseSlug = Str::slug($request->shop_name);
        $slug = $baseSlug;
        $counter = 1;

        // Ensure uniqueness by adding a number suffix if needed
        while (AIpreneurBusiness::where('shop_url_slug', $slug)->where('student_id', '!=', $profile->id)->exists()) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        // Create or update business record
        $business = AIpreneurBusiness::updateOrCreate(
            ['student_id' => $profile->id],
            [
                'shop_theme' => $request->shop_theme,
                'shop_url_slug' => $slug,
                'questionnaire_answers' => [
                    'passion_category' => $request->passion_category,
                    'shop_theme' => $request->shop_theme,
                    'color_palette' => $request->color_palette,
                    'unique_selling_point' => $request->unique_selling_point,
                    'shop_name' => $request->shop_name,
                ],
                'selfie_used_url' => $profile->selfie_url,
                'signboard_used_url' => $profile->signboard_url,
                'shop_image_status' => 'pending',
            ]
        );

        return response()->json([
            'success' => true,
            'stage' => 'questionnaire_completed',
            'business' => $business,
        ]);
    }

    /**
     * Trigger shop image generation.
     * Can also be used to regenerate if previous attempt failed.
     */
    public function generateShop(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;
        $business = $profile->business;

        if (!$business) {
            return response()->json([
                'success' => false,
                'message' => 'Please complete the questionnaire first',
            ], 400);
        }

        // Allow regeneration if failed or if explicitly requested
        $currentStatus = $business->shop_image_status;
        if ($currentStatus === 'completed' && !$request->has('force')) {
            return response()->json([
                'success' => true,
                'message' => 'Shop images already generated',
                'status' => 'completed',
                'shop_image_url' => $business->shop_image_url,
                'shop_scene_image_url' => $business->shop_scene_image_url,
            ]);
        }

        // Clear any previous error and reset status
        $business->update([
            'shop_image_status' => 'generating',
            'shop_image_error' => null,
        ]);
        $profile->update(['onboarding_stage' => 'shop_generating']);

        // Dispatch the job
        GenerateShopImageJob::dispatch($profile->id);

        return response()->json([
            'success' => true,
            'message' => 'Shop image generation started',
            'status' => 'generating',
        ]);
    }

    /**
     * Check shop image generation status.
     */
    public function shopStatus(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;
        $business = $profile->business;

        if (!$business) {
            return response()->json([
                'success' => true,
                'status' => 'pending',
                'shop_image_url' => null,
                'shop_scene_image_url' => null,
            ]);
        }

        return response()->json([
            'success' => true,
            'status' => $business->shop_image_status,
            'shop_image_url' => $business->shop_image_url,
            'shop_scene_image_url' => $business->shop_scene_image_url,
            'error' => $business->shop_image_error,
        ]);
    }

    /**
     * Regenerate shop images (for failed or manual retry).
     */
    public function regenerateShop(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;
        $business = $profile->business;

        if (!$business) {
            return response()->json([
                'success' => false,
                'message' => 'No business found. Please complete onboarding first.',
            ], 400);
        }

        $shopRegenCost = $this->pricingService->getTokenCost(
            'shop_exterior',
            AIpreneurPricingService::DEFAULT_TOKEN_COSTS['shop_exterior']
        );
        if ($shopRegenCost > 0) {
            $rewards = $this->getOrCreateNormalizedRewards($profile);
            $currentBalance = (int) ($rewards->ai_tokens ?? 0);
            if ($currentBalance < $shopRegenCost || !$rewards->spendAITokens($shopRegenCost)) {
                return response()->json([
                    'success' => false,
                    'message' => "Not enough AI tokens. Need {$shopRegenCost}, have {$currentBalance}.",
                    'required_ai_tokens' => $shopRegenCost,
                ], 400);
            }
        }

        // Clear previous images and error
        $business->update([
            'shop_image_status' => 'generating',
            'shop_image_error' => null,
            'shop_image_url' => null,
            'shop_scene_image_url' => null,
        ]);

        // Dispatch the job
        GenerateShopImageJob::dispatch($profile->id);

        return response()->json([
            'success' => true,
            'message' => 'Shop image regeneration started',
            'status' => 'generating',
            'tokens_charged' => $shopRegenCost,
        ]);
    }

    /**
     * Complete onboarding and award starting resources.
     */
    public function complete(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;

        // Mark onboarding as completed
        $profile->update([
            'aipreneur_onboarding_completed' => true,
            'onboarding_stage' => 'completed',
        ]);

        // Check if tokens record exists first, create only if not
        $tokens = AIpreneurToken::where('student_id', $profile->id)->first();
        if (!$tokens) {
            $tokens = AIpreneurToken::create([
                'student_id' => $profile->id,
                'tokens' => self::STARTING_TOKENS,
                'tokens_used' => 0,
                'tokens_earned' => 0,
            ]);
        }

        // Check if rewards record exists first, create only if not
        $rewards = AIpreneurReward::where('student_id', $profile->id)->first();
        if (!$rewards) {
            $rewards = AIpreneurReward::create([
                'student_id' => $profile->id,
                'coins' => self::STARTING_COINS,
                'ai_tokens' => self::STARTING_TOKENS,
                'stars' => 0,
                'xp' => 0,
                'level' => 1,
                'badges' => [],
                'current_streak' => 0,
                'longest_streak' => 0,
            ]);
        } else {
            // One-time normalization: move legacy reward coins into AI token balance.
            $legacyCoins = (int) ($rewards->coins ?? 0);
            if ($legacyCoins > 0) {
                $rewards->ai_tokens = (int) ($rewards->ai_tokens ?? 0) + $legacyCoins;
                $rewards->coins = 0;
                $rewards->save();
            }
        }

        // Only log the starting bonus transaction if this is the first time
        // (check if starting_bonus transaction already exists)
        $existingBonus = AIpreneurTransaction::where('student_id', $profile->id)
            ->where('category', 'starting_bonus')
            ->exists();

        if (
            !$existingBonus
            && (self::STARTING_COINS > 0 || self::STARTING_TOKENS > 0)
        ) {
            AIpreneurTransaction::create([
                'student_id' => $profile->id,
                'type' => 'income',
                'category' => 'starting_bonus',
                'description' => 'Welcome bonus for starting your business!',
                'amount' => self::STARTING_COINS,
                'tokens' => self::STARTING_TOKENS,
                'coin_balance_after' => $rewards->coins,
                'token_balance_after' => $tokens->tokens,
                'metadata' => [
                    'event' => 'onboarding_complete',
                    'shop_name' => $profile->aipreneur_shop_name,
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Onboarding completed! Welcome to AIpreneur!',
            'profile' => $profile->fresh()->load(['business', 'rewards', 'aiTokens']),
            'starting_bonus' => [
                'coins' => self::STARTING_COINS,
                'ai_tokens' => self::STARTING_TOKENS,
                'tokens' => self::STARTING_TOKENS,
            ],
        ]);
    }

    /**
     * Get finance data for the student.
     */
    public function getFinance(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;
        $rewards = $profile->rewards;
        $tokens = $profile->aiTokens;
        $business = $profile->business;

        // Normalize legacy reward coins into AI tokens.
        if ($rewards && (int) ($rewards->coins ?? 0) > 0) {
            $rewards->ai_tokens = (int) ($rewards->ai_tokens ?? 0) + (int) $rewards->coins;
            $rewards->coins = 0;
            $rewards->save();
            $rewards->refresh();
        }

        // Get recent transactions
        $transactions = $profile->transactions()
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        // Calculate totals
        $totalIncome = $profile->transactions()->income()->sum('amount');
        $totalExpenses = $profile->transactions()->expenses()->sum('amount');

        // Group expenses by category
        $expensesByCategory = $profile->transactions()
            ->expenses()
            ->selectRaw('category, SUM(amount) as total')
            ->groupBy('category')
            ->pluck('total', 'category');

        // Group income by category
        $incomeByCategory = $profile->transactions()
            ->income()
            ->selectRaw('category, SUM(amount) as total')
            ->groupBy('category')
            ->pluck('total', 'category');

        $totalProfit = (float) ($business->total_profit ?? 0);
        $totalCosts = (float) ($business->total_costs ?? 0);
        $availableProfitCoins = max(0, $totalProfit - $totalCosts);

        return response()->json([
            'success' => true,
            'balances' => [
                'coins' => $availableProfitCoins,
                'tokens' => $rewards?->ai_tokens ?? 0,
                'ai_tokens' => $rewards?->ai_tokens ?? 0,
                'tokens_used' => $tokens?->tokens_used ?? 0,
            ],
            'summary' => [
                'total_income' => $totalIncome,
                'total_expenses' => $totalExpenses,
                'net_profit' => $totalIncome - $totalExpenses,
            ],
            'breakdown' => [
                'income' => $incomeByCategory,
                'expenses' => $expensesByCategory,
            ],
            'transactions' => $transactions,
        ]);
    }

    /**
     * Get transaction history.
     */
    public function getTransactions(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;

        $query = $profile->transactions()->orderBy('created_at', 'desc');

        // Filter by type if provided
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        // Filter by category if provided
        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        // Pagination
        $perPage = $request->get('per_page', 20);
        $transactions = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'transactions' => $transactions,
        ]);
    }

    /**
     * Ensure rewards exists and legacy coin balance is normalized into AI tokens.
     */
    private function getOrCreateNormalizedRewards(GeniusProfile $profile): AIpreneurReward
    {
        $rewards = $profile->rewards;

        if (!$rewards) {
            $rewards = AIpreneurReward::create([
                'student_id' => $profile->id,
                'coins' => 0,
                'ai_tokens' => 0,
                'stars' => 0,
                'xp' => 0,
                'level' => 1,
                'badges' => [],
                'current_streak' => 0,
                'longest_streak' => 0,
            ]);
        }

        $legacyCoins = (int) ($rewards->coins ?? 0);
        if ($legacyCoins > 0) {
            $rewards->ai_tokens = (int) ($rewards->ai_tokens ?? 0) + $legacyCoins;
            $rewards->coins = 0;
            $rewards->save();
        }

        if ((int) $rewards->coins !== 0) {
            $rewards->coins = 0;
            $rewards->save();
        }

        return $rewards->fresh();
    }
}
