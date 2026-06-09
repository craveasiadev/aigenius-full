<?php

namespace App\Http\Controllers;

use App\Models\WPayUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class GachaController extends Controller
{
    protected function resolveAppSource(Request $request): string
    {
        $fallback = strtolower((string) config('wpay.default_app_source', 'wonderstar'));
        $raw = $request->input('app_source') ?? $request->query('app_source') ?? $request->header('X-App-Source');
        $normalized = strtolower(trim((string) ($raw ?? '')));

        if ($normalized === '') {
            return $fallback;
        }

        $normalized = preg_replace('/[^a-z0-9._-]/', '', $normalized) ?: '';

        return $normalized !== '' ? $normalized : $fallback;
    }

    /**
     * POST /api/gacha/spin
     * 
     * Process a gacha spin - deduct stars or free spin, determine prize, award bonus
     * All operations are atomic using Laravel's wpay_users table as the source of truth.
     */
    public function spin(Request $request)
    {
        try {
            Log::info('[Gacha] Spin request received', $request->all());

            $validated = $request->validate([
                'email' => 'required|email',
                'spin_type' => 'required|in:stars,free',
                'app_source' => 'nullable|string|max:64',
            ]);

            $email = strtolower(trim($validated['email']));
            $spinType = $validated['spin_type'];
            $appSource = $this->resolveAppSource($request);

            // Get user from wpay_users - THE SOURCE OF TRUTH
            // Auto-create WPay user if doesn't exist (for existing Supabase users)
            $user = WPayUser::where('email', $email)
                ->where('app_source', $appSource)
                ->first();

            if (!$user) {
                Log::info('[Gacha] WPay user not found, auto-creating', ['email' => $email]);

                $user = WPayUser::create([
                    'email' => $email,
                    'app_source' => $appSource,
                    'wbalance' => 0,
                    'bonus' => 0,
                    'stars' => 0,
                    'lifetime_topups' => 0,
                    'tier_type' => 'bronze',
                ]);

                Log::info('[Gacha] WPay user auto-created', ['email' => $email]);
            }

            // Step 1: Validate spin eligibility
            if ($spinType === 'free') {
                // Check free spins (we need to add this field to wpay_users or track elsewhere)
                // For now, use Supabase gacha_freespin value via API, or handle in frontend
                // Actually, let's check if user has free spins stored anywhere
                // We'll need to check Supabase users table for gacha_freespin
                $freeSpins = $this->getUserFreeSpins($user->email);
                if ($freeSpins <= 0) {
                    return response()->json([
                        'success' => false,
                        'error' => 'No free spins available'
                    ], 400);
                }
            } else {
                // Check stars balance from wpay_users
                if ($user->stars < 50) {
                    return response()->json([
                        'success' => false,
                        'error' => 'Insufficient stars. Need 50 stars to spin.',
                        'current_stars' => (int)$user->stars
                    ], 400);
                }
            }

            // Step 2: Get available prize from Supabase egg_prize_lines
            $prize = $this->getAvailablePrize();
            if (!$prize) {
                return response()->json([
                    'success' => false,
                    'error' => 'No prizes available'
                ], 400);
            }

            $rewardAmount = (float)$prize['reward_amount'];
            $rewardLabel = $prize['reward_label'];

            // Step 3: Use database transaction for atomic operations
            return DB::transaction(function () use ($user, $spinType, $prize, $rewardAmount, $rewardLabel) {

                // Deduct stars or free spin
                if ($spinType === 'stars') {
                    // Deduct 50 stars from wpay_users
                    $user->stars = max(0, $user->stars - 50);
                    $user->save();

                    Log::info('[Gacha] Deducted 50 stars', [
                        'email' => $user->email,
                        'new_stars' => $user->stars
                    ]);
                } else {
                    // Decrement free spin in Supabase users table
                    $this->decrementFreeSpins($user->email);
                }

                // Step 4: Award bonus to wpay_users
                if ($rewardAmount > 0) {
                    $user->bonus = (float)$user->bonus + $rewardAmount;
                    $user->save();

                    Log::info('[Gacha] Awarded bonus', [
                        'email' => $user->email,
                        'amount' => $rewardAmount,
                        'new_bonus' => $user->bonus
                    ]);
                }

                // Step 5: Claim the prize in Supabase
                $this->claimPrize($prize['id'], $user->email);

                // Step 6: Record spin in Supabase (for tracking)
                $this->recordSpinInSupabase($user->email, $spinType, $rewardAmount, $rewardLabel);

                // Return success with updated balances
                $user->refresh();

                return response()->json([
                    'success' => true,
                    'status' => 'ok',
                    'app_source' => $appSource,
                    'reward_amount' => $rewardAmount,
                    'reward_label' => $rewardLabel,
                    'line_number' => $prize['line_number'],
                    'claimed_at' => now()->toIso8601String(),
                    'balances' => [
                        'wBalance' => round((float)$user->wbalance, 2),
                        'bonusBalance' => round((float)$user->bonus, 2),
                        'starsBalance' => (int)$user->stars,
                        'tier' => $user->tier_type,
                        'tierFactor' => (float)$user->tier_factor,
                    ]
                ]);
            });
        } catch (\Exception $e) {
            Log::error('[Gacha] Spin error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to process spin: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/gacha/balance/{email}
     * 
     * Get user's balances from wpay_users (source of truth)
     */
    public function getBalance(Request $request, string $email)
    {
        try {
            $email = strtolower(trim($email));
            $appSource = $this->resolveAppSource($request);
            $user = WPayUser::where('email', $email)
                ->where('app_source', $appSource)
                ->first();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'error' => 'User not found'
                ], 404);
            }

            // Get free spins from Supabase
            $freeSpins = $this->getUserFreeSpins($email);
            $totalSpins = $this->getUserTotalSpins($email);

            return response()->json([
                'success' => true,
                'app_source' => $appSource,
                'balances' => [
                    'wBalance' => round((float)$user->wbalance, 2),
                    'bonusBalance' => round((float)$user->bonus, 2),
                    'starsBalance' => (int)$user->stars,
                    'freeSpins' => $freeSpins,
                    'totalSpins' => $totalSpins,
                ],
                'tier' => [
                    'name' => ucfirst($user->tier_type),
                    'type' => $user->tier_type,
                    'factor' => (float)$user->tier_factor,
                    'lifetime_topups' => round((float)$user->lifetime_topups, 2),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('[Gacha] Get balance error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to get balance'
            ], 500);
        }
    }

    /**
     * Get user's free spins from Supabase
     */
    private function getUserFreeSpins(string $email): int
    {
        try {
            $supabaseUrl = env('SUPABASE_URL');
            $supabaseKey = env('SUPABASE_SERVICE_KEY');

            if (!$supabaseUrl || !$supabaseKey) {
                return 0;
            }

            $response = Http::withHeaders([
                'apikey' => $supabaseKey,
                'Authorization' => 'Bearer ' . $supabaseKey,
            ])->get("{$supabaseUrl}/rest/v1/users?email=eq.{$email}&select=gacha_freespin");

            if ($response->successful() && !empty($response->json())) {
                return (int)($response->json()[0]['gacha_freespin'] ?? 0);
            }
            return 0;
        } catch (\Exception $e) {
            Log::warning('[Gacha] Failed to get free spins', ['error' => $e->getMessage()]);
            return 0;
        }
    }

    /**
     * Get user's total spins from Supabase
     */
    private function getUserTotalSpins(string $email): int
    {
        try {
            $supabaseUrl = env('SUPABASE_URL');
            $supabaseKey = env('SUPABASE_SERVICE_KEY');

            if (!$supabaseUrl || !$supabaseKey) {
                return 0;
            }

            $response = Http::withHeaders([
                'apikey' => $supabaseKey,
                'Authorization' => 'Bearer ' . $supabaseKey,
            ])->get("{$supabaseUrl}/rest/v1/users?email=eq.{$email}&select=gacha_total_spins");

            if ($response->successful() && !empty($response->json())) {
                return (int)($response->json()[0]['gacha_total_spins'] ?? 0);
            }
            return 0;
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Decrement free spins in Supabase
     */
    private function decrementFreeSpins(string $email): void
    {
        try {
            $supabaseUrl = env('SUPABASE_URL');
            $supabaseKey = env('SUPABASE_SERVICE_KEY');

            if (!$supabaseUrl || !$supabaseKey) {
                return;
            }

            $currentFreeSpins = $this->getUserFreeSpins($email);

            Http::withHeaders([
                'apikey' => $supabaseKey,
                'Authorization' => 'Bearer ' . $supabaseKey,
                'Content-Type' => 'application/json',
            ])->patch("{$supabaseUrl}/rest/v1/users?email=eq.{$email}", [
                'gacha_freespin' => max(0, $currentFreeSpins - 1),
                'updated_at' => now()->toIso8601String()
            ]);
        } catch (\Exception $e) {
            Log::warning('[Gacha] Failed to decrement free spins', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Get available prize from Supabase
     */
    private function getAvailablePrize(): ?array
    {
        try {
            $supabaseUrl = env('SUPABASE_URL');
            $supabaseKey = env('SUPABASE_SERVICE_KEY');

            if (!$supabaseUrl || !$supabaseKey) {
                throw new \Exception('Supabase not configured');
            }

            $response = Http::withHeaders([
                'apikey' => $supabaseKey,
                'Authorization' => 'Bearer ' . $supabaseKey,
            ])->get("{$supabaseUrl}/rest/v1/egg_prize_lines?is_claimed=eq.false&is_revoked=eq.false&order=line_number.asc&limit=1");

            if ($response->successful() && !empty($response->json())) {
                return $response->json()[0];
            }
            return null;
        } catch (\Exception $e) {
            Log::error('[Gacha] Failed to get prize', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Claim prize in Supabase
     */
    private function claimPrize(string $prizeId, string $username): void
    {
        try {
            $supabaseUrl = env('SUPABASE_URL');
            $supabaseKey = env('SUPABASE_SERVICE_KEY');

            if (!$supabaseUrl || !$supabaseKey) {
                return;
            }

            Http::withHeaders([
                'apikey' => $supabaseKey,
                'Authorization' => 'Bearer ' . $supabaseKey,
                'Content-Type' => 'application/json',
            ])->patch("{$supabaseUrl}/rest/v1/egg_prize_lines?id=eq.{$prizeId}", [
                'is_claimed' => true,
                'claimed_by_username' => $username,
                'claimed_at' => now()->toIso8601String(),
                'updated_at' => now()->toIso8601String()
            ]);

            Log::info('[Gacha] Prize claimed', ['prize_id' => $prizeId, 'user' => $username]);
        } catch (\Exception $e) {
            Log::error('[Gacha] Failed to claim prize', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Record spin in Supabase for tracking
     */
    private function recordSpinInSupabase(string $email, string $spinType, float $rewardAmount, string $rewardLabel): void
    {
        try {
            $supabaseUrl = env('SUPABASE_URL');
            $supabaseKey = env('SUPABASE_SERVICE_KEY');

            if (!$supabaseUrl || !$supabaseKey) {
                return;
            }

            // Increment total spins
            $currentTotal = $this->getUserTotalSpins($email);

            Http::withHeaders([
                'apikey' => $supabaseKey,
                'Authorization' => 'Bearer ' . $supabaseKey,
                'Content-Type' => 'application/json',
            ])->patch("{$supabaseUrl}/rest/v1/users?email=eq.{$email}", [
                'gacha_total_spins' => $currentTotal + 1,
                'updated_at' => now()->toIso8601String()
            ]);

            Log::info('[Gacha] Recorded spin', [
                'email' => $email,
                'spin_type' => $spinType,
                'reward' => $rewardAmount,
                'total_spins' => $currentTotal + 1
            ]);
        } catch (\Exception $e) {
            Log::warning('[Gacha] Failed to record spin', ['error' => $e->getMessage()]);
        }
    }
}
